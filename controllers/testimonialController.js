const Testimonial = require("../models/Testimonial");

const fs = require("fs");
const path = require("path");


// =========================================================
// GET APPROVED TESTIMONIALS - PUBLIC WEBSITE
// =========================================================

const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({
      isActive: true,
      status: "approved",
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      testimonials,
    });
  } catch (error) {
    console.error(
      "Get testimonials error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials.",
    });
  }
};


// =========================================================
// GET ALL TESTIMONIALS - ADMIN
// =========================================================

const getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find()
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      testimonials,
    });
  } catch (error) {
    console.error(
      "Get all testimonials error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials.",
    });
  }
};


// =========================================================
// ADMIN CREATE TESTIMONIAL
// Existing admin flow
// Admin-created testimonial = APPROVED
// =========================================================

const createTestimonial = async (req, res) => {
  try {
    const {
      name,
      email,
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

        email:
          email?.trim().toLowerCase() || "",

        role:
          role?.trim() ||
          "Pet Parent",

        rating:
          Number(rating) || 5,

        text: text.trim(),

        photo: req.file
          ? `/uploads/testimonials/${req.file.filename}`
          : "",

        source: "admin",

        /*
         * Admin doesn't need approval.
         */
        status: "approved",

        approvedAt: new Date(),

        rejectedAt: null,

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


// =========================================================
// PUBLIC USER SUBMISSION
// NO LOGIN REQUIRED
// =========================================================

const submitTestimonial = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      rating,
      text,
    } = req.body;

    // ------------------------------------------
    // Validation
    // ------------------------------------------

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Testimonial text is required.",
      });
    }

    // ------------------------------------------
    // Basic email validation
    // ------------------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    // ------------------------------------------
    // Rating validation
    // ------------------------------------------

    const parsedRating =
      Number(rating) || 5;

    if (
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be between 1 and 5.",
      });
    }

    // ------------------------------------------
    // Create pending testimonial
    // ------------------------------------------

    const testimonial =
      await Testimonial.create({
        name: name.trim(),

        email:
          email.trim().toLowerCase(),

        role:
          role?.trim() ||
          "Pet Parent",

        rating: parsedRating,

        text: text.trim(),

        photo: req.file
          ? `/uploads/testimonials/${req.file.filename}`
          : "",

        source: "user",

        /*
         * IMPORTANT:
         * User submissions always wait
         * for admin approval.
         */
        status: "pending",

        approvedAt: null,

        rejectedAt: null,

        /*
         * Pending testimonial should not
         * appear on public website.
         */
        isActive: false,
      });

    return res.status(201).json({
      success: true,
      message:
        "Thank you for your review! Your testimonial has been submitted for approval.",
      testimonial: {
        _id: testimonial._id,
        status: testimonial.status,
      },
    });
  } catch (error) {
    console.error(
      "Submit testimonial error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to submit testimonial.",
    });
  }
};


