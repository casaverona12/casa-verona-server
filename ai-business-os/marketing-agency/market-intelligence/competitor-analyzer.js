"use strict";

function analyzeCompetitor(data = {}) {
  if (
    typeof data.name !== "string" ||
    !data.name.trim()
  ) {
    throw new Error("COMPETITOR_NAME_REQUIRED");
  }

  const fields = [
    "website",
    "price_range",
    "strengths",
    "weaknesses",
    "marketing_channels",
    "opportunities"
  ];

  const analysis = {
    competitor_name: data.name.trim(),
    status: "draft",
    verified: false,
    collected_at: new Date().toISOString()
  };

  for (const field of fields) {
    analysis[field] = data[field] ?? null;
  }

  analysis.sources = Array.isArray(data.sources)
    ? data.sources
    : [];

  return analysis;
}

module.exports = {
  analyzeCompetitor
};
