"use strict";

const {
  getBrandDNA,
  validateBrandDNA
} = require("../brand-intelligence/brand-dna");

function createCreativeLaunchPlan(launch) {
  if (!launch || typeof launch !== "object") {
    throw new Error("Launch is required");
  }

  if (launch.business_id !== "casa-verona") {
    throw new Error("Business mismatch");
  }

  if (launch.state !== "CREATIVE_PLANNING") {
    throw new Error("Launch is not in creative planning");
  }

  if (
    typeof launch.product_id !== "string" ||
    !launch.product_id.trim() ||
    typeof launch.product_name !== "string" ||
    !launch.product_name.trim()
  ) {
    throw new Error("Valid product identity required");
  }

  if (
    typeof launch.design_approval_id !== "string" ||
    !launch.design_approval_id.trim()
  ) {
    throw new Error("Design approval reference required");
  }

  const brand = getBrandDNA(launch.business_id);
  validateBrandDNA(brand);

  const name = launch.product_name.trim();

  return {
    launch_id: launch.launch_id,
    business_id: launch.business_id,
    product_id: launch.product_id,
    product_name: name,
    status: "CREATIVE_PROPOSAL",
    generated_by: "RULE_BASED_CREATIVE_PLANNER",
    ai_generated: false,

    strategy: {
      objective: "Generate qualified WhatsApp inquiries",
      positioning: brand.identity.positioning,
      primary_channel: "Meta Ads",
      additional_channels: [
        "Instagram Reels",
        "Instagram Stories",
        "Facebook Feed"
      ]
    },

    video_concepts: [
      {
        title: `${name} — חשיפת הדגם`,
        format: "vertical_video",
        aspect_ratio: "9:16",
        objective: "Introduce the product",
        direction:
          "Show the product with restrained camera movement, considered lighting and clear design details.",
        source_required: "Verified product photo or video",
        status: "PROPOSED"
      },
      {
        title: `${name} — סיפור העיצוב`,
        format: "vertical_video",
        aspect_ratio: "9:16",
        objective: "Build brand recognition",
        direction:
          "Develop a short editorial narrative focused on design and atmosphere without inventing product features.",
        source_required: "Approved product assets",
        status: "PROPOSED"
      }
    ],

    carousel_concept: {
      title: `${name} — הכירו את הדגם`,
      slides: [
        "Product introduction",
        "Design overview",
        "Verified product details",
        "Lifestyle context",
        "WhatsApp call to action"
      ],
      status: "PROPOSED"
    },

    copy_drafts: [
      {
        placement: "Meta Ads",
        headline: `הכירו את ${name} מבית Casa Verona`,
        primary_text:
          `עיצוב שמכניס אופי לחלל. הכירו את ${name} מבית Casa Verona וגלו את פרטי הדגם בשיחה איתנו.`,
        call_to_action: "שלחו הודעה לפרטים"
      },
      {
        placement: "Instagram",
        headline: `${name} | Casa Verona`,
        primary_text:
          `לכל חלל יש אופי משלו. הכירו את ${name}, דגם מקולקציית Casa Verona.`,
        call_to_action: "לפרטים נוספים בוואטסאפ"
      }
    ],

    campaign_recommendation: {
      platform: "Meta",
      objective: "WhatsApp conversations",
      creative_test: ["video", "carousel"],
      budget: null,
      audience: "To be defined after market research",
      status: "DRAFT_ONLY"
    },

    safety: {
      human_review_required: true,
      product_claims_require_verification: true,
      actual_market_research_completed: false,
      actual_video_generated: false,
      approved_for_publication: false,
      automatic_spending_allowed: false
    }
  };
}

module.exports = { createCreativeLaunchPlan };
