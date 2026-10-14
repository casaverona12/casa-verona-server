const registry = require("./source-registry");
const { analyzeResearchSignal } = require("./analyzer");
const { generateOpportunities } = require("./opportunity-generator");

function normalizeFinding(finding = {}) {
  return {
    title: finding.title || "Unknown",
    source: finding.source || "Unknown",
    sourceType: finding.sourceType || "unknown",
    market: finding.market || "Global",
    category: finding.category || "unknown",
    url: finding.url || null,

    signals: {
      growth: Number(finding.growth || 0),
      engagement: Number(finding.engagement || 0),
      recency: Number(finding.recency || 0),
      furnitureRelevance: Number(finding.furnitureRelevance || 0),
      commercialPotential: Number(finding.commercialPotential || 0)
    },

    discoveredAt: finding.discoveredAt || new Date().toISOString()
  };
}

function buildResearchReport(topic, findings = []) {
  const normalized = findings.map(normalizeFinding);

  const uniqueSources =
    new Set(normalized.map(item => item.source)).size;

  const average = key => {
    if (!normalized.length) return 0;

    return Math.round(
      normalized.reduce(
        (sum, item) => sum + item.signals[key],
        0
      ) / normalized.length
    );
  };

  const trend = analyzeResearchSignal({
    name: topic,
    category: normalized[0]?.category || "unknown",
    sourceCount: uniqueSources,
    growth: average("growth"),
    engagement: average("engagement"),
    recency: average("recency"),
    furnitureRelevance: average("furnitureRelevance"),
    commercialPotential: average("commercialPotential")
  });

  return {
    topic,
    trend,
    opportunities: generateOpportunities(trend),
    evidence: normalized,
    source_count: uniqueSources,
    registry_targets: registry.researchTargets.length,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  normalizeFinding,
  buildResearchReport
};
