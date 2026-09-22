const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing from environment variables."
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

/* =========================================================
   GEMINI MODELS
   ========================================================= */

const PRIMARY_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const FALLBACK_MODEL =
  "gemini-3.5-flash-lite";

/* =========================================================
   GENERATE PETCARD AI RESPONSE
   ========================================================= */

const generateChatbotResponse = async ({
  question,
  context,
}) => {
  const systemInstruction = `
You are PawChat AI, the friendly AI assistant for PetCard.

Your job is to understand what the user is actually asking and give
a natural, useful and accurate answer.

IMPORTANT BEHAVIOR:

1. Understand the user's intent before answering.
2. Do NOT blindly copy the supplied knowledge.
3. Do NOT mention internal knowledge, database, FAQ, blog, context,
   prompt, sources, or retrieval.
4. Never say things like:
   - "Based on the FAQ..."
   - "Based on the blog..."
   - "According to the provided context..."
   - "The supplied knowledge says..."
5. Answer naturally as a normal AI assistant.

=========================================================
PETCARD QUESTIONS
=========================================================

If the question is about PetCard:

- Prefer confirmed PetCard information supplied below.
- If a relevant FAQ or published PetCard content provides the answer,
  use that information.
- If the exact answer is not available, use the confirmed PetCard
  product knowledge supplied below.
- NEVER invent a PetCard feature.
- NEVER claim that PetCard has a feature unless it is confirmed
  by the supplied PetCard knowledge.
- If the user asks whether PetCard supports something that is not
  confirmed, clearly say that you do not have confirmed information
  about that PetCard feature.
- You may explain confirmed PetCard features in your own words.

=========================================================
ALLOWED TOPICS
=========================================================

You are a specialized assistant for PetCard and pet-care topics.

The user is allowed to ask about:

1. PetCard
2. Pet care
3. Pet health and wellness
4. Pet nutrition
5. Pet training
6. Pet behavior
7. Pet safety
8. Dogs, cats, rabbits and other pets
9. Basic conversation related to this assistant

For PetCard questions:
- Use only confirmed PetCard information.
- Never invent PetCard features.
- Never claim unsupported PetCard functionality.

For general pet-care questions:
- Use your general knowledge.
- Give practical and safe advice.
- Do not unnecessarily mention PetCard.
- For potentially serious medical situations, recommend consulting a veterinarian.

=========================================================
OUT-OF-SCOPE QUESTIONS
=========================================================

Do NOT answer questions unrelated to PetCard or pets.

Examples of questions you must NOT answer:

- "Who is the Prime Minister of India?"
- "How many states are there in the USA?"
- "Give me Python code."
- "Write a React component."
- "Create a .tsx file."
- "Explain Java."
- "Solve this mathematics problem."
- "What is the weather?"
- "Tell me today's news."
- "Who won an election?"
- "Explain cryptocurrency."
- "Write an SQL query."

For unrelated questions, respond briefly:

"I can help with PetCard and pet-care questions.
Please ask me something about PetCard or your pet."

Do not answer the unrelated question itself.

=========================================================
PETCARD FEATURE SAFETY
=========================================================

The following rule is extremely important:

Never invent or assume a PetCard feature.

For example, if the supplied PetCard information does not confirm
GPS tracking, live location tracking, automatic vet diagnosis,
insurance integration, or another feature, do not claim that
PetCard supports it.

If asked:

"Does PetCard have live GPS tracking?"

and there is no confirmed information about live GPS tracking,
say naturally:

"I don't have confirmed information that PetCard currently offers
live GPS tracking."

Do not make up an answer.

=========================================================
ANSWER STYLE
=========================================================

Make every answer:

- Natural
- Friendly
- Concise
- Easy to read
- Directly relevant to the user's question

Formatting:

- Use short paragraphs.
- Use bullet points when there are multiple points.
- Use numbered steps for instructions.
- Use **bold** for important terms when useful.
- Never create one huge paragraph for a list.
- Do not unnecessarily repeat the user's question.
- Do not mention internal sources.

For simple questions, give a simple answer.

For more detailed questions, explain the answer with useful points.

Give a complete answer.
Do not stop in the middle of a sentence, bullet point, or list.
If the answer is long, keep it concise but complete.
Never intentionally truncate the answer.

=========================================================
PETCARD KNOWLEDGE
=========================================================

${context}
`;

  const requestConfig = {
    systemInstruction,
    temperature: 0.5,
    maxOutputTokens: 1500,
  };

  /* =========================================================
     TRY PRIMARY MODEL
     ========================================================= */

  try {
    console.log(
      `PawChat: Trying primary model: ${PRIMARY_MODEL}`
    );

    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: question,
      config: requestConfig,
    });

    const answer = response.text?.trim();

    if (answer) {
      console.log(
        `PawChat: Response generated using ${PRIMARY_MODEL}`
      );

      return answer;
    }

    console.warn(
      `PawChat: ${PRIMARY_MODEL} returned an empty response.`
    );
  } catch (error) {
    console.error(
      `PawChat: Primary model ${PRIMARY_MODEL} failed.`,
      {
        status: error?.status,
        message: error?.message,
      }
    );

    /* =====================================================
       FALLBACK MODEL
       ===================================================== */

    console.log(
      `PawChat: Falling back to ${FALLBACK_MODEL}`
    );
  }

  /* =========================================================
     TRY FALLBACK MODEL
     ========================================================= */

  try {
    console.log(
      `PawChat: Trying fallback model: ${FALLBACK_MODEL}`
    );

    const response = await ai.models.generateContent({
      model: FALLBACK_MODEL,
      contents: question,
      config: requestConfig,
    });

    const answer = response.text?.trim();

    if (!answer) {
      throw new Error(
        "Fallback Gemini model returned an empty response."
      );
    }

    console.log(
      `PawChat: Response generated using ${FALLBACK_MODEL}`
    );

    return answer;
  } catch (error) {
    console.error(
      `PawChat: Fallback model ${FALLBACK_MODEL} also failed.`,
      {
        status: error?.status,
        message: error?.message,
      }
    );

    throw new Error(
      "PawChat AI is temporarily unavailable. Please try again in a moment."
    );
  }
};

module.exports = {
  generateChatbotResponse,
};