const express = require("express");

const {
  getPublicBlogs,
  getBlogBySlug,

  submitBlog,

  getAdminBlogs,
  createBlog,
  updateBlog,

  approveBlog,
  rejectBlog,

  toggleBlogStatus,
  deleteBlog,
} = require("../controllers/blogController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const upload = require("../middleware/blogUpload");

const router = express.Router();

/* =========================================================
   PUBLIC
   ========================================================= */

/*
 * Get approved + active blogs
 */
router.get(
  "/",
  getPublicBlogs
);

/*
 * Get single approved + active blog
 */
router.get(
  "/slug/:slug",
  getBlogBySlug
);

/*
 * User can submit blog without login.
 *
 * multipart/form-data:
 * title
 * category
 * excerpt
 * content
 * author
 * email
 * readTime
 * image
 */
router.post(
  "/submit",
  upload.single("image"),
  submitBlog
);

/* =========================================================
   ADMIN
   ========================================================= */

/*
 * Get all blogs including:
 * pending
 * approved
 * rejected
 */
router.get(
  "/admin",
  requireAuth,
  getAdminBlogs
);

/*
 * Existing admin create flow.
 *
 * Admin-created blogs are automatically approved.
 */
router.post(
  "/",
  requireAuth,
  upload.single("image"),
  createBlog
);

/*
 * Admin edit any blog.
 */
router.put(
  "/:id",
  requireAuth,
  upload.single("image"),
  updateBlog
);

/*
 * Approve pending blog.
 */
router.patch(
  "/:id/approve",
  requireAuth,
  approveBlog
);

/*
 * Reject pending blog.
 */
router.patch(
  "/:id/reject",
  requireAuth,
  rejectBlog
);

/*
 * Existing active/inactive toggle.
 */
router.patch(
  "/:id/status",
  requireAuth,
  toggleBlogStatus
);

/*
 * Existing delete flow.
 */
router.delete(
  "/:id",
  requireAuth,
  deleteBlog
);

module.exports = router;