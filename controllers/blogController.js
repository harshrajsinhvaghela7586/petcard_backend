const fs = require("fs");
const path = require("path");
const Blog = require("../models/Blog");

const removeLocalImage = (imagePath) => {
  if (!imagePath || !imagePath.startsWith("/uploads/")) {
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

const slugify = (text) => {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

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
    };

    if (currentId) {
      query._id = {
        $ne: currentId,
      };
    }

    const count = await Blog.countDocuments(query);

    if (count >= 1) {
      return "Only one Featured blog is allowed.";
    }
  }

  if (isPopular) {
    const query = {
      isPopular: true,
    };

    if (currentId) {
      query._id = {
        $ne: currentId,
      };
    }

    const count = await Blog.countDocuments(query);

    if (count >= 4) {
      return "Only four Popular blogs are allowed.";
    }
  }

  return null;
};

/* =========================================================
   PUBLIC
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

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(
      Math.max(Number(limit) || 10, 1),
      50
    );

    const filter = {
      isActive: true,
    };

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

    if (category) {
      filter.category = category;
    }

    if (featured === "true") {
      filter.isFeatured = true;
    }

    if (popular === "true") {
      filter.isPopular = true;
    }

    const total = await Blog.countDocuments(filter);

    const blogs = await Blog.find(filter)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean();

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("Get Public Blogs Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch blogs.",
    });
  }
};

/* =========================================================
   PUBLIC SINGLE BLOG
========================================================= */

const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
      isActive: true,
    }).lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    return res.status(200).json({
      success: true,
      blog,
    });
  } catch (error) {
    console.error("Get Blog By Slug Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog.",
    });
  }
};

/* =========================================================
   ADMIN LIST
========================================================= */

const getAdminBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category = "",
      type = "all",
      status = "all",
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = 10;

    const filter = {};

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

    if (category) {
      filter.category = category;
    }

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

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    const total = await Blog.countDocuments(filter);

    const blogs = await Blog.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean();

    const [
      totalBlogs,
      activeBlogs,
      inactiveBlogs,
      featuredBlogs,
      popularBlogs,
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
      }),
      Blog.countDocuments({
        isPopular: true,
      }),
    ]);

    return res.status(200).json({
      success: true,

      blogs,

      stats: {
        total: totalBlogs,
        active: activeBlogs,
        featured: featuredBlogs,
        popular: popularBlogs,
        inactive: inactiveBlogs,
      },

      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("Get Admin Blogs Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs.",
    });
  }
};

/* =========================================================
   CREATE
========================================================= */

const createBlog = async (req, res) => {
  try {
    const {
      title,
      category,
      excerpt,
      author,
      readTime,
      date,
      intro,
      sections,
      takeaways,
      note,
      isFeatured,
      isPopular,
      isActive,
    } = req.body;

    if (
      !title?.trim() ||
      !category?.trim() ||
      !excerpt?.trim() ||
      !intro?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, category, excerpt and intro are required.",
      });
    }

    const featured = isFeatured === true || isFeatured === "true";
    const popular = isPopular === true || isPopular === "true";

    const flagError = await validateFlags({
      isFeatured: featured,
      isPopular: popular,
    });

    if (flagError) {
      return res.status(400).json({
        success: false,
        message: flagError,
      });
    }

    let parsedSections = [];
    let parsedTakeaways = [];

    try {
      parsedSections = sections
        ? JSON.parse(sections)
        : [];

      parsedTakeaways = takeaways
        ? JSON.parse(takeaways)
        : [];
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid sections or takeaways format.",
      });
    }

    const baseSlug = slugify(title);

    let slug = baseSlug;
    let counter = 1;

    while (await Blog.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const blog = await Blog.create({
      title: title.trim(),
      slug,
      category: category.trim(),
      excerpt: excerpt.trim(),
      author:
        author?.trim() || "PetCard Care Team",
      readTime: readTime?.trim() || "5 min read",
      date: date || new Date(),
      image: req.file
        ? `/uploads/blogs/${req.file.filename}`
        : "",
      intro: intro.trim(),
      sections: parsedSections,
      takeaways: parsedTakeaways,
      note: note?.trim() || "",
      isFeatured: featured,
      isPopular: popular,
      isActive:
        isActive === undefined
          ? true
          : isActive === true ||
            isActive === "true",
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully.",
      blog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create blog.",
    });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    const {
      title,
      category,
      excerpt,
      author,
      readTime,
      date,
      intro,
      sections,
      takeaways,
      note,
      isFeatured,
      isPopular,
      isActive,
    } = req.body;

    /* =====================================================
       FEATURED / POPULAR FLAGS
    ===================================================== */

    const featured =
      isFeatured === true ||
      isFeatured === "true";

    const popular =
      isPopular === true ||
      isPopular === "true";

    const flagError = await validateFlags({
      isFeatured: featured,
      isPopular: popular,
      currentId: blog._id,
    });

    if (flagError) {
      return res.status(400).json({
        success: false,
        message: flagError,
      });
    }

    /* =====================================================
       PARSE SECTIONS
    ===================================================== */

    let parsedSections = blog.sections;
    let parsedTakeaways = blog.takeaways;

    try {
      if (sections !== undefined) {
        parsedSections =
          typeof sections === "string"
            ? JSON.parse(sections)
            : sections;
      }

      if (takeaways !== undefined) {
        parsedTakeaways =
          typeof takeaways === "string"
            ? JSON.parse(takeaways)
            : takeaways;
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid sections or takeaways format.",
      });
    }

    /* =====================================================
       UPDATE BASIC FIELDS
    ===================================================== */

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title is required.",
        });
      }

      blog.title = title.trim();
    }

    if (category !== undefined) {
      blog.category = category.trim();
    }

    if (excerpt !== undefined) {
      blog.excerpt = excerpt.trim();
    }

    if (author !== undefined) {
      blog.author =
        author.trim() || "PetCard Care Team";
    }

    if (readTime !== undefined) {
      blog.readTime = readTime.trim();
    }

    if (date !== undefined && date !== "") {
      blog.date = date;
    }

    if (intro !== undefined) {
      if (!intro.trim()) {
        return res.status(400).json({
          success: false,
          message: "Intro is required.",
        });
      }

      blog.intro = intro.trim();
    }

    blog.sections = parsedSections;
    blog.takeaways = parsedTakeaways;

    if (note !== undefined) {
      blog.note = note.trim();
    }

    /* =====================================================
       FEATURED / POPULAR / ACTIVE
    ===================================================== */

    blog.isFeatured = featured;
    blog.isPopular = popular;

    if (isActive !== undefined) {
      blog.isActive =
        isActive === true ||
        isActive === "true";
    }

    /* =====================================================
       NEW IMAGE
    ===================================================== */

    if (req.file) {
      const oldImage = blog.image;

      blog.image = `/uploads/blogs/${req.file.filename}`;

      // Remove previous local image
      if (oldImage) {
        removeLocalImage(oldImage);
      }
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully.",
      blog,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog.",
    });
  }
};

const toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    blog.isActive = !blog.isActive;

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
      message: "Failed to update blog status.",
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    // Delete local blog image
    if (blog.image) {
      removeLocalImage(blog.image);
    }

    // Delete blog from MongoDB
    await Blog.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Blog Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete blog.",
    });
  }
};

module.exports = {
 getAdminBlogs,getBlogBySlug,getPublicBlogs,createBlog,updateBlog,toggleBlogStatus,deleteBlog
};