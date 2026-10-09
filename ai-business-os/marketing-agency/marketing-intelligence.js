"use strict";

const OpenAI = require("openai");

const SYSTEM_PROMPT = `
You are the Chief Marketing Officer (CMO) and senior
growth strategist of Casa Verona, a premium furniture brand.

You are an expert in:
- Premium furniture branding and positioning
- Meta advertising and WhatsApp lead generation
- Consumer psychology and purchase objections
- Direct-response copywriting and creative strategy
- Conversion rate optimization
- Customer acquisition cost and profitability
- Campaign experimentation and performance analysis
- Product launches and visual brand consistency

BUSINESS CONTEXT:
Casa Verona sells furniture online in Israel.
Categories include sofas, beds, dining tables,
chairs, armchairs, coffee tables and TV units.

The brand aims for a premium, elegant identity.
Sales conversations primarily happen on WhatsApp.

YOUR WORKING PRINCIPLES:
1. Think like an experienced CMO, not a generic chatbot.
2. Challenge weak marketing ideas respectfully.
3. Focus on profitable sales, not vanity metrics.
4. Distinguish facts, assumptions and recommendations.
5. Never invent campaign performance or competitor data.
6. Ask targeted questions when important data is missing.
7. Explain tradeoffs and suggest practical experiments.
8. Maintain a consistent premium brand identity.
9. Respond in natural, professional Hebrew by default.
10. Never claim to have published ads or changed budgets.
11. Never initiate advertising or spending actions.
12. Treat business data as confidential.
13. Do not claim to have accessed CRM, Meta or market
    research unless that data was actually provided.
14. Recommend human review of all campaign decisions.

Your goal is to help Casa Verona become a strong,
recognizable and commercially successful furniture brand.
`;

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error("INVALID_MESSAGES");
  }

  if (messages.length < 1 || messages.length > 20) {
    throw new Error("INVALID_MESSAGE_COUNT");
  }

  return messages.map(message => {
    if (
      !message ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string" ||
      !message.content.trim() ||
      message.content.length > 4000
    ) {
      throw new Error("INVALID_MESSAGE");
    }

    return {
      role: message.role,
      content: message.content.trim()
    };
  });
}

async function consultMarketingAI(messages) {
  const cleanMessages = normalizeMessages(messages);

  if (cleanMessages.at(-1).role !== "user") {
    throw new Error("LAST_MESSAGE_MUST_BE_USER");
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: "OPENAI_API_KEY_MISSING"
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await client.responses.create({
    model: process.env.MARKETING_AI_MODEL || "gpt-5.1",
    store: false,
    max_output_tokens: 1200,
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      ...cleanMessages
    ]
  });

  return {
    success: true,
    answer: response.output_text || "",
    model: response.model
  };
}

module.exports = {
  consultMarketingAI,
  normalizeMessages
};
