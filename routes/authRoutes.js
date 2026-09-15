const express = require("express");
const {
  signupStatus,
  signup,
  verifyOtp,
  resendOtp,
  login,
  logout,
  me,
  getAdminProfile,
  updateAdminProfile
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/signup-status", signupStatus);
router.post("/signup", signup);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

router.get(
    "/admin/profile",
    requireAuth,
    getAdminProfile
);

router.put(
    "/admin/profile",
    requireAuth,
    updateAdminProfile
);

module.exports = router;
