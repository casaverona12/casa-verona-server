function buildImagePrompt(render = {}, designedProduct = {}) {
  const brief = render.render_brief || {};
  const design = designedProduct.product_design || {};

  const architecture = design.architecture || {};
  const proportions = design.proportions || {};
  const visual = design.visual_language || {};
  const materials = design.material_direction || {};

  const modules = Array.isArray(architecture.modules)
    ? architecture.modules
        .map(m =>
          `${m.position} ${m.type} approximately ${m.width_cm}cm wide`
        )
        .join("; ")
    : "";

  const colors = Array.isArray(materials.suggested_colors)
    ? materials.suggested_colors.join(", ")
    : "";

  return [
    "Create a photorealistic original premium furniture concept.",

    `Product category: ${design.category || brief.category || "furniture"}.`,
    `Target market: ${design.market || brief.market || "Global"}.`,
    `Design style: ${design.style || brief.style || "premium contemporary"}.`,

    `Architecture: ${architecture.type || ""}, ${architecture.configuration || ""}, silhouette ${architecture.silhouette || ""}.`,

    modules
      ? `Module composition: ${modules}.`
      : "",

    proportions.total_width_cm
      ? `Approximate overall dimensions: ${proportions.total_width_cm}cm wide, ${proportions.total_depth_cm}cm deep, ${proportions.total_height_cm}cm high. Seat height approximately ${proportions.seat_height_cm}cm.`
      : "",

    visual.seat
      ? `Seat design: ${visual.seat}.`
      : "",

    visual.back
      ? `Back design: ${visual.back}.`
      : "",

    visual.arms
      ? `Arm design: ${visual.arms}.`
      : "",

    visual.corners
      ? `Corner treatment: ${visual.corners}.`
      : "",

    visual.base
      ? `Base: ${visual.base}.`
      : "",

    visual.seams
      ? `Upholstery detailing: ${visual.seams}.`
      : "",

    materials.upholstery
      ? `Upholstery: ${materials.upholstery}.`
      : "",

    colors
      ? `Primary concept color: ${materials.suggested_colors[0]}. Alternative palette: ${colors}.`
      : "",

    "Keep the module divisions visually understandable.",
    "Use realistic furniture proportions and believable upholstery construction.",
    "Premium neutral studio environment.",
    "High-end furniture campaign photography.",
    "Original design only; do not reproduce a specific existing furniture product.",
    "No people, no text, no logos."
  ]
    .filter(Boolean)
    .join(" ");
}

function prepareRenderJob(render = {}, designedProduct = {}) {
  if (
    !render.render_id ||
    render.status !== "READY_FOR_IMAGE_GENERATION"
  ) {
    return {
      success: false,
      reason: "VALID_RENDER_BRIEF_REQUIRED"
    };
  }

  return {
    success: true,

    job: {
      render_id: render.render_id,

      type: "PRODUCT_CONCEPT_RENDER",

      prompt:
        buildImagePrompt(render, designedProduct),

      requested_views: [
        "HERO",
        "FRONT",
        "ANGLE"
      ],

      status: "READY_FOR_PROVIDER",

      provider: null,

      images: []
    },

    generated_at:
      new Date().toISOString()
  };
}

module.exports = {
  buildImagePrompt,
  prepareRenderJob
};
