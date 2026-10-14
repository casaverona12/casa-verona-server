"use strict";

const DEPARTMENTS = Object.freeze({
  TREND_RESEARCH: "trend_research",
  CREATIVE_DESIGN: "creative_design",
  PRODUCT_VISUALIZATION: "product_visualization",
  ENGINEERING: "engineering",
  COMMERCIAL_ANALYSIS: "commercial_analysis",
  QUALITY_CONTROL: "quality_control"
});

const PRODUCT_CATEGORIES = Object.freeze([
  "sofas",
  "beds",
  "armchairs",
  "coffee_tables",
  "dining_tables",
  "tv_units"
]);

function createDesignBrief({
  businessId,
  category,
  collectionName,
  designDirection = "original_premium",
  targetMarket = "israel"
}) {
  if (typeof businessId !== "string" || !businessId.trim()) {
    throw new Error("businessId is required");
  }

  if (!PRODUCT_CATEGORIES.includes(category)) {
    throw new Error("Unsupported product category");
  }

  if (typeof collectionName !== "string" || !collectionName.trim()) {
    throw new Error("collectionName is required");
  }

  return {
    business_id: businessId.trim(),
    collection_name: collectionName.trim(),
    category,
    design_direction: designDirection,
    target_market: targetMarket,

    departments: Object.values(DEPARTMENTS),

    workflow: [
      "research_trends",
      "generate_original_concepts",
      "review_designs",
      "prepare_visualizations",
      "assess_manufacturability",
      "estimate_commercial_potential",
      "quality_review",
      "request_owner_approval"
    ],

    status: "draft",
    concepts: [],
    approved: false,
    manufacturing_approved: false,
    publishing_allowed: false,
    production_allowed: false,
    requires_human_approval: true
  };
}

module.exports = {
  DEPARTMENTS,
  PRODUCT_CATEGORIES,
  createDesignBrief
};
