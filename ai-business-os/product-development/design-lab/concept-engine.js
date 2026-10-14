"use strict";

const { PRODUCT_CATEGORIES } = require("./design-director");

const DESIGN_PRINCIPLES = Object.freeze([
  "Develop distinctive, original furniture concepts.",
  "Avoid copying recognizable existing products.",
  "Explore innovative silhouettes, proportions and materials.",
  "Balance visual impact with everyday comfort and usability.",
  "Consider realistic furniture manufacturing methods.",
  "Create a coherent Casa Verona design identity.",
  "Do not claim a concept is structurally safe or production-ready."
]);

const CREATIVE_DIRECTIONS = Object.freeze([
  {
    id: "sculptural",
    name: "Sculptural Signature",
    focus: "Expressive shapes, architectural forms and bold proportions."
  },
  {
    id: "modular",
    name: "Modular Innovation",
    focus: "Unusual configurations, adaptable modules and functional details."
  },
  {
    id: "material",
    name: "Material Exploration",
    focus: "Distinctive textures, refined material combinations and craftsmanship."
  }
]);

function createConceptAssignment(brief) {
  if (!brief || typeof brief !== "object") {
    throw new Error("Design brief is required");
  }

  if (
    typeof brief.business_id !== "string" ||
    !brief.business_id.trim() ||
    !PRODUCT_CATEGORIES.includes(brief.category) ||
    typeof brief.collection_name !== "string" ||
    !brief.collection_name.trim()
  ) {
    throw new Error("Invalid design brief");
  }

  return {
    business_id: brief.business_id,
    collection_name: brief.collection_name,
    category: brief.category,
    status: "awaiting_ai_generation",
    principles: [...DESIGN_PRINCIPLES],
    assignments: CREATIVE_DIRECTIONS.map(direction => ({
      direction_id: direction.id,
      direction_name: direction.name,
      creative_focus: direction.focus,
      deliverables: [
        "original_product_name",
        "design_story",
        "visual_description",
        "distinctive_features",
        "suggested_materials",
        "suggested_dimensions",
        "manufacturing_questions",
        "potential_risks",
        "visualization_brief"
      ],
      status: "pending"
    })),
    research_verified: false,
    originality_verified: false,
    engineering_verified: false,
    requires_human_approval: true,
    production_allowed: false
  };
}

module.exports = {
  DESIGN_PRINCIPLES,
  CREATIVE_DIRECTIONS,
  createConceptAssignment
};
