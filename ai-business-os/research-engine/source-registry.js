module.exports = {
  sources: {

    visualDiscovery: [
      {
        name: "Pinterest",
        type: "visual_discovery",
        focus: [
          "furniture_trends",
          "luxury_interiors",
          "sofa_design",
          "materials",
          "colors",
          "shapes",
          "viral_visual_styles"
        ],
        weight: 90
      }
    ],

    socialMedia: [
      {
        name: "Instagram",
        type: "public_social_content",
        focus: [
          "global_furniture_brands",
          "israeli_furniture_brands",
          "interior_design_accounts",
          "reels",
          "content_formats",
          "product_presentation",
          "feed_design",
          "visual_identity",
          "engagement_signals"
        ],
        weight: 90
      }
    ],

    luxuryFurnitureBrands: [
      "Minotti",
      "B&B Italia",
      "Poliform",
      "Flexform",
      "Cassina",
      "Edra",
      "Roche Bobois",
      "Ligne Roset",
      "Poltrona Frau",
      "Natuzzi"
    ],

    designMedia: [
      "ELLE Decor",
      "Architectural Digest",
      "Dezeen",
      "Designboom",
      "Livingetc",
      "Wallpaper"
    ]
  },

  researchTargets: [
    "rising_product_trends",
    "sofa_trends",
    "furniture_categories",
    "colors",
    "materials",
    "forms",
    "modularity",
    "customer_interest",
    "viral_content_patterns",
    "instagram_feed_patterns",
    "reels_patterns",
    "website_design_patterns",
    "luxury_ui_patterns",
    "product_photography",
    "content_opportunities",
    "original_product_opportunities"
  ],

  rules: {
    learnPatternsNotCopies: true,
    preserveSourceAttribution: true,
    requireMultipleSignalsForStrongTrend: true,
    separateTrendFromHype: true,
    prioritizeRecentSignals: true
  }
};
