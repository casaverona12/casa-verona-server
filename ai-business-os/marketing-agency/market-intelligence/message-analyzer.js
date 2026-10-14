"use strict";

const MESSAGE_PATTERNS = Object.freeze({
  warranty: /אחריות|warranty/gi,
  fast_delivery: /אספקה מהירה|משלוח מהיר|עד \d{1,2} ימי עסקים/gi,
  customization: /בהתאמה אישית|ייצור אישי|לבחירת הלקוח/gi,
  free_delivery: /הובלה חינם|משלוח חינם|הובלה במתנה/gi,
  free_assembly: /הרכבה חינם|הרכבה במתנה/gi,
  flexible_payments: /תשלומים נוחים|פריסת תשלומים|ללא ריבית/gi,
  premium_design: /עיצוב יוקרתי|עיצוב בוטיק|רהיטי יוקרה/gi,
  customer_service: /שירות אישי|ליווי אישי|שירות לקוחות/gi
});

function analyzeMarketingMessages(text) {
  if (typeof text !== "string") {
    throw new Error("INVALID_MARKETING_TEXT");
  }

  if (text.length > 20000) {
    throw new Error("MARKETING_TEXT_TOO_LONG");
  }

  const messages = [];

  for (const [category, pattern] of Object.entries(MESSAGE_PATTERNS)) {
    const matches = [...text.matchAll(pattern)].slice(0, 20);

    if (matches.length > 0) {
      messages.push({
        category,
        evidence: matches.map(match => ({
          text: match[0],
          position: match.index
        })),
        verified: false
      });
    }
  }

  return {
    messages,
    status: "pending_verification",
    analyzed_at: new Date().toISOString()
  };
}

module.exports = {
  analyzeMarketingMessages
};
