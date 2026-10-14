"use strict";

const CREATIVE_FORMATS = Object.freeze([
  "carousel",
  "video"
]);

function generateCreativeRecommendations(research = {}) {
  const opportunities =
    research?.brand_positioning?.opportunities;

  if (!Array.isArray(opportunities)) {
    throw new Error("INVALID_CREATIVE_RESEARCH");
  }

  const recommendations = [];

  for (const opportunity of opportunities) {
    if (
      !opportunity ||
      typeof opportunity.id !== "string" ||
      typeof opportunity.title !== "string"
    ) {
      throw new Error("INVALID_BRAND_OPPORTUNITY");
    }

    for (const format of CREATIVE_FORMATS) {
      recommendations.push({
        format,
        advantage_id: opportunity.id,
        headline: opportunity.title,
        objective: "increase_qualified_leads",
        channel: "meta_ads",
        concept:
          format === "carousel"
            ? "להציג את יתרון המותג בסדרת שקופיות"
            : "להציג את יתרון המותג בסרטון קצר",
        research_verified: false,
        status: "draft",
        requires_approval: true,
        approved: false
      });
    }
  }

  return {
    brand: "Casa Verona",
    status: "draft",
    recommendations,
    publishing_allowed: false,
    created_at: new Date().toISOString()
  };
}

module.exports = {
  CREATIVE_FORMATS,
  generateCreativeRecommendations
};