// =========================================================
// UPDATE TESTIMONIAL - ADMIN
// =========================================================

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

    // ------------------------------------------
    // Store old image before modification
    // ------------------------------------------

    const oldPhoto =
      testimonial.photo;

    let newPhoto = null;

    // ------------------------------------------
    // Update fields
    // ------------------------------------------

    if (req.body.name !== undefined) {
      const name =
        req.body.name.trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      testimonial.name = name;
    }

    if (req.body.email !== undefined) {
      testimonial.email =
        req.body.email
          .trim()
          .toLowerCase();
    }

    if (req.body.role !== undefined) {
      testimonial.role =
        req.body.role.trim();
    }

    if (req.body.rating !== undefined) {
      const rating =
        Number(req.body.rating);

      if (
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rating must be between 1 and 5.",
        });
      }

      testimonial.rating = rating;
    }

    if (req.body.text !== undefined) {
      const text =
        req.body.text.trim();

      if (!text) {
        return res.status(400).json({
          success: false,
          message:
            "Testimonial text cannot be empty.",
        });
      }

      testimonial.text = text;
    }

    if (
      req.body.isActive !== undefined
    ) {
      testimonial.isActive =
        req.body.isActive === "true" ||
        req.body.isActive === true;
    }

    /*
     * Admin can also edit status if needed.
     */
    if (req.body.status !== undefined) {
      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
      ];

      if (
        !allowedStatuses.includes(
          req.body.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid testimonial status.",
        });
      }

      testimonial.status =
        req.body.status;

      if (
        req.body.status === "approved"
      ) {
        testimonial.approvedAt =
          testimonial.approvedAt ||
          new Date();

        testimonial.rejectedAt = null;

        /*
         * Approved testimonial can
         * appear on website if active.
         */
        if (
          req.body.isActive === undefined
        ) {
          testimonial.isActive = true;
        }
      }

      if (
        req.body.status === "rejected"
      ) {
        testimonial.rejectedAt =
          new Date();

        testimonial.approvedAt = null;

        testimonial.isActive = false;
      }

      if (
        req.body.status === "pending"
      ) {
        testimonial.approvedAt = null;
        testimonial.rejectedAt = null;
        testimonial.isActive = false;
      }
    }

    // ------------------------------------------
    // New image uploaded
    // ------------------------------------------

    if (req.file) {
      newPhoto =
        `/uploads/testimonials/${req.file.filename}`;

      testimonial.photo = newPhoto;
    }

    // ------------------------------------------
    // SAVE FIRST
    // ------------------------------------------

    await testimonial.save();

    // ------------------------------------------
    // Delete OLD image ONLY when a new image
    // was actually uploaded and DB save succeeded
    // ------------------------------------------

    if (
      req.file &&
      oldPhoto &&
      oldPhoto !== newPhoto
    ) {
      const oldImagePath =
        path.join(
          __dirname,
          "..",
          oldPhoto
        );

      try {
        if (
          fs.existsSync(oldImagePath)
        ) {
          fs.unlinkSync(
            oldImagePath
          );
        }
      } catch (imageError) {
        console.error(
          "Failed to delete old testimonial image:",
          imageError
        );
      }
    }

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

    /*
     * If a new image was uploaded but
     * database update failed, remove the
     * newly uploaded image.
     */
    if (req.file) {
      const newImagePath =
        path.join(
          __dirname,
          "..",
          "uploads",
          "testimonials",
          req.file.filename
        );

      try {
        if (
          fs.existsSync(newImagePath)
        ) {
          fs.unlinkSync(
            newImagePath
          );
        }
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup new testimonial image:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update testimonial.",
    });
  }
};


// =========================================================
// APPROVE TESTIMONIAL - ADMIN
// =========================================================

const approveTestimonial = async (
  req,
  res
) => {
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

    testimonial.status =
      "approved";

    testimonial.isActive = true;

    testimonial.approvedAt =
      new Date();

    testimonial.rejectedAt = null;

    await testimonial.save();

    return res.status(200).json({
      success: true,
      message:
        "Testimonial approved successfully.",
      testimonial,
    });
  } catch (error) {
    console.error(
      "Approve testimonial error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve testimonial.",
    });
  }
};


// =========================================================
// REJECT TESTIMONIAL - ADMIN
// =========================================================

const rejectTestimonial = async (
  req,
  res
) => {
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

    testimonial.status =
      "rejected";

    testimonial.isActive = false;

    testimonial.rejectedAt =
      new Date();

    testimonial.approvedAt = null;

    await testimonial.save();

    return res.status(200).json({
      success: true,
      message:
        "Testimonial rejected successfully.",
      testimonial,
    });
  } catch (error) {
    console.error(
      "Reject testimonial error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reject testimonial.",
    });
  }
};


// =========================================================
// DELETE TESTIMONIAL - ADMIN
// =========================================================

const deleteTestimonial = async (
  req,
  res
) => {
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

    // ------------------------------------------
    // Delete image from local storage
    // ------------------------------------------

    if (testimonial.photo) {
      const imagePath =
        path.join(
          __dirname,
          "..",
          testimonial.photo
        );

      try {
        if (
          fs.existsSync(imagePath)
        ) {
          fs.unlinkSync(
            imagePath
          );
        }
      } catch (imageError) {
        console.error(
          "Failed to delete testimonial image:",
          imageError
        );
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
  submitTestimonial,
  updateTestimonial,
  approveTestimonial,
  rejectTestimonial,
  deleteTestimonial,
};