const Contact = require("../models/Contact");

const {
  sendEmail,
} = require("../utils/email");

const {
  buildContactReplyEmail,
} = require("../utils/email");

// =====================================================
// CREATE CONTACT - PUBLIC
// =====================================================

const createContact = async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const contact = await Contact.create({
      fullName: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || "",
      message: message.trim(),
      isRead: false,
    });

    return res.status(201).json({
      success: true,
      message:
        "Your message has been sent successfully.",
      contact: {
        _id: contact._id,
      },
    });
  } catch (error) {
    console.error("Create Contact Error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to send your message. Please try again.",
    });
  }
};


// =====================================================
// GET ALL CONTACTS - ADMIN
// =====================================================

const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error("Get Contacts Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contacts.",
    });
  }
};


// =====================================================
// GET SINGLE CONTACT - ADMIN
// =====================================================

const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(
      req.params.id
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found.",
      });
    }

    return res.status(200).json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error(
      "Get Contact By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact.",
    });
  }
};


// =====================================================
// MARK AS READ - ADMIN
// =====================================================

const markAsRead = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
      },
      {
        new: true,
      }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact marked as read.",
      contact,
    });
  } catch (error) {
    console.error(
      "Mark Contact Read Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update contact.",
    });
  }
};


// =====================================================
// DELETE CONTACT - ADMIN
// =====================================================

const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(
      req.params.id
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete Contact Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete contact.",
    });
  }
};


// =====================================================
// REPLY TO CONTACT
// =====================================================

const replyToContact = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      subject,
      message,
    } = req.body;

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply subject is required.",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required.",
      });
    }

    const contact =
      await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found.",
      });
    }


    // =================================================
    // BUILD EMAIL
    // =================================================

    const html =
      buildContactReplyEmail({
        name: contact.fullName,
        originalSubject:
          contact.subject,
        originalMessage:
          contact.message,
        replyMessage:
          message.trim(),
      });


    // =================================================
    // SEND EMAIL
    // =================================================

    await sendEmail({
      to: contact.email,

      subject: subject.trim(),

      html,
    });


    // =================================================
    // SAVE REPLY STATUS
    // =================================================

    contact.isReplied = true;

    contact.repliedAt = new Date();

    contact.replySubject =
      subject.trim();

    contact.replyMessage =
      message.trim();

    contact.isRead = true;

    await contact.save();


    return res.status(200).json({
      success: true,

      message:
        "Reply sent successfully.",

      contact,
    });

  } catch (error) {

    console.error(
      "Reply Contact Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to send reply email.",
    });
  }
};



module.exports = {
  createContact,
  getContacts,
  getContactById,
  markAsRead,
  deleteContact,
  replyToContact
};