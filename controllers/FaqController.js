const FAQ = require("../models/FAQ");

// =====================================================
// GET ACTIVE FAQS - PUBLIC
// =====================================================

const getFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      faqs,
    });
  } catch (error) {
    console.error("Get FAQs Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs.",
    });
  }
};

// =====================================================
// GET ALL FAQS - ADMIN
// =====================================================

const getAllFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      faqs,
    });
  } catch (error) {
    console.error("Get All FAQs Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs.",
    });
  }
};

// =====================================================
// CREATE FAQ - ADMIN
// =====================================================

const createFaq = async (req, res) => {
  try {
    const { question, answer, isActive } = req.body;

    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required.",
      });
    }

    const faq = await FAQ.create({
      question: question.trim(),
      answer: answer.trim(),
      isActive:
        isActive === undefined
          ? true
          : isActive === true ||
            isActive === "true",
    });

    res.status(201).json({
      success: true,
      message: "FAQ created successfully.",
      faq,
    });
  } catch (error) {
    console.error("Create FAQ Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create FAQ.",
    });
  }
};

// =====================================================
// UPDATE FAQ - ADMIN
// =====================================================

const updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, isActive } = req.body;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    if (question !== undefined) {
      faq.question = question.trim();
    }

    if (answer !== undefined) {
      faq.answer = answer.trim();
    }

    if (isActive !== undefined) {
      faq.isActive =
        isActive === true || isActive === "true";
    }

    await faq.save();

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully.",
      faq,
    });
  } catch (error) {
    console.error("Update FAQ Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update FAQ.",
    });
  }
};

// =====================================================
// DELETE FAQ - ADMIN
// =====================================================

const deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    await FAQ.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully.",
    });
  } catch (error) {
    console.error("Delete FAQ Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete FAQ.",
    });
  }
};

module.exports = {
  getFaqs,
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
};