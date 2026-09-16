const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    otpHash: {
      type: String,
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    /*
     * SHA-256 hash of the reset token.
     * Never store the raw reset token.
     */
    resetToken: {
      type: String,
      default: null,
      index: true,
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },

    resendAvailableAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model(
    "PasswordReset",
    passwordResetSchema
  );