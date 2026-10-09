const OpenAI = require("openai");
const { buildDesignerPrompt, validateDesign } = require("./ai-designer");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateDetailedDesign(input = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      reason: "OPENAI_API_KEY_MISSING"
    };
  }

  const prompt = buildDesignerPrompt(input);

  const response = await client.responses.create({
    model: "gpt-6-astra",
    store: false,

    input: [
      {
        role: "system",
        content:
          "You are a senior furniture product designer. Create original, distinctive, premium and commercially realistic furniture concepts. Avoid generic designs and never copy an existing product."
      },
      {
        role: "user",
        content: prompt
      }
    ],

    text: {
      format: {
        type: "json_schema",
        name: "furniture_design",
        strict: true,

        schema: {
          type: "object",
          additionalProperties: false,

          properties: {
            model_name: { type: "string" },
            category: { type: "string" },
            design_story: { type: "string" },

            signature_feature: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                why_memorable: { type: "string" }
              },
              required: [
                "name",
                "description",
                "why_memorable"
              ]
            },

            architecture: {
              type: "object",
              additionalProperties: false,
              properties: {
                configuration: { type: "string" },
                module_count: { type: "integer" },
                silhouette: { type: "string" },
                base: { type: "string" },
                arms: { type: "string" },
                backrest: { type: "string" }
              },
              required: [
                "configuration",
                "module_count",
                "silhouette",
                "base",
                "arms",
                "backrest"
              ]
            },

            materials: {
              type: "object",
              additionalProperties: false,
              properties: {
                primary: { type: "string" },
                secondary: { type: "string" },
                accent: { type: "string" },
                material_contrast: { type: "string" }
              },
              required: [
                "primary",
                "secondary",
                "accent",
                "material_contrast"
              ]
            },

            functional_feature: {
              type: "object",
              additionalProperties: false,
              properties: {
                feature: { type: "string" },
                customer_value: { type: "string" }
              },
              required: [
                "feature",
                "customer_value"
              ]
            },

            proposed_dimensions_cm: {
              type: "object",
              additionalProperties: false,
              properties: {
                width: { type: "number" },
                depth: { type: "number" },
                height: { type: "number" },
                seat_height: { type: "number" }
              },
              required: [
                "width",
                "depth",
                "height",
                "seat_height"
              ]
            },

            render_direction: {
              type: "object",
              additionalProperties: false,
              properties: {
                hero_angle: { type: "string" },
                important_detail: { type: "string" },
                environment: { type: "string" },
                primary_color: { type: "string" }
              },
              required: [
                "hero_angle",
                "important_detail",
                "environment",
                "primary_color"
              ]
            },

            commercial_reasoning: {
              type: "object",
              additionalProperties: false,
              properties: {
                target_customer: { type: "string" },
                why_it_can_sell: { type: "string" },
                why_it_is_different: { type: "string" }
              },
              required: [
                "target_customer",
                "why_it_can_sell",
                "why_it_is_different"
              ]
            }
          },

          required: [
            "model_name",
            "category",
            "design_story",
            "signature_feature",
            "architecture",
            "materials",
            "functional_feature",
            "proposed_dimensions_cm",
            "render_direction",
            "commercial_reasoning"
          ]
        }
      }
    }
  });

  const design = JSON.parse(response.output_text);
  return validateDesign(design);
}

module.exports = {
  generateDetailedDesign
};
