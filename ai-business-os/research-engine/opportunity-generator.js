function generateOpportunities(trend = {}) {
  const score = Number(trend.score || 0);

  if (score < 60) {
    return {
      trend: trend.name || "Unknown",
      action: "MONITOR",
      opportunities: []
    };
  }

  const opportunities = [
    {
      department: "PRODUCT",
      action: "CREATE_PRODUCT_CONCEPT",
      instruction:
        "Create an original furniture concept inspired by the underlying trend, without copying a specific product."
    },

    {
      department: "CONTENT",
      action: "CREATE_CONTENT_PLAN",
      instruction:
        "Create reels, posts, hooks and storytelling ideas around this trend."
    },

    {
      department: "INSTAGRAM",
      action: "CREATE_VISUAL_DIRECTION",
      instruction:
        "Recommend feed layout, photography direction, reels style and visual presentation."
    },

    {
      department: "WEB_DESIGN",
      action: "CREATE_UI_DIRECTION",
      instruction:
        "Translate the visual trend into original website and landing-page design principles."
    },

    {
      department: "MARKETING",
      action: "CREATE_CAMPAIGN_CONCEPT",
      instruction:
        "Develop campaign angles and test ideas based on the trend and customer need."
    }
  ];

  if (score >= 85) {
    opportunities.unshift({
      department: "AI_PARTNER",
      action: "HIGH_PRIORITY_REVIEW",
      instruction:
        "Review this opportunity as a high-priority business opportunity."
    });
  }

  return {
    trend: trend.name || "Unknown",
    trend_score: score,
    action: score >= 85 ? "ACT" : "TEST",
    opportunities,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  generateOpportunities
};
