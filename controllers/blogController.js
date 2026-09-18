const fs = require("fs");
const path = require("path");
const Blog = require("../models/Blog");

/* =========================================================
   HELPERS
   ========================================================= */

const removeLocalImage = (imagePath) => {
  if (
    !imagePath ||
    !imagePath.startsWith("/uploads/")
  ) {
    return;
  }

  const filePath = path.join(
    __dirname,
    "..",
    imagePath.replace(/^\/+/, "")
  );

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const cleanupUploadedFile = (file) => {
  if (!file?.path) {
    return;
  }

  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (error) {
    console.error(
      "Uploaded file cleanup error:",
      error
    );
  }
};

const slugify = (text) => {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/* =========================================================
   FEATURED / POPULAR VALIDATION
   ========================================================= */

const validateFlags = async ({
  isFeatured,
  isPopular,
  currentId = null,
}) => {
  if (isFeatured && isPopular) {
    return "A blog cannot be both Featured and Popular.";
  }

  if (isFeatured) {
    const query = {
      isFeatured: true,
      status: "approved",
    };

    if (currentId) {
      query._id = {
        $ne: currentId,
      };
    }

    const count =
      await Blog.countDocuments(query);

    if (count >= 1) {
      return "Only one Featured blog is allowed.";
    }
  }

  if (isPopular) {
    const query = {
      isPopular: true,
      status: "approved",
    };

    if (currentId) {
      query._id = {
        $ne: currentId,
      };
    }

    const count =
      await Blog.countDocuments(query);

    if (count >= 4) {
      return "Only four Popular blogs are allowed.";
    }
  }

  return null;
};

/* =========================================================
   SLUG GENERATOR
   ========================================================= */

const generateUniqueSlug = async (
  title,
  currentId = null
) => {
  const baseSlug = slugify(title);

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = {
      slug,
    };

    if (currentId) {
      query._id = {
        $ne: currentId,
      };
    }

    const exists =
      await Blog.exists(query);

    if (!exists) {
      break;
    }

    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
};

/* =========================================================
   PUBLIC - GET BLOGS
   ONLY APPROVED + ACTIVE
   ========================================================= */

const getPublicBlogs = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      featured = "",
      popular = "",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(
        Number(limit) || 10,
        1
      ),
      50
    );

    const filter = {
      isActive: true,
      status: "approved",
    };

    /* SEARCH */

    if (search.trim()) {
      filter.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          excerpt: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          author: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    /* CATEGORY */

    if (category) {
      filter.category = category;
    }

    /* FEATURED */

    if (featured === "true") {
      filter.isFeatured = true;
    }

    /* POPULAR */

    if (popular === "true") {
      filter.isPopular = true;
    }

    const total =
      await Blog.countDocuments(filter);

    const blogs = await Blog.find(filter)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip(
        (currentPage - 1) *
          perPage
      )
      .limit(perPage)
      .lean();

    return res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(
          total / perPage
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get Public Blogs Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs.",
    });
  }
};

/* =========================================================
   PUBLIC - GET SINGLE BLOG BY SLUG
   ONLY APPROVED + ACTIVE
   ========================================================= */

const getBlogBySlug = async (
  req,
  res
) => {
  try {
    const blog =
      await Blog.findOne({
        slug: req.params.slug,
        isActive: true,
        status: "approved",
      });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    /* INCREMENT VIEWS */

    blog.views += 1;

    await blog.save();

    return res.status(200).json({
      success: true,
      blog,
    });
  } catch (error) {
    console.error(
      "Get Blog By Slug Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog.",
    });
  }
};

/* =========================================================
   PUBLIC - USER SUBMIT BLOG
   NO AUTH REQUIRED
   ========================================================= */

