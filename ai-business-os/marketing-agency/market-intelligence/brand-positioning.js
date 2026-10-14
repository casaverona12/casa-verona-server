"use strict";

const BRAND_ADVANTAGES = Object.freeze([
  {
    id: "pay_after_delivery",
    title: "תשלום לאחר קבלת הרהיט",
    category: "payment_security",
    priority: "high"
  },
  {
    id: "custom_design",
    title: "עיצוב בהתאמה אישית",
    category: "customization",
    priority: "high"
  },
  {
    id: "premium_design",
    title: "עיצוב בוטיק יוקרתי",
    category: "premium_design",
    priority: "high"
  },
  {
    id: "personal_service",
    title: "שירות וליווי אישי",
    category: "customer_service",
    priority: "medium"
  },
  {
    id: "warranty",
    title: "אחריות לשנה",
    category: "warranty",
    priority: "medium"
  }
]);

function analyzeBrandPositioning(research = {}) {
  const messages = research?.marketing_messages?.messages;

  if (!Array.isArray(messages)) {
    throw new Error("INVALID_POSITIONING_RESEARCH");
  }

  const detectedCategories = new Set(
    messages.map(item => item.category)
  );

  const opportunities = BRAND_ADVANTAGES.map(advantage => ({
    ...advantage,
    competitor_message_detected:
      detectedCategories.has(advantage.category),
    recommendation: detectedCategories.has(advantage.category)
      ? "לבחון כיצד להציג יתרון ייחודי ומשכנע יותר"
      : "לבחון הדגשת היתרון לאחר אימות המידע בשוק",
    verified: false,
    requires_approval: true
  }));

  return {
    brand: "Casa Verona",
    status: "draft",
    opportunities,
    competitor_absence_proven: false,
    analyzed_at: new Date().toISOString()
  };
}

module.exports = {
  BRAND_ADVANTAGES,
  analyzeBrandPositioning
};
