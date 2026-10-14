"use strict";

function analyzeCampaign(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Campaign data required");
  }

  const required = ["spend_ils", "leads"];
  for (const key of required) {
    if (!Number.isFinite(input[key]) || input[key] < 0) {
      throw new Error(`Invalid ${key}`);
    }
  }

  if (!Number.isInteger(input.leads)) {
    throw new Error("Leads must be an integer");
  }

  const hasSales = input.sales !== undefined;
  const hasProfit = input.profit_per_sale_ils !== undefined;

  if (hasSales && (
    !Number.isInteger(input.sales) ||
    input.sales < 0 ||
    input.sales > input.leads
  )) {
    throw new Error("Invalid sales count");
  }

  if (hasProfit && (
    !Number.isFinite(input.profit_per_sale_ils) ||
    input.profit_per_sale_ils < 0
  )) {
    throw new Error("Invalid profit per sale");
  }

  const spend = input.spend_ils;
  const leads = input.leads;
  const sales = hasSales ? input.sales : null;

  const cpl = leads > 0 ? spend / leads : null;
  const conversion = hasSales && leads > 0
    ? (sales / leads) * 100
    : null;

  const costPerSale = hasSales && sales > 0
    ? spend / sales
    : null;

  // Profit per sale must exclude advertising costs
  // to avoid subtracting ad spend twice.
  const netProfit = hasSales && hasProfit
    ? sales * input.profit_per_sale_ils - spend
    : null;

  const recommendations = [];

  if (leads === 0) {
    recommendations.push({
      type: "REVIEW",
      message: "לא התקבלו לידים. יש לבדוק מדידה, חשיפה וקריאייטיב לפני החלטה."
    });
  }

  if (!hasSales) {
    recommendations.push({
      type: "MISSING_DATA",
      message: "חסרים נתוני סגירות. אי אפשר לקבוע אם הלידים הופכים למכירות."
    });
  }

  if (!hasProfit) {
    recommendations.push({
      type: "MISSING_DATA",
      message: "חסרים נתוני רווח לעסקה. אי אפשר לחשב רווחיות פרסום."
    });
  }

  if (netProfit !== null && netProfit < 0) {
    recommendations.push({
      type: "REVIEW",
      message: "לפי הנתונים שהוזנו, הרווח לאחר הוצאות הפרסום שלילי. מומלץ לבדוק את הנתונים ואת הקמפיין לפני הגדלת תקציב."
    });
  }

  if (netProfit !== null && netProfit >= 0) {
    recommendations.push({
      type: "OBSERVATION",
      message: "לפי הנתונים שהוזנו, הרווח לאחר הוצאות הפרסום אינו שלילי. יש לבדוק גם את איכות הנתונים ומשך המדידה לפני שינוי תקציב."
    });
  }

  return {
    spend_ils: spend,
    leads,
    sales,
    cost_per_lead_ils: cpl,
    lead_to_sale_conversion_pct: conversion,
    cost_per_sale_ils: costPerSale,
    net_profit_after_ads_ils: netProfit,
    recommendations,
    source: "USER_PROVIDED_DATA",
    actual_meta_connection: false,
    automatic_budget_changes: false
  };
}

module.exports = { analyzeCampaign };