const submitBlog = async (
  req,
  res
) => {
  try {
    const {
      title,
      category,
      excerpt,
      content,
      author,
      email,
      readTime,
    } = req.body;

    /* REQUIRED FIELDS */

    if (!title?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    if (!category?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Category is required.",
      });
    }

    if (!excerpt?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Excerpt is required.",
      });
    }

    if (!content?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Blog content is required.",
      });
    }

    if (!author?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Author name is required.",
      });
    }

    if (!email?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    /* EMAIL VALIDATION */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Please enter a valid email.",
      });
    }

    /* CATEGORY VALIDATION */

    const allowedCategories = [
      "Care Tips",
      "Health",
      "Training",
      "Nutrition",
      "Stories",
      "Lifestyle",
    ];

    if (
      !allowedCategories.includes(
        category.trim()
      )
    ) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Invalid blog category.",
      });
    }

    /* SLUG */

    const slug =
      await generateUniqueSlug(
        title
      );

    /* CREATE PENDING BLOG */

    const blog =
      await Blog.create({
        title: title.trim(),

        slug,

        category: category.trim(),

        excerpt: excerpt.trim(),

        content,

        author: author.trim(),

        email: email.trim().toLowerCase(),

        readTime:
          readTime?.trim() ||
          "5 min read",

        date: new Date(),

        image: req.file
          ? `/uploads/blogs/${req.file.filename}`
          : "",

        views: 0,

        /*
         * User cannot make their own blog
         * Featured / Popular.
         */
        isFeatured: false,

        isPopular: false,

        /*
         * IMPORTANT:
         * User submitted blogs remain hidden
         * until admin approves them.
         */
        isActive: false,

        source: "user",

        status: "pending",

        approvedAt: null,

        rejectedAt: null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Your blog has been submitted successfully and is waiting for approval.",
      blog,
    });
  } catch (error) {
    console.error(
      "Submit Blog Error:",
      error
    );

    cleanupUploadedFile(req.file);

    return res.status(500).json({
      success: false,
      message:
        "Failed to submit blog.",
    });
  }
};

/* =========================================================
   ADMIN - GET BLOGS
   ========================================================= */

const getAdminBlogs = async (
  req,
  res
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category = "",
      type = "all",
      status = "all",
      approval = "all",
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(
        Number(limit) || 10,
        1
      ),
      50
    );

    const filter = {};

    /* SEARCH */

    if (search.trim()) {
      filter.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          excerpt: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          author: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          email: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    /* CATEGORY */

    if (category) {
      filter.category = category;
    }

    /* TYPE */

    if (type === "featured") {
      filter.isFeatured = true;
    }

    if (type === "popular") {
      filter.isPopular = true;
    }

    if (type === "normal") {
      filter.isFeatured = false;
      filter.isPopular = false;
    }

    /* ACTIVE STATUS */

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    /* APPROVAL STATUS */

    if (
      approval === "pending" ||
      approval === "approved" ||
      approval === "rejected"
    ) {
      filter.status = approval;
    }

    const total =
      await Blog.countDocuments(
        filter
      );

    const blogs = await Blog.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(
        (currentPage - 1) *
          perPage
      )
      .limit(perPage)
      .lean();

    /* =====================================================
       ADMIN STATS
       ===================================================== */

    const [
      totalBlogs,
      activeBlogs,
      inactiveBlogs,
      featuredBlogs,
      popularBlogs,
      pendingBlogs,
      approvedBlogs,
      rejectedBlogs,
      userBlogs,
      adminBlogs,
      totalViews,
    ] = await Promise.all([
      Blog.countDocuments(),

      Blog.countDocuments({
        isActive: true,
      }),

      Blog.countDocuments({
        isActive: false,
      }),

      Blog.countDocuments({
        isFeatured: true,
        status: "approved",
      }),

      Blog.countDocuments({
        isPopular: true,
        status: "approved",
      }),

      Blog.countDocuments({
        status: "pending",
      }),

      Blog.countDocuments({
        status: "approved",
      }),

      Blog.countDocuments({
        status: "rejected",
      }),

      Blog.countDocuments({
        source: "user",
      }),

      Blog.countDocuments({
        source: "admin",
      }),

      Blog.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$views",
            },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,

      blogs,

      stats: {
        total: totalBlogs,
        active: activeBlogs,
        inactive: inactiveBlogs,

        featured: featuredBlogs,
        popular: popularBlogs,

        pending: pendingBlogs,
        approved: approvedBlogs,
        rejected: rejectedBlogs,

        user: userBlogs,
        admin: adminBlogs,

        views:
          totalViews[0]?.total || 0,
      },

      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(
          total / perPage
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get Admin Blogs Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch blogs.",
    });
  }
};

