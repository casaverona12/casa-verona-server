"use strict";

const DEFAULT_SETTINGS = Object.freeze({
  brand_name: "Casa Verona",
  business_goal: "increase_profitable_sales",
  primary_channel: "whatsapp",
  advertising: {
    daily_budget_ils: 500,
    monthly_budget_limit_ils: 15000,
    target_cpl_ils: 50,
    target_conversion_rate: 0.10,
    target_monthly_sales: 100,
    preferred_formats: ["carousel", "video"]
  },
  brand_identity: {
    positioning: "premium_boutique_furniture",
    tone: "luxury_trustworthy",
    focus: [
      "premium_design",
      "personal_service",
      "pay_after_delivery"
    ]
  },
  automation: {
    research_enabled: false,
    campaign_creation_enabled: false,
    automatic_publishing: false,
    automatic_spending: false,
    human_approval_required: true
  },
  ai_budget: {
    monthly_limit_usd: 10,
    spending_enabled: false
  }
});

function createAgencySettings(overrides = {}) {
  if (
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides)
  ) {
    throw new Error("INVALID_AGENCY_SETTINGS");
  }

  const allowed = [
    "brand_name",
    "business_goal",
    "primary_channel",
    "advertising",
    "brand_identity",
    "automation",
    "ai_budget"
  ];

  if (Object.keys(overrides).some(key => !allowed.includes(key))) {
    throw new Error("UNKNOWN_AGENCY_SETTING");
  }

  const settings = structuredClone(DEFAULT_SETTINGS);

  for (const key of ["brand_name", "business_goal", "primary_channel"]) {
    if (overrides[key] !== undefined) {
      if (typeof overrides[key] !== "string" || !overrides[key].trim()) {
        throw new Error("INVALID_" + key.toUpperCase());
      }
      settings[key] = overrides[key].trim();
    }
  }

  for (const section of [
    "advertising",
    "brand_identity",
    "automation",
    "ai_budget"
  ]) {
    if (overrides[section] === undefined) continue;

    const value = overrides[section];

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("INVALID_" + section.toUpperCase());
    }

    if (Object.keys(value).some(
      key => !Object.hasOwn(settings[section], key)
    )) {
      throw new Error("UNKNOWN_" + section.toUpperCase() + "_SETTING");
    }

    Object.assign(settings[section], value);
  }

  const ad = settings.advertising;
  const ai = settings.ai_budget;

  for (const key of [
    "daily_budget_ils",
    "monthly_budget_limit_ils",
    "target_cpl_ils",
    "target_conversion_rate"
  ]) {
    if (
      typeof ad[key] !== "number" ||
      !Number.isFinite(ad[key]) ||
      ad[key] <= 0
    ) {
      throw new Error("INVALID_ADVERTISING_" + key.toUpperCase());
    }
  }

  if (
    ad.daily_budget_ils > ad.monthly_budget_limit_ils ||
    ad.target_conversion_rate > 1 ||
    !Number.isSafeInteger(ad.target_monthly_sales) ||
    ad.target_monthly_sales < 1
  ) {
    throw new Error("INVALID_ADVERTISING_LIMITS");
  }

  if (
    !Array.isArray(ad.preferred_formats) ||
    ad.preferred_formats.length === 0 ||
    !ad.preferred_formats.every(
      format => ["carousel", "video"].includes(format)
    )
  ) {
    throw new Error("INVALID_ADVERTISING_FORMATS");
  }

  if (
    typeof ai.monthly_limit_usd !== "number" ||
    !Number.isFinite(ai.monthly_limit_usd) ||
    ai.monthly_limit_usd <= 0 ||
    ai.monthly_limit_usd > 10
  ) {
    throw new Error("INVALID_AI_BUDGET_LIMIT");
  }

  // Hard safety locks: configuration alone cannot authorize spending.
  settings.automation.automatic_publishing = false;
  settings.automation.automatic_spending = false;
  settings.automation.human_approval_required = true;
  settings.ai_budget.spending_enabled = false;

  return {
    ...settings,
    status: "draft",
    requires_approval: true
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  createAgencySettings
};
