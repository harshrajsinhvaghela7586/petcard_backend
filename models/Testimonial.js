const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
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