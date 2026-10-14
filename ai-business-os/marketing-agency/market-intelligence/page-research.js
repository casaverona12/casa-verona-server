"use strict";

const {
  extractPageContent
} = require("./page-extractor");

const {
  validateResearchSource
} = require("./source-validator");

const {
  detectMarketOffers
} = require("./offer-detector");

const {
  analyzeMarketingMessages
} = require("./message-analyzer");

const {
  analyzeBrandPositioning
} = require("./brand-positioning");

const {
  generateCreativeRecommendations
} = require("./creative-recommender");

function createPageResearch(page = {}) {
  if (
    !page ||
    typeof page !== "object" ||
    typeof page.html !== "string"
  ) {
    throw new Error("INVALID_RESEARCH_PAGE");
  }

  const source = validateResearchSource({
    url: page.url,
    title: null
  });

  const extracted = extractPageContent(page.html);
  const offers = detectMarketOffers(extracted.text);
  const marketingMessages = analyzeMarketingMessages(extracted.text);
  const brandPositioning = analyzeBrandPositioning({
    marketing_messages: marketingMessages
  });

  const creativeRecommendations = generateCreativeRecommendations({
    brand_positioning: brandPositioning
  });

  return {
    source: {
      ...source,
      title: extracted.title
    },
    content: {
      title: extracted.title,
      description: extracted.description,
      text: extracted.text
    },
    market_offers: offers,
    marketing_messages: marketingMessages,
    brand_positioning: brandPositioning,
    creative_recommendations: creativeRecommendations,
    status: "pending_verification",
    verified: false,
    fetched_at: typeof page.fetched_at === "string"
      ? page.fetched_at
      : null
  };
}

module.exports = {
  createPageResearch
};
