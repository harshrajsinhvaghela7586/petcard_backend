const express = require("express");

const {
    getDashboardStats,
} = require("../controllers/dashboardController");

const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, getDashboardStats);

module.exports = router;