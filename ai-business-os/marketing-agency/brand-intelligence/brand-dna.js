"use strict";

const BRAND_DNA_VERSION = 1;

const CASA_VERONA_DNA = {
  version: BRAND_DNA_VERSION,
  business_id: "casa-verona",

  identity: {
    name: "Casa Verona",
    category: "furniture",
    market: "Israel",
    positioning: "Premium furniture and interior design brand",
    personality: [
      "refined",
      "original",
      "confident",
      "contemporary",
      "design-led"
    ]
  },

  audience: {
    primary: [
      "People furnishing or upgrading their homes",
      "Customers seeking distinctive furniture",
      "Interior designers and architects"
    ]
  },

  creative_strategy: {
    mission: "Build a recognizable premium furniture brand through original, high-quality advertising.",
    preferred_formats: ["video", "carousel"],
    principles: [
      "Develop original advertising concepts.",
      "Research leading brands for inspiration without copying.",
      "Prioritize strong visual storytelling.",
      "Avoid generic advertising templates.",
      "Use verified product information.",
      "Learn from verified campaign performance."
    ]
  },

  product_integrity: {
    preserve_original_product: true,
    rules: [
      "Preserve product geometry.",
      "Do not invent product features.",
      "Do not misrepresent materials or dimensions.",
      "Flag uncertain details for human review."
    ]
  },

  claims_policy: {
    verification_required: true,
    claims_to_verify: [
      "delivery_time",
      "warranty",
      "shipping",
      "assembly",
      "payment_terms",
      "discounts",
      "materials"
    ]
  },

  autonomy: {
    may_propose_ideas: true,
    may_prepare_drafts: true,
    may_recommend_campaigns: true,
    may_publish_automatically: false,
    may_spend_automatically: false,
    owner_approval_required: true
  },

  status: "initial_brand_profile",
  owner_reviewed: false
};

function getBrandDNA(businessId) {
  if (businessId !== CASA_VERONA_DNA.business_id) {
    throw new Error("Business mismatch");
  }

  return structuredClone(CASA_VERONA_DNA);
}

function validateBrandDNA(dna) {
  if (!dna || typeof dna !== "object" || Array.isArray(dna)) {
    throw new Error("Invalid Brand DNA");
  }

  if (dna.business_id !== "casa-verona") {
    throw new Error("Business mismatch");
  }

  if (
    !dna.identity ||
    !dna.creative_strategy ||
    !dna.product_integrity ||
    !dna.claims_policy ||
    !dna.autonomy
  ) {
    throw new Error("Incomplete Brand DNA");
  }

  if (
    dna.autonomy.may_publish_automatically !== false ||
    dna.autonomy.may_spend_automatically !== false ||
    dna.autonomy.owner_approval_required !== true
  ) {
    throw new Error("Unsafe automation settings");
  }

  return true;
}

module.exports = {
  BRAND_DNA_VERSION,
  CASA_VERONA_DNA,
  getBrandDNA,
  validateBrandDNA
};
