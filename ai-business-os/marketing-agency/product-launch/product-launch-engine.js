"use strict";

const crypto = require("node:crypto");

const LAUNCH_STATES = Object.freeze({
  DRAFT: "DRAFT",
  CREATIVE_PLANNING: "CREATIVE_PLANNING",
  COMMERCIAL_REVIEW: "COMMERCIAL_REVIEW",
  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  APPROVED_FOR_PUBLICATION: "APPROVED_FOR_PUBLICATION"
});

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function createLaunchFromApprovedDesign(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Product input required");
  }

  const businessId = requireText(input.business_id, "business_id");
  const productId = requireText(input.product_id, "product_id");
  const productName = requireText(input.product_name, "product_name");

  if (input.design_approved !== true) {
    throw new Error("Design approval required");
  }

  if (
    !input.design_approval_id ||
    typeof input.design_approval_id !== "string"
  ) {
    throw new Error("Design approval reference required");
  }

  return {
    launch_id: crypto.randomUUID(),
    business_id: businessId,
    product_id: productId,
    product_name: productName,
    design_approval_id: input.design_approval_id,

    state: LAUNCH_STATES.CREATIVE_PLANNING,

    product_assets: Array.isArray(input.assets)
      ? structuredClone(input.assets)
      : [],

    creative_brief: {
      objective: "Prepare a premium product launch",
      formats: ["video", "carousel"],
      concepts: [],
      scripts: [],
      captions: [],
      channel_recommendations: [],
      campaign_drafts: []
    },

    commercial_readiness: {
      price_verified: false,
      production_verified: false,
      delivery_verified: false,
      product_claims_verified: false
    },

    approvals: {
      creative_approved: false,
      publication_approved: false,
      budget_approved: false
    },

    publication: {
      published: false,
      external_campaign_id: null
    },

    created_at: new Date().toISOString()
  };
}

function isCommerciallyReady(launch) {
  const readiness = launch.commercial_readiness;

  return Boolean(
    readiness &&
    readiness.price_verified === true &&
    readiness.production_verified === true &&
    readiness.delivery_verified === true &&
    readiness.product_claims_verified === true
  );
}

function prepareForApproval(launch) {
  if (!isCommerciallyReady(launch)) {
    throw new Error("Commercial readiness incomplete");
  }

  return {
    ...structuredClone(launch),
    state: LAUNCH_STATES.READY_FOR_APPROVAL
  };
}

function approveLaunch(launch, approval) {
  if (launch.state !== LAUNCH_STATES.READY_FOR_APPROVAL) {
    throw new Error("Launch is not ready for approval");
  }

  if (
    !approval ||
    approval.owner_approved !== true ||
    approval.creative_approved !== true ||
    approval.budget_approved !== true
  ) {
    throw new Error("Explicit owner, creative and budget approval required");
  }

  return {
    ...structuredClone(launch),
    state: LAUNCH_STATES.APPROVED_FOR_PUBLICATION,
    approvals: {
      creative_approved: true,
      publication_approved: true,
      budget_approved: true
    },
    publication: {
      published: false,
      external_campaign_id: null
    }
  };
}

module.exports = {
  LAUNCH_STATES,
  createLaunchFromApprovedDesign,
  isCommerciallyReady,
  prepareForApproval,
  approveLaunch
};
