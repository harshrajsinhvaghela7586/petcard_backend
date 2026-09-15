// const HeroSlider = require("../models/HeroSlider");
const FAQ = require("../models/FAQ");
const Testimonial = require("../models/Testimonial");
const Blog = require("../models/Blog");
const Contact = require("../models/Contact");

const getDashboardStats = async (req, res) => {
    try {
        const [
            // heroSlides,
            faqs,
            testimonials,
            blogs,
            contacts,
            latestContacts,
        ] = await Promise.all([
           // HeroSlider.countDocuments(),
            FAQ.countDocuments(),
            Testimonial.countDocuments(),
            Blog.countDocuments(),
            Contact.countDocuments(),

            Contact.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select(
                    "fullName email subject message isRead isReplied createdAt"
                )
                .lean(),
        ]);

        const unreadContacts = await Contact.countDocuments({
            isRead: false,
        });

        const repliedContacts = await Contact.countDocuments({
            isReplied: true,
        });

        return res.status(200).json({
            success: true,

            stats: {
               // heroSlides,
                faqs,
                testimonials,
                blogs,
                contacts,
                unreadContacts,
                repliedContacts,
            },

            latestContacts,
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data.",
        });
    }
};

module.exports = {
    getDashboardStats,
};