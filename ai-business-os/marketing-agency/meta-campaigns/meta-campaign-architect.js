"use strict";

const crypto = require("node:crypto");

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function buildMetaCampaignDraft(launch, creativePlan, options = {}) {
  if (!launch || !creativePlan) {
    throw new Error("Launch and creative plan required");
  }

  const businessId = requireText(launch.business_id, "business_id");
  const productId = requireText(launch.product_id, "product_id");

  if (businessId !== "casa-verona") {
    throw new Error("Unsupported business");
  }

  if (
    creativePlan.business_id !== businessId ||
    creativePlan.product_id !== productId ||
    creativePlan.launch_id !== launch.launch_id
  ) {
    throw new Error("Creative plan does not match launch");
  }

  if (launch.state !== "CREATIVE_PLANNING") {
    throw new Error("Launch is not in creative planning");
  }

  const dailyBudget = options.daily_budget_ils;

  if (
    typeof dailyBudget !== "number" ||
    !Number.isFinite(dailyBudget) ||
    dailyBudget <= 0 ||
    dailyBudget > 100000
  ) {
    throw new Error("Valid daily advertising budget required");
  }

  const video = creativePlan.video_concepts?.[0];
  const carousel = creativePlan.carousel_concept;
  const copy = creativePlan.copy_drafts?.[0];

  if (!video || !carousel || !copy) {
    throw new Error("Creative materials incomplete");
  }

  const adSetId = crypto.randomUUID();

  return {
    draft_id: crypto.randomUUID(),
    business_id: businessId,
    launch_id: launch.launch_id,
    product_id: productId,

    platform: "META",
    destinations: ["Facebook", "Instagram"],

    campaign: {
      name: `CV | ${launch.product_name} | WhatsApp | Draft`,
      objective_intent: "WHATSAPP_CONVERSATIONS",
      actual_meta_objective: null,
      status: "DRAFT",
      buying_type: "AUCTION"
    },

    ad_sets: [
      {
        local_id: adSetId,
        name: `${launch.product_name} | Audience Research Pending`,
        daily_budget_ils: dailyBudget,
        targeting: {
          country: "IL",
          audience: null,
          research_required: true
        },
        messaging_destination: "WHATSAPP",
        status: "DRAFT"
      }
    ],

    ads: [
      {
        local_id: crypto.randomUUID(),
        ad_set_local_id: adSetId,
        name: `${launch.product_name} | Video`,
        format: "VIDEO",
        creative_reference: video.title,
        primary_text: copy.primary_text,
        headline: copy.headline,
        asset_ready: false,
        status: "DRAFT"
      },
      {
        local_id: crypto.randomUUID(),
        ad_set_local_id: adSetId,
        name: `${launch.product_name} | Carousel`,
        format: "CAROUSEL",
        creative_reference: carousel.title,
        primary_text: copy.primary_text,
        headline: copy.headline,
        asset_ready: false,
        status: "DRAFT"
      }
    ],

    controls: {
      human_approval_required: true,
      publishing_enabled: false,
      automatic_spending_enabled: false,
      meta_account_connected: false,
      meta_api_payload_ready: false
    },

    created_at: new Date().toISOString()
  };
}

module.exports = { buildMetaCampaignDraft };
