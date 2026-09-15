const mongoose = require("mongoose");

const blogSectionSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      required: true,
      trim: true,
    },

    paragraphs: {
      type: [String],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length > 0 &&
          value.every((item) => item.trim()),
        message: "Each section must contain at least one paragraph.",
      },
    },
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
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

    author: {
      type: String,
      required: true,
      trim: true,
      default: "PetCard Care Team",
    },

    readTime: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    image: {
      type: String,
      default: "",
    },

    intro: {
      type: String,
      required: true,
      trim: true,
    },

    sections: {
      type: [blogSectionSchema],
      default: [],
    },

    takeaways: {
      type: [String],
      default: [],
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Blog", blogSchema);