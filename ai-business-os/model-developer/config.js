module.exports = {
  name: "AI Model Developer",
  version: "1.0.0",

  generationFrequencyHours: 36,

  categories: [
    "sofas",
    "armchairs",
    "beds",
    "dining_tables",
    "coffee_tables",
    "tv_units",
    "chairs"
  ],

  objectives: [
    "create_original_furniture_concepts",
    "use_research_signals",
    "match_commercial_demand",
    "avoid_direct_copying",
    "prepare_visualization_brief",
    "prepare_marketing_direction"
  ],

  rules: {
    requireResearchEvidence: true,
    createOriginalConceptsOnly: true,
    avoidDirectCopies: true,
    includeCommercialReasoning: true,
    includeProductionBrief: true,
    includeVisualizationBrief: true
  }
};
