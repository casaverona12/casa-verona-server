const crypto = require("crypto");

function createRenderBrief(model = {}) {
  if (!model.concept) {
    return {
      success: false,
      reason: "MODEL_CONCEPT_REQUIRED"
    };
  }

  const renderId =
    "render_" + crypto.randomUUID();

  const product =
    model.concept.concept || {};

  const research =
    model.concept.research || {};

  return {
    success: true,

    render_id: renderId,

    status: "READY_FOR_IMAGE_GENERATION",

    render_brief: {
      category:
        product.category || "furniture",

      market:
        product.market || "Global",

      style:
        product.style || "premium contemporary",

      design_direction:
        product.design_direction || "",

      supporting_signals:
        research.supporting_signals || [],

      requirements: [
        "original furniture design",
        "commercially realistic proportions",
        "manufacturable appearance",
        "clear product silhouette",
        "premium presentation",
        "no direct copy of an existing product"
      ],

      views: {
        hero: true,
        front: true,
        angle: true,
        side: true,
        lifestyle: true,
        detail: true
      },

      background: {
        hero: "premium neutral studio",
        technical_views: "clean neutral background"
      }
    },

    approval: {
      owner_approved: false,
      approved_render_id: null
    },

    generated_at:
      new Date().toISOString()
  };
}

function approveRender(render = {}) {
  if (
    !render.render_id ||
    render.status !== "RENDERED"
  ) {
    return {
      success: false,
      reason: "COMPLETED_RENDER_REQUIRED"
    };
  }

  return {
    ...render,

    status: "OWNER_APPROVED",

    approval: {
      owner_approved: true,
      approved_render_id:
        render.render_id
    },

    approved_at:
      new Date().toISOString()
  };
}

module.exports = {
  createRenderBrief,
  approveRender
};
