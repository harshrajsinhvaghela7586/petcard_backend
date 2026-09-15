const Testimonial = require("../models/Testimonial");

// GET all active testimonials - frontend
const getTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find({
            isActive: true,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            testimonials,
        });
    } catch (error) {
        console.error("Get testimonials error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch testimonials.",
        });
    }
};

// GET all testimonials - admin
const getAllTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            testimonials,
        });
    } catch (error) {
        console.error("Get all testimonials error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch testimonials.",
        });
    }
};
const createTestimonial = async (req, res) => {
    try {
        const {
            name,
            role,
            rating,
            text,
            isActive,
        } = req.body;

        if (!name || !text) {
            return res.status(400).json({
                success: false,
                message:
                    "Name and testimonial text are required.",
            });
        }

        const testimonial =
            await Testimonial.create({
                name: name.trim(),
                role:
                    role?.trim() ||
                    "Pet Parent",
                rating: Number(rating) || 5,
                text: text.trim(),

                photo: req.file
                    ? `/uploads/testimonials/${req.file.filename}`
                    : "",

                isActive:
                    isActive === "true" ||
                    isActive === true,
            });

        return res.status(201).json({
            success: true,
            message:
                "Testimonial created successfully.",
            testimonial,
        });
    } catch (error) {
        console.error(
            "Create testimonial error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to create testimonial.",
        });
    }
};

const fs = require("fs");
const path = require("path");

const updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;

        const testimonial =
            await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message:
                    "Testimonial not found.",
            });
        }

        if (req.body.name !== undefined) {
            testimonial.name =
                req.body.name.trim();
        }

        if (req.body.role !== undefined) {
            testimonial.role =
                req.body.role.trim();
        }

        if (req.body.rating !== undefined) {
            testimonial.rating =
                Number(req.body.rating);
        }

        if (req.body.text !== undefined) {
            testimonial.text =
                req.body.text.trim();
        }

        if (req.body.isActive !== undefined) {
            testimonial.isActive =
                req.body.isActive === "true" ||
                req.body.isActive === true;
        }

        if (req.file) {
            // Delete old local image
            if (testimonial.photo) {
                const oldImagePath =
                    path.join(
                        __dirname,
                        "..",
                        testimonial.photo
                    );

                if (
                    fs.existsSync(oldImagePath)
                ) {
                    fs.unlinkSync(
                        oldImagePath
                    );
                }
            }

            testimonial.photo =
                `/uploads/testimonials/${req.file.filename}`;
        }

        await testimonial.save();

        return res.status(200).json({
            success: true,
            message:
                "Testimonial updated successfully.",
            testimonial,
        });
    } catch (error) {
        console.error(
            "Update testimonial error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update testimonial.",
        });
    }
};

const deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;

        const testimonial =
            await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message:
                    "Testimonial not found.",
            });
        }

        // Delete local image
        if (testimonial.photo) {
            const imagePath = path.join(
                __dirname,
                "..",
                testimonial.photo
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await testimonial.deleteOne();

        return res.status(200).json({
            success: true,
            message:
                "Testimonial deleted successfully.",
        });
    } catch (error) {
        console.error(
            "Delete testimonial error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to delete testimonial.",
        });
    }
};

module.exports = {
    getTestimonials,
    getAllTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
};