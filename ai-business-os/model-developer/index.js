const config = require("./config");

function createModelConcept(input = {}) {
  const {
    trend = "Unknown Trend",
    trendScore = 0,
    category = "sofas",
    market = "Israel",
    signals = [],
    preferredStyle = "premium contemporary"
  } = input;

  const priority =
    trendScore >= 85 ? "HIGH" :
    trendScore >= 70 ? "MEDIUM" :
    "LOW";

  return {
    department: "AI_MODEL_DEVELOPER",

    concept: {
      category,
      market,
      style: preferredStyle,

      design_direction:
        `Create an original ${category} concept inspired by the underlying direction "${trend}", without copying any specific existing product.`,

      differentiation: [
        "distinctive silhouette",
        "commercially practical configuration",
        "recognizable visual identity",
        "adaptable materials and colors"
      ]
    },

    research: {
      trend,
      trend_score: trendScore,
      priority,
      supporting_signals: signals
    },

    development_brief: {
      define_dimensions: true,
      define_materials: true,
      define_colorways: true,
      define_modules: true,
      evaluate_production_complexity: true,
      estimate_market_position: true
    },

    visualization_brief: {
      create_hero_render: true,
      create_front_view: true,
      create_angle_view: true,
      create_lifestyle_scene: true,
      create_detail_view: true
    },

    marketing_brief: {
      create_model_name: true,
      create_story: true,
      create_launch_hook: true,
      create_reels_concept: true,
      create_campaign_angle: true
    },

    owner_decision: [
      "APPROVE_FOR_DESIGN",
      "REVISE",
      "REJECT"
    ],

    generated_at: new Date().toISOString()
  };
}

module.exports = {
  config,
  createModelConcept
};
