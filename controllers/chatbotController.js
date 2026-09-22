const FAQ = require("../models/FAQ");
const Blog = require("../models/Blog");

const {
  generateChatbotResponse,
} = require("../utils/gemini");

const MAX_MESSAGE_LENGTH = 500;

/* =========================================================
   PETCARD STATIC KNOWLEDGE
   ========================================================= */

const PETCARD_KNOWLEDGE = `
PETCARD PRODUCT:

PetCard is a digital pet information and identity platform designed
to help pet parents organize important pet information, everyday care,
health information, memories, and related pet-care experiences.

IDENTITY & SAFETY:
- Digital PetCard
- Pet ID
- QR Code
- Scan QR
- Emergency Card
- Guardian Access
- Two Guardian Support
- Share and Download

DAILY CARE:
- Daily Tasks
- Feeding
- Water
- Walking
- Grooming
- Medication
- Reminders
- Calendar
- Task History

HEALTH & WELLNESS:
- Health Records
- Vaccination
- Deworming
- Medicines
- Treatments
- Vet Visits
- Medical Documents
- Weight and Growth
- Medical Conditions
- Allergies

SMART PET CARE:
- Breed Information
- Health & Wellness
- Food & Nutrition
- Grooming
- Training
- Safety
- Basic Care
- PawChat AI

MEMORIES & PROGRESS:
- Memories
- Photos
- Videos
- Albums
- Milestones
- Timeline
- Pet Progress
- Care Score

REWARDS & GAMIFICATION:
- Daily Streaks
- XP
- PawPoints
- Levels
- Achievements
- Badges
- Rewards Shop
- Unlocks

PETMOJI & CUSTOMIZATION:
- Preset Pet Avatars
- Create Petmoji
- Accessories
- Backgrounds
- Frames
- Stickers
- Paw Effects
- PetCard Themes

FUN ZONE:
- Clicker
- Whistle
- Training tools

PETCARD JOURNEY:
1. Create Profile
2. Add Your Pet
3. Create Their Petmoji
4. Get Your PetCard
5. Start Daily Care
6. Track & Protect
7. Earn, Learn & Have Fun

PetCard supports pet parents in organizing pet information and
everyday care activities.

Pet information such as health, vaccination, medication and emergency
information should be kept accurate and updated.

PetCard is intended to organize information and should not replace
professional veterinary care or emergency services.

PetCard contact email:
info@petcard.in
`;

/* =========================================================
   CHATBOT SCOPE
   ========================================================= */

/*
 * PetCard-specific terms.
 */
const PETCARD_KEYWORDS = [
  "petcard",
  "pet card",
  "pawchat",
  "pet id",
  "digital petcard",
  "digital pet card",
  "qr code",
  "scan qr",
  "emergency card",
  "guardian access",
  "two guardian",
  "petmoji",
  "pawpoints",
  "pet rewards",
  "pet memories",
  "pet profile",
  "pet health records",
  "pet reminders",
];

/*
 * Pet-related words.
 *
 * These allow general pet-care questions to reach Gemini.
 */
const PET_KEYWORDS = [
  "pet",
  "pets",
  "dog",
  "dogs",
  "puppy",
  "puppies",
  "cat",
  "cats",
  "kitten",
  "kittens",
  "rabbit",
  "rabbits",
  "bunny",
  "bunnies",
  "hamster",
  "hamsters",
  "parrot",
  "parrots",
  "bird",
  "birds",
  "fish",
  "animal",
  "animals",
  "vet",
  "veterinarian",
  "veterinary",
  "feeding",
  "vaccination",
  "vaccinations",
  "grooming",
  "deworming",
  "medication",
  "medications",
  "medicine",
  "medicines",
  "training",
  "nutrition",
  "pet food",
  "pet health",
  "pet care",
  "pet behavior",
  "cat behavior",
  "dog training",
  "puppy training",
  "pet nutrition",
];

/*
 * Basic conversation is allowed.
 *
 * IMPORTANT:
 * These are checked as complete phrases.
 * This prevents something like:
 *
 * "help me write Python code"
 *
 * from being allowed just because it contains "help".
 */
const BASIC_CHAT_PHRASES = [
  "hello",
  "hi",
  "hey",
  "hii",
  "hiii",
  "hola",
  "thanks",
  "thank you",
  "thank",
  "good morning",
  "good afternoon",
  "good evening",
  "who are you",
  "what can you do",
  "help",
];

/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

const normalizeText = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   MATCH COMPLETE WORD / PHRASE
   ========================================================= */

const containsPhrase = (text, phrase) => {
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedPhrase) {
    return false;
  }

  const escapedPhrase = normalizedPhrase.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `(^|\\s)${escapedPhrase}(?=\\s|$)`,
    "i"
  );

  return regex.test(text);
};

/* =========================================================
   CHECK PETCARD / PET / BASIC CHAT
   ========================================================= */

const containsAnyPhrase = (text, phrases) => {
  return phrases.some((phrase) =>
    containsPhrase(text, phrase)
  );
};

/* =========================================================
   ALLOWED CHATBOT QUESTION
   ========================================================= */

const isAllowedChatbotQuestion = (question) => {
  const normalized = normalizeText(question);

  if (!normalized) {
    return false;
  }

  /*
   * 1. PetCard-related question
   */
  if (
    containsAnyPhrase(
      normalized,
      PETCARD_KEYWORDS
    )
  ) {
    return true;
  }

  /*
   * 2. General pet-related question
   */
  if (
    containsAnyPhrase(
      normalized,
      PET_KEYWORDS
    )
  ) {
    return true;
  }

  /*
   * 3. Basic conversation
   *
   * Only allow if the entire message is a basic phrase.
   *
   * Example:
   * "hello"              -> allowed
   * "who are you"        -> allowed
   * "help me with Python" -> NOT allowed
   */
  if (
    BASIC_CHAT_PHRASES.some(
      (phrase) => normalized === phrase
    )
  ) {
    return true;
  }

  return false;
};

