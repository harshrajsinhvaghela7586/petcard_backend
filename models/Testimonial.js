const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    role: {
      type: String,
      default: "Pet Parent",
      trim: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    photo: {
      type: String,
      default: "",
    },

    /*
     * admin = testimonial created from admin panel
     * user  = testimonial submitted from public website
     */
    source: {
      type: String,
      enum: ["admin", "user"],
      default: "admin",
    },

    /*
     * Existing testimonials should remain visible.
     * Therefore default is approved.
     */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    /*
     * Admin can keep testimonial hidden even
     * after approval.
     */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Testimonial",
  testimonialSchema
);