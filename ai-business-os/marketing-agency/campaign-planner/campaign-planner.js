"use strict";

const {
  calculateCampaignGoals
} = require("./campaign-goals");

const FORMATS = Object.freeze(["carousel", "video"]);

const OBJECTIVES = Object.freeze([
  "whatsapp_leads",
  "brand_awareness",
  "retargeting"
]);

function createCampaignPlan(config = {}) {
  const {
    businessId,
    name,
    objective = "whatsapp_leads",
    dailyBudgetIls,
    goals = null,
    audience = {},
    formats = ["carousel", "video"]
  } = config;

  if (typeof businessId !== "string" || !businessId.trim()) {
    throw new Error("BUSINESS_ID_REQUIRED");
  }

  if (typeof name !== "string" || !name.trim()) {
    throw new Error("CAMPAIGN_NAME_REQUIRED");
  }

  if (!OBJECTIVES.includes(objective)) {
    throw new Error("INVALID_CAMPAIGN_OBJECTIVE");
  }

  if (
    typeof dailyBudgetIls !== "number" ||
    !Number.isFinite(dailyBudgetIls) ||
    dailyBudgetIls <= 0 ||
    dailyBudgetIls > 100000
  ) {
    throw new Error("INVALID_CAMPAIGN_BUDGET");
  }

  if (
    !audience ||
    typeof audience !== "object" ||
    Array.isArray(audience)
  ) {
    throw new Error("INVALID_CAMPAIGN_AUDIENCE");
  }

  if (
    !Array.isArray(formats) ||
    formats.length === 0 ||
    !formats.every(format => FORMATS.includes(format))
  ) {
    throw new Error("INVALID_CAMPAIGN_FORMATS");
  }

  const forecast = goals === null
    ? null
    : calculateCampaignGoals({
        dailyBudgetIls,
        ...goals,
        dailyBudgetIls
      });

  return {
    business_id: businessId.trim(),
    name: name.trim(),
    objective,
    daily_budget_ils: dailyBudgetIls,
    forecast,
    audience,
    formats: [...new Set(formats)],
    status: "draft",
    approved: false,
    publishing_allowed: false,
    spending_allowed: false,
    created_at: new Date().toISOString()
  };
}

module.exports = {
  FORMATS,
  OBJECTIVES,
  createCampaignPlan
};
