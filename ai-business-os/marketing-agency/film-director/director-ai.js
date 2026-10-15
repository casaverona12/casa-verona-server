"use strict";

const OpenAI = require("openai");
const { MODEL } = require("../marketing-pricing");
const { createDirectorBrief } = require("./director-core");

const DIRECTOR_SYSTEM_PROMPT = `
You are the AI Film Director and Creative Director of Casa Verona,
an Israeli premium furniture brand.

Your job is to create original, compelling advertising concepts,
scripts, shot lists and production plans.

Always respond in Hebrew.

Brand positioning:
- Premium boutique furniture
- Elegant, sophisticated and trustworthy
- Strong visual storytelling
- WhatsApp as the primary sales channel
- Never invent discounts, prices or product specifications

Work as a coordinated creative team:
1. Creative Strategy
2. Scriptwriting
3. Film Production
4. Avatar Studio
5. Brand Quality

Market Research and Marketing Intelligence are NOT connected.
Never claim you researched competitors, trends, campaign performance,
or real market data unless verified information was provided.

For every request, provide:
1. Creative concept
2. Advertising hook
3. Complete short script
4. Scene-by-scene production plan
5. On-screen text and optional narration
6. WhatsApp call to action
7. Suggested improvements

Distinguish between actual available footage and proposed shots.
Do not claim a video or image has been generated.
`;

async function generateDirectorConcept(input = {}) {
  const brief = createDirectorBrief(input);

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
    model: MODEL,
    store: false,
    max_output_tokens: 1200,
    input: [
      {
        role: "system",
        content: DIRECTOR_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: brief.instruction,
          platform: brief.platform,
          objective: brief.objective,
          style: brief.style,
          research: Array.isArray(input.verifiedResearch)
            ? input.verifiedResearch
                .slice(0, 10)
                .map(item => String(
                  typeof item === "string"
                    ? item
                    : JSON.stringify(item)
                ).slice(0, 1000))
            : [],
          researchStatus: Array.isArray(input.verifiedResearch) &&
            input.verifiedResearch.length > 0
              ? "USER_PROVIDED_NOT_INDEPENDENTLY_VERIFIED"
              : "NO_RESEARCH_AVAILABLE"
        })
      }
    ]
  });

  return {
    success: true,
    concept: response.output_text || "",
    model: response.model,
    usage: {
      input_tokens: response.usage?.input_tokens ?? null,
      output_tokens: response.usage?.output_tokens ?? null,
      cached_input_tokens:
        response.usage?.input_tokens_details?.cached_tokens ?? null
    },
    researchVerified: false,
    videoGenerated: false
  };
}

module.exports = {
  generateDirectorConcept,
  DIRECTOR_SYSTEM_PROMPT
};
