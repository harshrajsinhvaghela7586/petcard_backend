const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    /* =========================================================
       BASIC BLOG INFORMATION
       ========================================================= */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Care Tips",
        "Health",
        "Training",
        "Nutrition",
        "Stories",
        "Lifestyle",
      ],
    },

    excerpt: {
      type: String,
      required: true,
      trim: true,
    },

    // Jodit HTML content
    content: {
      type: String,
      required: true,
    },

    /* =========================================================
       AUTHOR
       ========================================================= */

    author: {
      type: String,
      required: true,
      trim: true,
      default: "PetCard Care Team",
    },

    /*
     * User submitted blogs ke liye email store hoga.
     * Admin blogs mein empty reh sakta hai.
     */
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    readTime: {
      type: String,
      required: true,
      trim: true,
      default: "5 min read",
    },

    date: {
      type: Date,
      default: Date.now,
    },

    /* =========================================================
       IMAGE
       ========================================================= */

    image: {
      type: String,
      default: "",
    },

    /* =========================================================
       BLOG STATS
       ========================================================= */

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =========================================================
       BLOG TYPE
       ========================================================= */

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /* =========================================================
       APPROVAL SYSTEM
       ========================================================= */

    source: {
      type: String,
      enum: ["admin", "user"],
      default: "admin",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Blog",
  blogSchema
);