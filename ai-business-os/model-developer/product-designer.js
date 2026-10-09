function designProduct(input = {}) {
  const {
    category = "sofas",
    trend = "contemporary furniture",
    market = "Israel",
    style = "luxury contemporary",
    trendScore = 0,
    trendSignals = []
  } = input;

  return {
    product_design: {
      category,
      market,
      style,

      concept: {
        inspiration: trend,
        trend_score: trendScore,
        trend_signals: trendSignals,

        positioning:
          "distinctive high-end designer furniture",

        design_goal:
          "Create a memorable original furniture model with a recognizable signature feature, not a generic luxury product.",

        originality_rule:
          "Learn from current design directions but never reproduce a specific existing product."
      },

      signature_design: {
        signature_feature_required: true,

        explore_options: [
          "wooden plinth or architectural base",
          "exposed wood structure",
          "sculptural wooden arm detail",
          "integrated side tray",
          "integrated side table",
          "table between modules",
          "open-end seating module",
          "floating module",
          "mixed wood and upholstery construction",
          "metal and upholstery combination",
          "stone or ceramic accent surface",
          "unusual backrest architecture",
          "adjustable backrest concept",
          "asymmetric composition",
          "layered frame construction",
          "unexpected module connection"
        ],

        rule:
          "Select only the features that strengthen the concept. Do not add wood, trays or accessories unless they create a coherent premium design."
      },

      architecture: {
        configuration:
          "TO_BE_DECIDED_FROM_TREND_AND_CONCEPT",

        module_count:
          "TO_BE_DECIDED",

        silhouette:
          "TO_BE_DESIGNED",

        base:
          "TO_BE_DESIGNED",

        arms:
          "TO_BE_DESIGNED",

        back:
          "TO_BE_DESIGNED"
      },

      innovation: {
        signature_feature:
          "REQUIRED",

        material_innovation:
          "REQUIRED",

        functional_feature:
          "REQUIRED",

        why_it_is_different:
          "REQUIRED"
      },

      materials: {
        explore: [
          "solid wood",
          "wood veneer",
          "premium upholstery",
          "boucle",
          "textured woven fabric",
          "leather accents",
          "brushed metal",
          "stone",
          "ceramic"
        ],

        rule:
          "Use material combinations intentionally and keep the product manufacturable."
      },

      commercial_direction: {
        positioning:
          "premium statement furniture",

        requirement:
          "The product must have an immediately visible reason for a customer to remember it.",

        market_fit:
          "Balance international luxury design language with commercial relevance for the Israeli market."
      },

      render_rules: [
        "Do not generate a generic beige sofa.",
        "The signature feature must be clearly visible.",
        "Show material contrast clearly.",
        "Keep believable furniture construction.",
        "Create a product that could become a recognizable collection.",
        "Avoid unnecessary decorative elements.",
        "Original design only."
      ]
    },

    status: "DESIGN_DIRECTION_READY",

    next_stage:
      "AI_DETAILED_DESIGN_DECISION",

    generated_at:
      new Date().toISOString()
  };
}

module.exports = {
  designProduct
};
