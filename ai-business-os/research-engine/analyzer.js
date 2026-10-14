function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function analyzeResearchSignal(data = {}) {
  const {
    name = "Unknown trend",
    category = "unknown",
    sourceCount = 1,
    growth = 0,
    engagement = 0,
    recency = 0,
    furnitureRelevance = 0,
    commercialPotential = 0
  } = data;

  const sourceStrength = clamp(sourceCount * 20);

  const score = Math.round(
    clamp(growth) * 0.20 +
    clamp(engagement) * 0.15 +
    clamp(recency) * 0.15 +
    clamp(furnitureRelevance) * 0.20 +
    clamp(commercialPotential) * 0.20 +
    sourceStrength * 0.10
  );

  let classification = "WATCH";

  if (score >= 85 && sourceCount >= 3) {
    classification = "STRONG_OPPORTUNITY";
  } else if (score >= 70 && sourceCount >= 2) {
    classification = "RISING_TREND";
  } else if (score < 45) {
    classification = "LOW_SIGNAL";
  }

  return {
    name,
    category,
    score,
    classification,
    source_count: sourceCount,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  analyzeResearchSignal
};
