const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AdminSignup = require("../models/AdminSignup");
const { signToken } = require("../utils/jwt");
const { sendAdminOtp } = require("../utils/email");

const crypto = require("crypto");

const PasswordReset = require("../models/PasswordReset");


const setAuthCookie = (res, token) => {
  res.cookie("petcard_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie("petcard_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};

const OTP_VALID_MS = 2 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const BCRYPT_ROUNDS = 12;

const PASSWORD_RESET_OTP_VALID_MS = 2 * 60 * 1000;
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_TOKEN_VALID_MS = 10 * 60 * 1000;
const PASSWORD_RESET_COOKIE = "petcard_password_reset";


const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};


const setPasswordResetCookie = (res, token) => {
  res.cookie(PASSWORD_RESET_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PASSWORD_RESET_TOKEN_VALID_MS,
    path: "/api/auth",
  });
};

const clearPasswordResetCookie = (res) => {
  res.clearCookie(PASSWORD_RESET_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  });
};


const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const hasAdmin = async () => {
  return Boolean(await User.exists({ role: "admin" }));
};

const signupStatus = async (req, res) => {
  try {
    const adminExists = await hasAdmin();

    return res.status(200).json({
      success: true,
      canSignup: !adminExists,
      adminExists,
    });
  } catch (error) {
    console.error("signupStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to check signup status",
    });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (await hasAdmin()) {
      return res.status(403).json({
        success: false,
        code: "ADMIN_EXISTS",
        message: "Admin already exists. Please login.",
      });
    }

    if (!name || !normalizedEmail || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and confirm password are required",
      });
    }

    if (String(name).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const existingPending = await AdminSignup.findOne({ key: "ADMIN_SIGNUP" });
    if (existingPending) {
      return res.status(409).json({
        success: false,
        code: "OTP_PENDING",
        message: "An OTP verification is already pending. Please verify or resend the OTP.",
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = Date.now();

    await AdminSignup.create({
      key: "ADMIN_SIGNUP",
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      otpHash,
      otpExpiresAt: new Date(now + OTP_VALID_MS),
      resendAvailableAt: new Date(now + RESEND_COOLDOWN_MS),
    });

    try {
      await sendAdminOtp({
        to: normalizedEmail,
        name: String(name).trim(),
        otp,
      });
    } catch (emailError) {
      await AdminSignup.deleteOne({ key: "ADMIN_SIGNUP" });
      console.error("OTP email error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Unable to send OTP. Please check email configuration and try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "OTP sent to your email",
      email: normalizedEmail,
      otpExpiresInSeconds: 120,
      resendAvailableInSeconds: 60,
    });
  } catch (error) {
    console.error("signup:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create signup request",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({
        success: false,
        message: "A valid 6-digit OTP and email are required",
      });
    }

    if (await hasAdmin()) {
      await AdminSignup.deleteOne({ key: "ADMIN_SIGNUP" });
      return res.status(403).json({
        success: false,
        code: "ADMIN_EXISTS",
        message: "Admin already exists. Please login.",
      });
    }

    const pending = await AdminSignup.findOne({
      key: "ADMIN_SIGNUP",
      email: normalizedEmail,
    });

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: "No pending signup found. Please signup again.",
      });
    }

    if (pending.otpExpiresAt.getTime() <= Date.now()) {
      await AdminSignup.deleteOne({ _id: pending._id });
      return res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    const validOtp = await bcrypt.compare(String(otp), pending.otpHash);

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.passwordHash,
      role: "admin",
      isVerified: true,
    });

    await AdminSignup.deleteOne({ _id: pending._id });

    const token = signToken(user);

    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Admin verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("verifyOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (await hasAdmin()) {
      await AdminSignup.deleteOne({ key: "ADMIN_SIGNUP" });
      return res.status(403).json({
        success: false,
        code: "ADMIN_EXISTS",
        message: "Admin already exists. Please login.",
      });
    }

    const pending = await AdminSignup.findOne({
      key: "ADMIN_SIGNUP",
      email: normalizedEmail,
    });

    if (!pending) {
      return res.status(404).json({
        success: false,
        message: "No pending signup found for this email",
      });
    }

    const now = Date.now();

    if (pending.resendAvailableAt.getTime() > now) {
      const seconds = Math.ceil(
        (pending.resendAvailableAt.getTime() - now) / 1000
      );

      return res.status(429).json({
        success: false,
        code: "RESEND_COOLDOWN",
        message: `Please wait ${seconds} seconds before requesting another OTP`,
        retryAfterSeconds: seconds,
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

    pending.otpHash = otpHash;
    pending.otpExpiresAt = new Date(now + OTP_VALID_MS);
    pending.resendAvailableAt = new Date(now + RESEND_COOLDOWN_MS);
    await pending.save();

    try {
      await sendAdminOtp({
        to: pending.email,
        name: pending.name,
        otp,
      });
    } catch (emailError) {
      console.error("Resend OTP email error:", emailError);
      return res.status(500).json({
        success: false,
        message: "Unable to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully. The previous OTP is now invalid.",
      email: pending.email,
      otpExpiresInSeconds: 120,
      resendAvailableInSeconds: 60,
    });
  } catch (error) {
    console.error("resendOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "This account is not authorized to login",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signToken(user);

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("login:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
};


const logout = async (req, res) => {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;


/* =========================================================
   GET ADMIN PROFILE
========================================================= */

const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select(
      "-password"
    );

    if (!admin || admin.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: admin,
    });
  } catch (error) {
    console.error(
      "Get Admin Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load admin profile.",
    });
  }
};


/* =========================================================
   UPDATE ADMIN PROFILE
========================================================= */

const updateAdminProfile = async (req, res) => {
  try {
    const { name, password } = req.body;

    const admin = await User.findById(req.user.id);

    if (!admin || admin.role !== "admin") {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    /* ---------------- NAME ---------------- */

    if (typeof name === "string") {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Name is required.",
        });
      }

      admin.name = trimmedName;
    }


    /* ---------------- PASSWORD ---------------- */

    if (password !== undefined && password !== "") {
      if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 8 characters and contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character.",
        });
      }

      const hashedPassword = await bcrypt.hash(
        password,
        12
      );

      admin.password = hashedPassword;
    }


    await admin.save();


    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(
      "Update Admin Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update admin profile.",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      role: "admin",
    });

    /*
     * Do not reveal whether the email exists.
     * This prevents account enumeration.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, an OTP has been sent.",
      });
    }

    const existingReset = await PasswordReset.findOne({
      email: normalizedEmail,
    });

    const now = Date.now();

    if (
      existingReset &&
      existingReset.resendAvailableAt &&
      existingReset.resendAvailableAt.getTime() > now
    ) {
      const seconds = Math.ceil(
        (existingReset.resendAvailableAt.getTime() - now) /
          1000
      );

      return res.status(429).json({
        success: false,
        code: "RESEND_COOLDOWN",
        message: `Please wait ${seconds} seconds before requesting another OTP.`,
        retryAfterSeconds: seconds,
      });
    }

    const otp = generateOtp();

    const otpHash = await bcrypt.hash(
      otp,
      BCRYPT_ROUNDS
    );

    const resetData = {
      email: normalizedEmail,
      otpHash,
      otpExpiresAt: new Date(
        now + PASSWORD_RESET_OTP_VALID_MS
      ),
      verified: false,
      resetToken: null,
      resetTokenExpiresAt: null,
      resendAvailableAt: new Date(
        now + PASSWORD_RESET_RESEND_COOLDOWN_MS
      ),
    };

    if (existingReset) {
      await PasswordReset.findByIdAndUpdate(
        existingReset._id,
        resetData
      );
    } else {
      await PasswordReset.create(resetData);
    }

    /*
     * Clear any old reset authorization.
     */
    clearPasswordResetCookie(res);

    try {
      await sendAdminOtp({
        to: normalizedEmail,
        name: user.name,
        otp,
      });
    } catch (emailError) {
      console.error(
        "Forgot password OTP email error:",
        emailError
      );

      await PasswordReset.deleteOne({
        email: normalizedEmail,
      });

      return res.status(500).json({
        success: false,
        message:
          "Unable to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      email: normalizedEmail,
      otpExpiresInSeconds: 120,
      resendAvailableInSeconds: 60,
    });
  } catch (error) {
    console.error("forgotPassword:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to process forgot password request.",
    });
  }
};


