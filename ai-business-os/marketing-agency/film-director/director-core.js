"use strict";

const DEPARTMENTS = Object.freeze([
  {
    id: "MARKET_RESEARCH",
    name: "Market Research",
    responsibility: "Audience, competitors and trends"
  },
  {
    id: "MARKETING_INTELLIGENCE",
    name: "Marketing Intelligence",
    responsibility: "Campaign performance and conversion insights"
  },
  {
    id: "CREATIVE_STRATEGY",
    name: "Creative Strategy",
    responsibility: "Offer, positioning and advertising angle"
  },
  {
    id: "SCRIPTWRITING",
    name: "Scriptwriting",
    responsibility: "Hook, script and call to action"
  },
  {
    id: "FILM_PRODUCTION",
    name: "Film Production",
    responsibility: "Scenes, editing and production instructions"
  },
  {
    id: "AVATAR_STUDIO",
    name: "Avatar Studio",
    responsibility: "Presenter, voice and narration"
  },
  {
    id: "BRAND_QUALITY",
    name: "Brand Quality",
    responsibility: "Brand consistency and final review"
  }
]);

function createDirectorBrief(input = {}) {
  const instruction = String(input.instruction || "").trim();

  if (!instruction || instruction.length > 3000) {
    throw new Error("INVALID_DIRECTOR_INSTRUCTION");
  }

  const allowedPlatforms = [
    "instagram",
    "facebook",
    "tiktok",
    "all"
  ];

  const platform = allowedPlatforms.includes(input.platform)
    ? input.platform
    : "all";

  return {
    version: 1,
    brand: "Casa Verona",
    instruction,
    platform,
    objective: String(input.objective || "whatsapp_leads").slice(0, 100),
    style: String(input.style || "premium_cinematic").slice(0, 100),
    departments: DEPARTMENTS.map(department => ({
      ...department,
      status: "NOT_CONNECTED"
    })),
    research: {
      status: "NOT_STARTED",
      verifiedSources: []
    },
    production: {
      status: "PLANNING",
      requiresApproval: true
    },
    budget: {
      paidAIEnabled: false,
      estimatedCost: null,
      approvalRequired: true
    }
  };
}

module.exports = {
  DEPARTMENTS,
  createDirectorBrief
};
