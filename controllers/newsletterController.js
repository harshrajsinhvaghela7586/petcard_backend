const Newsletter = require("../models/newsletterModel");

const {
  sendEmail,
  buildNewsletterEmail,
} = require("../utils/email");
const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const existingSubscriber = await Newsletter.findOne({
      email: normalizedEmail,
    });

    if (existingSubscriber) {
      // Re-subscribe previously unsubscribed user
      if (!existingSubscriber.isActive) {
        existingSubscriber.isActive = true;
        existingSubscriber.unsubscribedAt = null;
        existingSubscriber.subscribedAt = new Date();

        await existingSubscriber.save();

        return res.status(200).json({
          success: true,
          message: "You have been subscribed again.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "This email is already subscribed.",
      });
    }

    await Newsletter.create({
      email: normalizedEmail,
    });

    return res.status(201).json({
      success: true,
      message: "Successfully subscribed to PetCard updates.",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

const getNewsletterSubscribers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const search = (req.query.search || "").trim();

    const filter = {};

    if (search) {
      filter.email = {
        $regex: search,
        $options: "i",
      };
    }

    const skip = (page - 1) * limit;

    const [subscribers, total, active, inactive] =
      await Promise.all([
        Newsletter.find(filter)
          .sort({ subscribedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Newsletter.countDocuments(filter),

        Newsletter.countDocuments({
          ...filter,
          isActive: true,
        }),

        Newsletter.countDocuments({
          ...filter,
          isActive: false,
        }),
      ]);

    return res.status(200).json({
      success: true,
      subscribers,
      stats: {
        total,
        active,
        inactive,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "Get newsletter subscribers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch newsletter subscribers.",
    });
  }
};


const deleteNewsletterSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber =
      await Newsletter.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Newsletter subscriber not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Newsletter subscriber deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete newsletter subscriber error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete newsletter subscriber.",
    });
  }
};


const sendNewsletter = async (req, res) => {
  try {
    const {
      subject,
      preheader,
      heading,
      content,
      ctaText,
      ctaUrl,
    } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (!heading || !heading.trim()) {
      return res.status(400).json({
        success: false,
        message: "Heading is required.",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Newsletter content is required.",
      });
    }

    const subscribers = await Newsletter.find({
      isActive: true,
    })
      .select("email")
      .lean();

    if (!subscribers.length) {
      return res.status(400).json({
        success: false,
        message: "No active newsletter subscribers found.",
      });
    }

    // Build actual HTML email
    const html = buildNewsletterEmail({
      preheader: preheader || "",
      heading: heading.trim(),
      content,
      ctaText: ctaText || "",
      ctaUrl: ctaUrl || "",
    });

    // Plain-text fallback
    const text = `${heading.trim()}

${content
  .replace(/<[^>]*>/g, " ")
  .replace(/\s+/g, " ")
  .trim()}`;

    console.log(
      "Newsletter HTML generated:",
      html.substring(0, 500)
    );

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      try {
        await sendEmail({
          to: subscriber.email,
          subject: subject.trim(),
          text,
          html,
        });

        sent++;
      } catch (emailError) {
        failed++;

        console.error(
          `Newsletter failed for ${subscriber.email}:`,
          emailError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        failed > 0
          ? `Newsletter sent to ${sent} subscribers. ${failed} failed.`
          : `Newsletter sent successfully to ${sent} subscribers.`,
      sent,
      failed,
      total: subscribers.length,
    });
  } catch (error) {
    console.error(
      "Send newsletter error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send newsletter.",
    });
  }
};

const exportNewsletterSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find({})
      .sort({ subscribedAt: -1 })
      .lean();

    const rows = [
      ["Email", "Status", "Subscribed At", "Unsubscribed At"],
    ];

    subscribers.forEach((subscriber) => {
      rows.push([
        subscriber.email,
        subscriber.isActive
          ? "Active"
          : "Unsubscribed",
        subscriber.subscribedAt
          ? new Date(
              subscriber.subscribedAt
            ).toISOString()
          : "",
        subscriber.unsubscribedAt
          ? new Date(
              subscriber.unsubscribedAt
            ).toISOString()
          : "",
      ]);
    });

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");

            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="petcard-newsletter-subscribers.csv"'
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error(
      "Export newsletter subscribers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to export subscribers.",
    });
  }
};


module.exports = {
  subscribeNewsletter,
  getNewsletterSubscribers,
  deleteNewsletterSubscriber,
  sendNewsletter,
  exportNewsletterSubscribers,
};

