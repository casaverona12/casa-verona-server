"use strict";

const {
  createMarketResearchReport
} = require("./research-engine");

const {
  analyzeCompetitor
} = require("./competitor-analyzer");

const {
  validateResearchSource
} = require("./source-validator");

function buildCompetitorResearch({
  businessId,
  competitors = []
} = {}) {
  if (!Array.isArray(competitors)) {
    throw new Error("INVALID_COMPETITORS");
  }

  if (competitors.length > 50) {
    throw new Error("TOO_MANY_COMPETITORS");
  }

  const findings = competitors.map(analyzeCompetitor);

  const sourceUrls = [
    ...new Set(
      findings.flatMap(item => item.sources)
        .filter(source => typeof source === "string")
    )
  ];

  const sources = sourceUrls.map(url =>
    validateResearchSource({ url })
  );

  return createMarketResearchReport({
    businessId,
    category: "competitors",
    findings,
    sources
  });
}

module.exports = {
  buildCompetitorResearch
};
