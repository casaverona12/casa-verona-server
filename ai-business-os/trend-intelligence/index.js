const config = require("./config");

function calculateTrendScore(signal = {}) {
  const {
    growth = 0,
    engagement = 0,
    demand = 0,
    relevance = 0
  } = signal;

  return Math.round(
    growth * 0.30 +
    engagement * 0.20 +
    demand * 0.30 +
    relevance * 0.20
  );
}

function analyzeTrend(signal = {}) {
  const score = calculateTrendScore(signal);

  let status = "WATCH";

  if (score >= 80) status = "HIGH_OPPORTUNITY";
  else if (score >= 65) status = "RISING";
  else if (score < 40) status = "LOW_PRIORITY";

  return {
    ...signal,
    trend_score: score,
    status,
    analyzed_at: new Date().toISOString()
  };
}

module.exports = {
  config,
  calculateTrendScore,
  analyzeTrend
};
