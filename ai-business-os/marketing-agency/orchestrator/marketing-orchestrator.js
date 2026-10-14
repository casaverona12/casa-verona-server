"use strict";

const {
  createLaunchFromApprovedDesign
} = require("../product-launch/product-launch-engine");

const {
  createCreativeLaunchPlan
} = require("../creative-director/launch-creative-director");

const {
  buildMetaCampaignDraft
} = require("../meta-campaigns/meta-campaign-architect");

function prepareProductMarketing(input, options = {}) {
  if (!input || typeof input !== "object") {
    throw new Error("Product input required");
  }

  if (input.business_id !== "casa-verona") {
    throw new Error("Business mismatch");
  }

  const launch = createLaunchFromApprovedDesign(input);

  const creative = createCreativeLaunchPlan(launch);

  const campaign = buildMetaCampaignDraft(
    launch,
    creative,
    {
      daily_budget_ils: options.daily_budget_ils
    }
  );

  return {
    business_id: launch.business_id,
    product_id: launch.product_id,
    launch_id: launch.launch_id,

    product: {
      name: launch.product_name,
      design_approval_id: launch.design_approval_id
    },

    launch,
    creative,
    campaign,

    workflow: {
      current_stage: "AWAITING_CREATIVE_PRODUCTION",
      actual_video_generated: false,
      actual_carousel_generated: false,
      meta_connected: false,
      campaign_published: false,
      owner_approval_required: true
    }
  };
}

module.exports = { prepareProductMarketing };
