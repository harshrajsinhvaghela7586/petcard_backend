const express = require("express");

const {
  subscribeNewsletter,
  getNewsletterSubscribers,
  deleteNewsletterSubscriber,
  sendNewsletter,
  exportNewsletterSubscribers,
} = require("../controllers/newsletterController");

const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();


// Public
router.post(
  "/subscribe",
  subscribeNewsletter
);


// Admin
router.get(
  "/admin",
  requireAuth,
  getNewsletterSubscribers
);

router.get(
  "/admin/export",
  requireAuth,
  exportNewsletterSubscribers
);

router.post(
  "/admin/send",
  requireAuth,
  sendNewsletter
);

router.delete(
  "/admin/:id",
  requireAuth,
  deleteNewsletterSubscriber
);


module.exports = router;