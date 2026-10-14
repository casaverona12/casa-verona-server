"use strict";

function calculateCampaignGoals(config = {}) {
  const {
    dailyBudgetIls,
    targetCostPerLeadIls,
    targetConversionRate,
    targetMonthlySales
  } = config;

  for (const [name, value] of Object.entries({
    dailyBudgetIls,
    targetCostPerLeadIls,
    targetConversionRate,
    targetMonthlySales
  })) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("INVALID_CAMPAIGN_GOAL_" + name);
    }
  }

  if (
    dailyBudgetIls <= 0 ||
    targetCostPerLeadIls <= 0 ||
    targetConversionRate <= 0 ||
    targetConversionRate > 1 ||
    !Number.isSafeInteger(targetMonthlySales) ||
    targetMonthlySales < 1
  ) {
    throw new Error("INVALID_CAMPAIGN_GOALS");
  }

  const estimatedDailyLeads =
    dailyBudgetIls / targetCostPerLeadIls;

  const estimatedMonthlyLeads =
    estimatedDailyLeads * 30;

  const estimatedMonthlySales =
    estimatedMonthlyLeads * targetConversionRate;

  const requiredMonthlyLeads =
    targetMonthlySales / targetConversionRate;

  const requiredMonthlyBudgetIls =
    requiredMonthlyLeads * targetCostPerLeadIls;

  return {
    estimated_daily_leads: Number(estimatedDailyLeads.toFixed(2)),
    estimated_monthly_leads: Number(estimatedMonthlyLeads.toFixed(2)),
    estimated_monthly_sales: Number(estimatedMonthlySales.toFixed(2)),
    target_monthly_sales: targetMonthlySales,
    required_monthly_leads: Math.ceil(requiredMonthlyLeads),
    required_monthly_budget_ils: Math.ceil(requiredMonthlyBudgetIls),
    forecast_only: true,
    spending_allowed: false
  };
}

module.exports = {
  calculateCampaignGoals
};