const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedEmail ||
      !/^\d{6}$/.test(String(otp || ""))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid 6-digit OTP and email are required.",
      });
    }

    const resetRequest = await PasswordReset.findOne({
      email: normalizedEmail,
    });

    if (!resetRequest) {
      return res.status(404).json({
        success: false,
        message:
          "No password reset request found. Please request a new OTP.",
      });
    }

    if (
      !resetRequest.otpExpiresAt ||
      resetRequest.otpExpiresAt.getTime() <= Date.now()
    ) {
      await PasswordReset.deleteOne({
        _id: resetRequest._id,
      });

      clearPasswordResetCookie(res);

      return res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    /*
     * Prevent re-verifying an already verified OTP.
     */
    if (resetRequest.verified) {
      return res.status(400).json({
        success: false,
        message:
          "This OTP has already been verified. Please continue with password reset.",
      });
    }

    const validOtp = await bcrypt.compare(
      String(otp),
      resetRequest.otpHash
    );

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    /*
     * Generate a cryptographically secure reset token.
     */
    const resetToken = generateResetToken();

    /*
     * Only store the hash in MongoDB.
     */
    resetRequest.resetToken =
      hashResetToken(resetToken);

    resetRequest.verified = true;

    resetRequest.resetTokenExpiresAt =
      new Date(
        Date.now() +
          PASSWORD_RESET_TOKEN_VALID_MS
      );

    /*
     * OTP should no longer be usable.
     */
    resetRequest.otpHash = undefined;
    resetRequest.otpExpiresAt = new Date(0);

    await resetRequest.save();

    /*
     * Raw token goes ONLY into HttpOnly cookie.
     */
    setPasswordResetCookie(
      res,
      resetToken
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetTokenExpiresInSeconds: 600,
    });
  } catch (error) {
    console.error(
      "verifyForgotPasswordOtp:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP.",
    });
  }
};



