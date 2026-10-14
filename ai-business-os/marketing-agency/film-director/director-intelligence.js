"use strict";

const { createDirectorBrief } = require("./director-core");

function createProductionPlan(input = {}) {
  const brief = createDirectorBrief(input);

  const tasks = [
    {
      department: "MARKET_RESEARCH",
      task: "Research audience, competitors and trends",
      status: "PENDING",
      requiresExternalData: true
    },
    {
      department: "MARKETING_INTELLIGENCE",
      task: "Analyze available campaign and conversion data",
      status: "PENDING",
      requiresExternalData: true
    },
    {
      department: "CREATIVE_STRATEGY",
      task: "Develop the advertising angle and positioning",
      status: "READY_FOR_AI"
    },
    {
      department: "SCRIPTWRITING",
      task: "Create a hook, script and WhatsApp call to action",
      status: "READY_FOR_AI"
    },
    {
      department: "FILM_PRODUCTION",
      task: "Prepare scenes and editing instructions",
      status: "READY_FOR_AI"
    },
    {
      department: "AVATAR_STUDIO",
      task: "Determine whether a digital presenter is needed",
      status: "NOT_CONNECTED"
    },
    {
      department: "BRAND_QUALITY",
      task: "Review consistency with Casa Verona branding",
      status: "PENDING"
    }
  ];

  return {
    success: true,
    version: 1,
    brief,
    tasks,
    director: {
      status: "AWAITING_AI_CONNECTION",
      nextAction: "CONNECT_APPROVED_AI_PROVIDER"
    },
    safeguards: {
      externalResearchVerified: false,
      campaignDataConnected: false,
      paidGenerationAuthorized: false,
      videoGenerationStarted: false
    }
  };
}

module.exports = { createProductionPlan };
