const express = require("express");

const {
  getTestimonials,
  getAllTestimonials,
  createTestimonial,
  submitTestimonial,
  updateTestimonial,
  approveTestimonial,
  rejectTestimonial,
  deleteTestimonial,
} = require("../controllers/testimonialController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const upload =
  require("../middleware/upload");

const router =
  express.Router();


// =========================================================
// PUBLIC
// =========================================================

// Get only approved + active testimonials
router.get(
  "/",
  getTestimonials
);


// User submits testimonial
// NO LOGIN REQUIRED
router.post(
  "/submit",
  upload.single("photo"),
  submitTestimonial
);


// =========================================================
// ADMIN
// =========================================================

// Get all testimonials
router.get(
  "/admin",
  requireAuth,
  getAllTestimonials
);


// Admin add testimonial
// Existing functionality
router.post(
  "/",
  requireAuth,
  upload.single("photo"),
  createTestimonial
);


// Admin update testimonial
router.put(
  "/:id",
  requireAuth,
  upload.single("photo"),
  updateTestimonial
);


// Admin approve
router.patch(
  "/:id/approve",
  requireAuth,
  approveTestimonial
);


// Admin reject
router.patch(
  "/:id/reject",
  requireAuth,
  rejectTestimonial
);


// Admin delete
router.delete(
  "/:id",
  requireAuth,
  deleteTestimonial
);


module.exports = router;