const express = require("express");

const {
  chatWithPetCard,
} = require("../controllers/chatbotController");

const router = express.Router();

/*
 * Public chatbot
 * No login required
 */
router.post("/", chatWithPetCard);

module.exports = router;