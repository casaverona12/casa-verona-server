const config = require("./config");

function calculateBusinessHealth(data = {}) {
  const {
    salesScore = 50,
    marketingScore = 50,
    operationsScore = 50,
    productScore = 50,
    profitabilityScore = 50
  } = data;

  return Math.round(
    salesScore * 0.25 +
    marketingScore * 0.20 +
    operationsScore * 0.15 +
    productScore * 0.15 +
    profitabilityScore * 0.25
  );
}

function prioritizeRecommendations(recommendations = []) {
  return recommendations
    .map(item => ({
      ...item,
      priority_score: Math.round(
        (item.impact || 0) * 0.45 +
        (item.urgency || 0) * 0.30 +
        (item.confidence || 0) * 0.25
      )
    }))
    .sort((a, b) => b.priority_score - a.priority_score);
}

function createPartnerBrief(data = {}) {
  return {
    business_health: calculateBusinessHealth(data),
    priorities: prioritizeRecommendations(data.recommendations || []),
    generated_at: new Date().toISOString(),
    requires_owner_approval: true
  };
}

module.exports = {
  config,
  calculateBusinessHealth,
  prioritizeRecommendations,
  createPartnerBrief
};