/* =========================================================
   ADMIN - CREATE BLOG
   EXISTING FLOW PRESERVED
   ========================================================= */

const createBlog = async (
  req,
  res
) => {
  try {
    const {
      title,
      category,
      excerpt,
      content,
      author,
      readTime,
      date,
      isFeatured,
      isPopular,
      isActive,
    } = req.body;

    /* REQUIRED FIELDS */

    if (!title?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    if (!category?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Category is required.",
      });
    }

    if (!excerpt?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Excerpt is required.",
      });
    }

    if (!content?.trim()) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message:
          "Blog content is required.",
      });
    }

    /* FLAGS */

    const featured =
      isFeatured === true ||
      isFeatured === "true";

    const popular =
      isPopular === true ||
      isPopular === "true";

    const flagError =
      await validateFlags({
        isFeatured: featured,
        isPopular: popular,
      });

    if (flagError) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: flagError,
      });
    }

    /* SLUG */

    const slug =
      await generateUniqueSlug(
        title
      );

    /* CREATE */

    const blog =
      await Blog.create({
        title: title.trim(),

        slug,

        category: category.trim(),

        excerpt: excerpt.trim(),

        content,

        author:
          author?.trim() ||
          "PetCard Care Team",

        email: "",

        readTime:
          readTime?.trim() ||
          "5 min read",

        date:
          date || new Date(),

        image: req.file
          ? `/uploads/blogs/${req.file.filename}`
          : "",

        views: 0,

        isFeatured: featured,

        isPopular: popular,

        isActive:
          isActive === undefined
            ? true
            : isActive === true ||
              isActive === "true",

        /*
         * ADMIN BLOG
         * Automatically approved.
         */
        source: "admin",

        status: "approved",

        approvedAt: new Date(),

        rejectedAt: null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Blog created successfully.",
      blog,
    });
  } catch (error) {
    console.error(
      "Create Blog Error:",
      error
    );

    cleanupUploadedFile(req.file);

    return res.status(500).json({
      success: false,
      message:
        "Failed to create blog.",
    });
  }
};

/* =========================================================
   ADMIN - UPDATE BLOG
   ========================================================= */

