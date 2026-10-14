const crypto = require("crypto");

function createRenderFromDetailedDesign(design = {}) {
  if (!design.model_name || !design.signature_feature) {
    return {
      success: false,
      reason: "DETAILED_DESIGN_REQUIRED"
    };
  }

  const renderId = "render_" + crypto.randomUUID();

  const dimensions = design.proposed_dimensions_cm || {};
  const render = design.render_direction || {};
  const signature = design.signature_feature || {};
  const architecture = design.architecture || {};
  const materials = design.materials || {};
  const functional = design.functional_feature || {};

  const prompt = [
    `Create a photorealistic luxury furniture product render of an ORIGINAL ${design.category || "furniture"} concept named "${design.model_name}".`,

    `DESIGN STORY: ${design.design_story}`,

    `SIGNATURE FEATURE — this MUST be clearly visible and architecturally accurate: ${signature.name}. ${signature.description}`,

    `CONFIGURATION: ${architecture.configuration}`,
    `SILHOUETTE: ${architecture.silhouette}`,
    `BASE: ${architecture.base}`,
    `ARMS: ${architecture.arms}`,
    `BACKREST: ${architecture.backrest}`,

    `PRIMARY MATERIAL: ${materials.primary}`,
    `SECONDARY MATERIAL: ${materials.secondary}`,
    `ACCENT MATERIAL: ${materials.accent}`,
    `MATERIAL CONTRAST: ${materials.material_contrast}`,

    `FUNCTIONAL FEATURE: ${functional.feature}. ${functional.customer_value}`,

    dimensions.width
      ? `CONCEPT PROPORTIONS: approximately ${dimensions.width}cm wide, ${dimensions.depth}cm deep, ${dimensions.height}cm overall height, seat height approximately ${dimensions.seat_height}cm.`
      : "",

    `CAMERA: ${render.hero_angle}`,
    `CRITICAL DETAIL: ${render.important_detail}`,
    `ENVIRONMENT: ${render.environment}`,
    `PRIMARY COLOR: ${render.primary_color}`,

    "The signature feature must dominate the product identity.",
    "Clearly show the transitions between upholstery, wood and hard-surface materials.",
    "Keep the furniture physically believable and potentially manufacturable.",
    "Do not simplify the design into a generic sofa.",
    "Do not replace the integrated architectural feature with a separate side table.",
    "Premium international furniture campaign photography.",
    "Original design only. Do not reproduce a specific existing product.",
    "No people. No text. No logos."
  ]
    .filter(Boolean)
    .join("\n");

  return {
    success: true,

    job: {
      render_id: renderId,
      model_name: design.model_name,
      type: "DETAILED_PRODUCT_RENDER",
      prompt,
      requested_views: ["HERO"],
      status: "READY_FOR_PROVIDER",
      provider: null,
      images: []
    },

    generated_at: new Date().toISOString()
  };
}

module.exports = {
  createRenderFromDetailedDesign
};
