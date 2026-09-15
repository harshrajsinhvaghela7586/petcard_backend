const express = require("express");

const {
  createContact,
  getContacts,
  getContactById,
  markAsRead,
  deleteContact,
  replyToContact,
} = require("../controllers/contactController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// PUBLIC
// =====================================================

router.post("/", createContact);


// =====================================================
// ADMIN
// =====================================================

router.get(
  "/",
  requireAuth,
  getContacts
);

router.get(
  "/:id",
  requireAuth,
  getContactById
);

router.patch(
  "/:id/read",
  requireAuth,
  markAsRead
);

router.post(
  "/:id/reply",
  requireAuth,
  replyToContact
);

router.delete(
  "/:id",
  requireAuth,
  deleteContact
);


module.exports = router;