const resetPassword = async (req, res) => {
  try {
    const {
      password,
      confirmPassword,
    } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and confirm password are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character.",
      });
    }

    /*
     * Reset token is read only from HttpOnly cookie.
     */
    const resetToken =
      req.cookies[PASSWORD_RESET_COOKIE];

    if (!resetToken) {
      return res.status(401).json({
        success: false,
        message:
          "Password reset session is missing or expired. Please start again.",
      });
    }

    const hashedResetToken =
      hashResetToken(resetToken);

    const resetRequest =
      await PasswordReset.findOne({
        resetToken: hashedResetToken,
        verified: true,
      });

    if (!resetRequest) {
      clearPasswordResetCookie(res);

      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired password reset session. Please start again.",
      });
    }

    if (
      !resetRequest.resetTokenExpiresAt ||
      resetRequest.resetTokenExpiresAt.getTime() <=
        Date.now()
    ) {
      await PasswordReset.deleteOne({
        _id: resetRequest._id,
      });

      clearPasswordResetCookie(res);

      return res.status(401).json({
        success: false,
        message:
          "Password reset session has expired. Please start again.",
      });
    }

    const user = await User.findOne({
      email: resetRequest.email,
      role: "admin",
    }).select("+password");

    if (!user) {
      await PasswordReset.deleteOne({
        _id: resetRequest._id,
      });

      clearPasswordResetCookie(res);

      return res.status(404).json({
        success: false,
        message: "Admin account not found.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );

    user.password = hashedPassword;

    await user.save();

    /*
     * Reset session can never be reused.
     */
    await PasswordReset.deleteOne({
      _id: resetRequest._id,
    });

    clearPasswordResetCookie(res);

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("resetPassword:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password.",
    });
  }
};



const resendForgotPasswordOtp = async (
  req,
  res
) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      role: "admin",
    });

    /*
     * Prevent email enumeration.
     */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a new OTP has been sent.",
      });
    }

    const resetRequest =
      await PasswordReset.findOne({
        email: normalizedEmail,
      });

    if (!resetRequest) {
      return res.status(404).json({
        success: false,
        message:
          "No password reset request found. Please request OTP again.",
      });
    }

    const now = Date.now();

    if (
      resetRequest.resendAvailableAt &&
      resetRequest.resendAvailableAt.getTime() > now
    ) {
      const seconds = Math.ceil(
        (resetRequest.resendAvailableAt.getTime() -
          now) /
          1000
      );

      return res.status(429).json({
        success: false,
        code: "RESEND_COOLDOWN",
        message: `Please wait ${seconds} seconds before requesting another OTP.`,
        retryAfterSeconds: seconds,
      });
    }

    const otp = generateOtp();

    resetRequest.otpHash = await bcrypt.hash(
      otp,
      BCRYPT_ROUNDS
    );

    resetRequest.otpExpiresAt = new Date(
      now + PASSWORD_RESET_OTP_VALID_MS
    );

    resetRequest.resendAvailableAt =
      new Date(
        now +
          PASSWORD_RESET_RESEND_COOLDOWN_MS
      );

    /*
     * New OTP invalidates previous verification.
     */
    resetRequest.verified = false;
    resetRequest.resetToken = null;
    resetRequest.resetTokenExpiresAt = null;

    await resetRequest.save();

    /*
     * Old reset cookie must also be invalidated.
     */
    clearPasswordResetCookie(res);

    try {
      await sendAdminOtp({
        to: normalizedEmail,
        name: user.name,
        otp,
      });
    } catch (emailError) {
      console.error(
        "Resend forgot password OTP email error:",
        emailError
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully.",
      email: normalizedEmail,
      otpExpiresInSeconds: 120,
      resendAvailableInSeconds: 60,
    });
  } catch (error) {
    console.error(
      "resendForgotPasswordOtp:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to resend OTP.",
    });
  }
};


module.exports = {
  signupStatus,
  signup,
  verifyOtp,
  resendOtp,
  login,
  logout,
  me,
  getAdminProfile,
  updateAdminProfile,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  resendForgotPasswordOtp,

};