/* =========================================================
   STOP WORDS
   ========================================================= */

const STOP_WORDS = new Set([
  "the",
  "is",
  "are",
  "am",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "in",
  "on",
  "at",
  "with",
  "can",
  "i",
  "me",
  "my",
  "you",
  "your",
  "what",
  "how",
  "why",
  "when",
  "where",
  "does",
  "do",
  "it",
  "this",
  "that",
  "be",
  "will",
  "about",
]);

/* =========================================================
   EXTRACT SEARCH TERMS
   ========================================================= */

const getSearchTerms = (message) => {
  return normalizeText(message)
    .split(" ")
    .filter(
      (word) =>
        word.length >= 3 &&
        !STOP_WORDS.has(word)
    );
};

/* =========================================================
   SCORE FAQ
   ========================================================= */

const scoreFaq = (faq, terms) => {
  const question = normalizeText(faq.question);
  const answer = normalizeText(faq.answer);

  let score = 0;

  for (const term of terms) {
    if (question.includes(term)) {
      score += 4;
    }

    if (answer.includes(term)) {
      score += 2;
    }
  }

  return score;
};

/* =========================================================
   SCORE BLOG
   ========================================================= */

const scoreBlog = (blog, terms) => {
  const title = normalizeText(blog.title);
  const excerpt = normalizeText(blog.excerpt);
  const content = normalizeText(blog.content);
  const category = normalizeText(blog.category);

  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) {
      score += 6;
    }

    if (category.includes(term)) {
      score += 4;
    }

    if (excerpt.includes(term)) {
      score += 3;
    }

    if (content.includes(term)) {
      score += 1;
    }
  }

  return score;
};

/* =========================================================
   GET RELEVANT KNOWLEDGE
   ========================================================= */

const getRelevantKnowledge = async (message) => {
  const terms = getSearchTerms(message);

  const [faqs, blogs] = await Promise.all([
    /*
     * Only active FAQs
     */
    FAQ.find({
      isActive: true,
    })
      .select("question answer")
      .lean(),

    /*
     * Only active + approved blogs
     */
    Blog.find({
      isActive: true,
      status: "approved",
    })
      .select(
        "title category excerpt content author"
      )
      .sort({
        date: -1,
        createdAt: -1,
      })
      .lean(),
  ]);

  /* =======================================================
     SCORE FAQS
     ======================================================= */

  const scoredFaqs = faqs
    .map((faq) => ({
      faq,
      score: scoreFaq(faq, terms),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) => b.score - a.score
    )
    .slice(0, 5);

  /* =======================================================
     SCORE BLOGS
     ======================================================= */

  const scoredBlogs = blogs
    .map((blog) => ({
      blog,
      score: scoreBlog(blog, terms),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) => b.score - a.score
    )
    .slice(0, 3);

  let context = "";

  /* =======================================================
     CONFIRMED PETCARD PRODUCT INFORMATION
     ======================================================= */

  context += `
=== CONFIRMED PETCARD PRODUCT INFORMATION ===

${PETCARD_KNOWLEDGE}
`;

  /* =======================================================
     RELEVANT FAQS
     ======================================================= */

  if (scoredFaqs.length > 0) {
    context += `
=== RELEVANT PETCARD INFORMATION ===
`;

    for (const item of scoredFaqs) {
      context += `
Question:
${item.faq.question}

Answer:
${item.faq.answer}
`;
    }
  }

  /* =======================================================
     RELEVANT BLOGS
     ======================================================= */

  if (scoredBlogs.length > 0) {
    context += `
=== RELEVANT PETCARD PUBLISHED CONTENT ===
`;

    for (const item of scoredBlogs) {
      context += `
Title:
${item.blog.title}

Category:
${item.blog.category}

Content:
${item.blog.content}
`;
    }
  }

  return context;
};

/* =========================================================
   POST /api/chatbot
   ========================================================= */

const chatWithPetCard = async (req, res) => {
  try {
    const { message } = req.body;

    /* =====================================================
       VALIDATE MESSAGE
       ===================================================== */

    if (
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const question = message.trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty.",
      });
    }

    if (
      question.length >
      MAX_MESSAGE_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please keep your message under 500 characters.",
      });
    }

    /* =====================================================
       SCOPE CHECK
       ===================================================== */

    /*
     * IMPORTANT:
     *
     * This happens BEFORE calling Gemini.
     *
     * Therefore questions like:
     *
     * - Who is PM of India?
     * - How many states are there in the USA?
     * - Give me Python code.
     * - Write a React component.
     * - Create a .tsx file.
     *
     * will never reach Gemini.
     */

    if (
      !isAllowedChatbotQuestion(question)
    ) {
      return res.status(200).json({
        success: true,
        answer:
          "I can help with PetCard and pet-care questions.\n\nPlease ask me something about PetCard, your pet, pet health, care, training, nutrition, or related topics.",
      });
    }

    /* =====================================================
       GET RELEVANT PETCARD KNOWLEDGE
       ===================================================== */

    const context =
      await getRelevantKnowledge(question);

    /* =====================================================
       GENERATE AI RESPONSE
       ===================================================== */

    const answer =
      await generateChatbotResponse({
        question,
        context,
      });

    /* =====================================================
       FINAL RESPONSE
       ===================================================== */

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error(
      "PetCard Chatbot Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "PetCard AI is temporarily unavailable. Please try again in a moment.",
    });
  }
};

/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {
  chatWithPetCard,
};