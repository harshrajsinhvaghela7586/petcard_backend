const express = require("express");

const {
    getTestimonials,
    getAllTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
} = require("../controllers/testimonialController");

const { requireAuth } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// ==========================================
// PUBLIC
// ==========================================

router.get("/", getTestimonials);

// ==========================================
// ADMIN
// ==========================================

// Get all testimonials
router.get(
    "/admin",
    requireAuth,
    getAllTestimonials
);

// Add testimonial with photo
router.post(
    "/",
    requireAuth,
    upload.single("photo"),
    createTestimonial
);

// Update testimonial with optional new photo
router.put(
    "/:id",
    requireAuth,
    upload.single("photo"),
    updateTestimonial
);

// Delete testimonial
router.delete(
    "/:id",
    requireAuth,
    deleteTestimonial
);

module.exports = router;