const updateBlog = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const blog =
      await Blog.findById(id);

    if (!blog) {
      cleanupUploadedFile(req.file);

      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    const {
      title,
      category,
      excerpt,
      content,
      author,
      email,
      readTime,
      date,
      isFeatured,
      isPopular,
      isActive,
      status,
    } = req.body;

    /* =====================================================
       FLAGS
       ===================================================== */

    const featured =
      isFeatured === true ||
      isFeatured === "true";

    const popular =
      isPopular === true ||
      isPopular === "true";

    const flagError =
      await validateFlags({
        isFeatured: featured,
        isPopular: popular,
        currentId: blog._id,
      });

    if (flagError) {
      cleanupUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: flagError,
      });
    }

    /* =====================================================
       BASIC FIELDS
       ===================================================== */

    if (title !== undefined) {
      if (!title.trim()) {
        cleanupUploadedFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Title is required.",
        });
      }

      if (
        title.trim() !== blog.title
      ) {
        blog.slug =
          await generateUniqueSlug(
            title,
            blog._id
          );
      }

      blog.title =
        title.trim();
    }

    if (category !== undefined) {
      if (!category.trim()) {
        cleanupUploadedFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Category is required.",
        });
      }

      blog.category =
        category.trim();
    }

    if (excerpt !== undefined) {
      if (!excerpt.trim()) {
        cleanupUploadedFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Excerpt is required.",
        });
      }

      blog.excerpt =
        excerpt.trim();
    }

    if (content !== undefined) {
      if (!content.trim()) {
        cleanupUploadedFile(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Blog content is required.",
        });
      }

      blog.content = content;
    }

    if (author !== undefined) {
      blog.author =
        author.trim() ||
        "PetCard Care Team";
    }

    if (email !== undefined) {
      blog.email =
        email.trim().toLowerCase();
    }

    if (readTime !== undefined) {
      blog.readTime =
        readTime.trim() ||
        "5 min read";
    }

    if (
      date !== undefined &&
      date !== ""
    ) {
      blog.date = date;
    }

    /* =====================================================
       FEATURED / POPULAR
       ===================================================== */

    blog.isFeatured = featured;
    blog.isPopular = popular;

    /* =====================================================
       ACTIVE
       ===================================================== */

    if (isActive !== undefined) {
      blog.isActive =
        isActive === true ||
        isActive === "true";
    }

    /* =====================================================
       APPROVAL STATUS
       ===================================================== */

    if (
      status === "pending" ||
      status === "approved" ||
      status === "rejected"
    ) {
      blog.status = status;

      if (status === "approved") {
        blog.approvedAt =
          blog.approvedAt ||
          new Date();

        blog.rejectedAt = null;

        /*
         * Approval means publish.
         */
        blog.isActive = true;
      }

      if (status === "rejected") {
        blog.rejectedAt =
          new Date();

        blog.approvedAt = null;

        blog.isActive = false;
      }

      if (status === "pending") {
        blog.approvedAt = null;
        blog.rejectedAt = null;
        blog.isActive = false;
      }
    }

    /* =====================================================
       NEW IMAGE
       ===================================================== */

    /*
     * IMPORTANT:
     * Old image is deleted ONLY if a new image
     * is successfully uploaded and DB save succeeds.
     */

    let oldImage = null;
    let newImage = null;

    if (req.file) {
      oldImage = blog.image;

      newImage =
        `/uploads/blogs/${req.file.filename}`;

      blog.image = newImage;
    }

    /* =====================================================
       SAVE
       ===================================================== */

    try {
      await blog.save();
    } catch (saveError) {
      /*
       * DB save failed.
       * Remove newly uploaded image.
       * Keep old image untouched.
       */
      cleanupUploadedFile(req.file);

      throw saveError;
    }

    /*
     * DB save successful.
     * Now old image can safely be removed.
     */
    if (
      req.file &&
      oldImage &&
      oldImage !== newImage
    ) {
      removeLocalImage(oldImage);
    }

    return res.status(200).json({
      success: true,
      message:
        "Blog updated successfully.",
      blog,
    });
  } catch (error) {
    console.error(
      "Update Blog Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update blog.",
    });
  }
};

/* =========================================================
   ADMIN - APPROVE BLOG
   ========================================================= */

const approveBlog = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const blog =
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    blog.status = "approved";

    blog.isActive = true;

    blog.approvedAt =
      new Date();

    blog.rejectedAt = null;

    await blog.save();

    return res.status(200).json({
      success: true,
      message:
        "Blog approved and published successfully.",
      blog,
    });
  } catch (error) {
    console.error(
      "Approve Blog Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve blog.",
    });
  }
};

/* =========================================================
   ADMIN - REJECT BLOG
   ========================================================= */

const rejectBlog = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const blog =
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    blog.status = "rejected";

    blog.isActive = false;

    blog.rejectedAt =
      new Date();

    blog.approvedAt = null;

    await blog.save();

    return res.status(200).json({
      success: true,
      message:
        "Blog rejected successfully.",
      blog,
    });
  } catch (error) {
    console.error(
      "Reject Blog Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reject blog.",
    });
  }
};

/* =========================================================
   ADMIN - TOGGLE STATUS
   ========================================================= */

const toggleBlogStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const blog =
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    /*
     * Only approved blogs can be active
     * on the public website.
     */
    if (
      blog.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only approved blogs can be activated.",
      });
    }

    blog.isActive =
      !blog.isActive;

    await blog.save();

    return res.status(200).json({
      success: true,
      message: blog.isActive
        ? "Blog activated successfully."
        : "Blog deactivated successfully.",
      blog,
    });
  } catch (error) {
    console.error(
      "Toggle Blog Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update blog status.",
    });
  }
};

/* =========================================================
   ADMIN - DELETE BLOG
   ========================================================= */

const deleteBlog = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const blog =
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    /* DELETE IMAGE */

    if (blog.image) {
      removeLocalImage(
        blog.image
      );
    }

    /* DELETE BLOG */

    await Blog.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Blog deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete Blog Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete blog.",
    });
  }
};

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
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
};