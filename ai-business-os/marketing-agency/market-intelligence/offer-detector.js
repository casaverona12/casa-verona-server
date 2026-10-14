"use strict";

function detectMarketOffers(text) {
  if (typeof text !== "string") {
    throw new Error("INVALID_MARKET_TEXT");
  }

  if (text.length > 20000) {
    throw new Error("MARKET_TEXT_TOO_LONG");
  }

  const pricePattern =
    /(?:₪\s*([\d,]+)|([\d,]+)\s*(?:₪|ש"ח|שקל(?:ים)?))/g;

  const prices = [];
  let match;

  while ((match = pricePattern.exec(text)) !== null) {
    const raw = match[0];
    const amount = Number(
      (match[1] || match[2]).replace(/,/g, "")
    );

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      continue;
    }

    prices.push({
      amount,
      currency: "ILS",
      evidence: raw,
      position: match.index,
      verified: false
    });

    if (prices.length >= 100) break;
  }

  const promotionPattern =
    /(?:עד\s*)?\d{1,2}\s*%\s*הנחה|מבצע(?:ים)?|הובלה\s*חינם|משלוח\s*חינם|הרכבה\s*מתנה/gi;

  const promotions = [
    ...text.matchAll(promotionPattern)
  ].slice(0, 50).map(item => ({
    evidence: item[0],
    position: item.index,
    verified: false
  }));

  return {
    prices,
    promotions,
    status: "pending_verification",
    analyzed_at: new Date().toISOString()
  };
}

module.exports = {
  detectMarketOffers
};
