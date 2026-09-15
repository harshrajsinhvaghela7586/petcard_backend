const express = require("express");

const {
  getPublicBlogs,
  getBlogBySlug,
  getAdminBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
} = require("../controllers/blogController");

const { requireAuth } = require("../middleware/authMiddleware");
const upload = require("../middleware/blogUpload");

const router = express.Router();

/* =========================
   PUBLIC
========================= */

router.get("/", getPublicBlogs);

router.get("/slug/:slug", getBlogBySlug);

/* =========================
   ADMIN
========================= */

router.get(
  "/admin",
  requireAuth,
  getAdminBlogs
);

router.post(
  "/",
  requireAuth,
  upload.single("image"),
  createBlog
);

router.put(
  "/:id",
  requireAuth,
  upload.single("image"),
  updateBlog
);

router.patch(
  "/:id/status",
  requireAuth,
  toggleBlogStatus
);

router.delete(
  "/:id",
  requireAuth,
  deleteBlog
);

module.exports = router;