const express = require("express");

const {
  getFaqs,
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
} = require("../controllers/FaqController");

const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.get("/", getFaqs);

// Admin
router.get("/admin", requireAuth, getAllFaqs);
router.post("/", requireAuth, createFaq);
router.put("/:id", requireAuth, updateFaq);
router.delete("/:id", requireAuth, deleteFaq);

module.exports = router;