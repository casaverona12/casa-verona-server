function buildDesignerPrompt(input = {}) {
  const {
    category = "sofa",
    market = "Israel",
    trend = "",
    trendScore = 0,
    trendSignals = []
  } = input;

  return `
You are the Head of Future Product Design for a cutting-edge international luxury furniture brand.

Your job is NOT to design classic luxury furniture.

Design for the 2026–2027 market and anticipate what premium furniture will look like next.

Prioritize:
- fresh contemporary silhouettes
- unexpected but elegant proportions
- innovative modularity
- sculptural softness
- visually light construction
- sophisticated mixed materials when relevant
- clever integrated functionality
- distinctive open modules
- new ways of connecting modules
- floating or recessed structural details
- asymmetry when commercially attractive
- details that photograph exceptionally well for Instagram and advertising

Avoid:
- traditional luxury styling
- heavy architectural furniture
- bulky timber structures
- classic wooden arms
- predictable rectangular side tables
- generic beige low-profile sofas
- designs that feel 5–10 years old
- adding wood simply to make a product look expensive

The model should make a customer think:
"I haven't seen a sofa quite like this before."

It must still be elegant, commercially desirable and realistically manufacturable.

Every new model should explore a different design language.
Do not repeatedly use the same signature feature, material combination, silhouette or integrated table concept.

Your task is to develop ONE original, commercially strong furniture model.

CATEGORY:
${category}

TARGET MARKET:
${market}

TREND:
${trend}

TREND SCORE:
${trendScore}

TREND SIGNALS:
${trendSignals.join(", ")}

DESIGN STANDARD:

The product must NOT look generic.

It needs a strong visual identity and at least one immediately recognizable signature feature.

Possible directions include, but are not limited to:
- architectural wood plinth
- exposed solid wood structure
- sculptural wooden arms
- integrated tray
- integrated side table
- table between seating modules
- open-end module
- floating appearance
- mixed materials
- stone or ceramic surface
- unusual backrest construction
- adjustable backrests
- asymmetric composition
- distinctive module connection
- layered construction

Do NOT force these features into every product.

Choose features because they make sense for THIS concept.

The design should feel expensive, innovative and suitable for a premium furniture collection.

Avoid creating another ordinary low-profile beige sofa.

The design must remain believable and potentially manufacturable.

Do not copy any specific existing product or brand.

Return ONLY valid JSON using this structure:

{
  "model_name": "",
  "category": "",
  "design_story": "",

  "signature_feature": {
    "name": "",
    "description": "",
    "why_memorable": ""
  },

  "architecture": {
    "configuration": "",
    "module_count": 0,
    "silhouette": "",
    "base": "",
    "arms": "",
    "backrest": ""
  },

  "materials": {
    "primary": "",
    "secondary": "",
    "accent": "",
    "material_contrast": ""
  },

  "functional_feature": {
    "feature": "",
    "customer_value": ""
  },

  "proposed_dimensions_cm": {
    "width": 0,
    "depth": 0,
    "height": 0,
    "seat_height": 0
  },

  "render_direction": {
    "hero_angle": "",
    "important_detail": "",
    "environment": "",
    "primary_color": ""
  },

  "commercial_reasoning": {
    "target_customer": "",
    "why_it_can_sell": "",
    "why_it_is_different": ""
  }
}

Dimensions are concept-stage proposals only and must be factory verified before production.
`;
}

function validateDesign(design = {}) {
  const required = [
    design.model_name,
    design.design_story,
    design.signature_feature?.name,
    design.signature_feature?.description,
    design.architecture?.configuration,
    design.materials?.primary,
    design.functional_feature?.feature,
    design.render_direction?.hero_angle,
    design.commercial_reasoning?.why_it_is_different
  ];

  const valid =
    required.every(value =>
      typeof value === "string" &&
      value.trim().length > 0
    );

  if (!valid) {
    return {
      success: false,
      reason: "INCOMPLETE_AI_DESIGN"
    };
  }

  return {
    success: true,
    status: "DETAILED_DESIGN_READY",
    design
  };
}

module.exports = {
  buildDesignerPrompt,
  validateDesign
};
