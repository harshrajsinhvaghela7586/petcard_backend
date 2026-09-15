const mongoose = require("mongoose");

const adminSignupSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "ADMIN_SIGNUP",
      unique: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminSignup", adminSignupSchema);
