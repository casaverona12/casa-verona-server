const crypto = require("crypto");

function createFrameVisualizationJob(model = {}) {

  if (
    model.status !== "APPROVED_FOR_PROTOTYPE" &&
    model.status !== "OWNER_APPROVED"
  ) {
    return {
      success: false,
      reason: "OWNER_APPROVAL_REQUIRED"
    };
  }

  const spec =
    model.factory_pack ||
    model.production_spec ||
    {};

  const dimensions =
    spec.overall_dimensions ||
    spec.proposed_dimensions_cm ||
    {};

  const frame =
    spec.frame || {};

  const modules =
    Array.isArray(spec.modules)
      ? spec.modules
      : [];

  const renderId =
    "frame_" + crypto.randomUUID();

  const prompt = [
    "Create a clear technical concept visualization of the internal wooden furniture frame.",

    `Model: ${model.model_name || model.modelName || "Unnamed Model"}.`,
    `Category: ${model.category || "sofa"}.`,

    dimensions.width_cm || dimensions.width
      ? `Overall concept width: ${dimensions.width_cm || dimensions.width} cm.`
      : "",

    dimensions.depth_cm || dimensions.depth
      ? `Overall concept depth: ${dimensions.depth_cm || dimensions.depth} cm.`
      : "",

    dimensions.total_height_cm || dimensions.height
      ? `Overall concept height: ${dimensions.total_height_cm || dimensions.height} cm.`
      : "",

    frame.construction
      ? `Frame construction direction: ${frame.construction}.`
      : "",

    modules.length
      ? `The product contains ${modules.length} structural modules.`
      : "",

    "Show ONLY the structural furniture frame.",
    "Remove upholstery fabric, cushions and foam.",
    "Show believable timber rails, structural panels and support members.",
    "Clearly communicate how the major volumes could be constructed.",
    "Use an exploded-view-inspired technical presentation.",
    "Neutral clean background.",
    "Three-quarter technical perspective.",
    "No people.",
    "No decorative room environment.",
    "No branding.",

    "IMPORTANT: This is a concept-stage visualization for factory development only.",
    "Do not present guessed joinery, reinforcement, thicknesses or cut dimensions as engineering-approved facts."
  ]
    .filter(Boolean)
    .join("\n");

  return {
    success: true,

    job: {
      render_id: renderId,
      type: "FACTORY_FRAME_CONCEPT",
      prompt,
      requested_views: [
        "FRAME_3D",
        "FRONT",
        "SIDE",
        "TOP",
        "EXPLODED"
      ],
      status: "READY_FOR_PROVIDER",
      provider: null,
      images: []
    },

    verification: {
      prototype_required: true,
      carpenter_verification_required: true,
      engineering_verified: false,
      factory_verified: false,
      approved_for_cutting: false
    },

    generated_at:
      new Date().toISOString()
  };
}

module.exports = {
  createFrameVisualizationJob
};
