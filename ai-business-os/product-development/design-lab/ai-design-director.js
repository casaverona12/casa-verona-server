"use strict";

const { createConceptAssignment } = require("./concept-engine");

const REQUIRED_FIELDS = Object.freeze([
  "name",
  "design_story",
  "visual_description",
  "distinctive_features",
  "suggested_materials",
  "suggested_dimensions",
  "manufacturing_questions",
  "potential_risks",
  "visualization_brief"
]);

function buildDesignPrompt(brief) {
  const assignment = createConceptAssignment(brief);

  const directions = assignment.assignments.map((item, index) =>
    `${index + 1}. ${item.direction_name}: ${item.creative_focus}`
  ).join("\n");

  return {
    business_id: brief.business_id,
    category: brief.category,
    collection_name: brief.collection_name,
    status: "ready_for_ai_request",
    system_instruction: [
      "You are the lead furniture designer for Casa Verona.",
      "Develop original, distinctive, premium furniture concepts.",
      "Think like an international furniture design studio.",
      "Avoid generic designs and recognizable copies.",
      "Prioritize remarkable silhouettes, refined materials and usable products.",
      "Treat all dimensions and manufacturing assumptions as preliminary.",
      "Never claim engineering safety, originality or production feasibility has been verified.",
      "Return valid JSON only."
    ].join(" "),
    user_instruction: [
      `Collection: ${brief.collection_name}`,
      `Category: ${brief.category}`,
      `Target market: ${brief.target_market || "israel"}`,
      "Create exactly three genuinely different furniture concepts.",
      "Creative directions:",
      directions,
      "For each concept return these fields:",
      REQUIRED_FIELDS.join(", "),
      "Use arrays for distinctive_features, suggested_materials, manufacturing_questions and potential_risks.",
      "Return a JSON object containing a concepts array.",
      "Each concept must have a direction_id matching its assigned direction.",
      "Do not invent verified market research or manufacturing approval."
    ].join("\n\n"),
    expected_directions: assignment.assignments.map(item => item.direction_id),
    requires_human_approval: true,
    production_allowed: false
  };
}

function validateConceptResponse(response, expectedDirections) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error("Invalid AI response");
  }

  if (!Array.isArray(expectedDirections) || expectedDirections.length !== 3) {
    throw new Error("Expected directions are required");
  }

  if (!Array.isArray(response.concepts) || response.concepts.length !== 3) {
    throw new Error("Exactly three concepts are required");
  }

  const actualDirections = [];

  for (const concept of response.concepts) {
    if (!concept || typeof concept !== "object" || Array.isArray(concept)) {
      throw new Error("Invalid concept");
    }

    if (typeof concept.direction_id !== "string") {
      throw new Error("Missing direction_id");
    }

    for (const field of REQUIRED_FIELDS) {
      const value = concept[field];

      if (
        value == null ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value !== "string" && !Array.isArray(value))
      ) {
        throw new Error(`Invalid concept field: ${field}`);
      }
    }

    actualDirections.push(concept.direction_id);
  }

  if (
    new Set(actualDirections).size !== 3 ||
    actualDirections.some(id => !expectedDirections.includes(id))
  ) {
    throw new Error("Concept directions do not match assignment");
  }

  return {
    concepts: response.concepts,
    status: "pending_design_review",
    originality_verified: false,
    engineering_verified: false,
    requires_human_approval: true,
    production_allowed: false
  };
}

module.exports = {
  REQUIRED_FIELDS,
  buildDesignPrompt,
  validateConceptResponse
};
