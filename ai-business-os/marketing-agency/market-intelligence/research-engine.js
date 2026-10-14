"use strict";

const RESEARCH_CATEGORIES = Object.freeze([
  "competitors",
  "market_trends",
  "pricing",
  "customer_demand",
  "creative_opportunities"
]);

function createMarketResearchReport({
  businessId,
  category,
  findings = [],
  sources = []
} = {}) {
  if (typeof businessId !== "string" || !businessId.trim()) {
    throw new Error("BUSINESS_ID_REQUIRED");
  }

  if (!RESEARCH_CATEGORIES.includes(category)) {
    throw new Error("INVALID_RESEARCH_CATEGORY");
  }

  if (!Array.isArray(findings) || !Array.isArray(sources)) {
    throw new Error("INVALID_RESEARCH_DATA");
  }

  return {
    business_id: businessId.trim(),
    category,
    status: "draft",
    findings,
    sources,
    verified: false,
    recommendations: [],
    created_at: new Date().toISOString()
  };
}

module.exports = {
  RESEARCH_CATEGORIES,
  createMarketResearchReport
};
