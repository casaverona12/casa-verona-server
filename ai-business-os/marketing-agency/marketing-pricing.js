"use strict";

const MODEL = "gpt-5.1";

// Prices in USD per 1 million tokens.
// Must be verified against official OpenAI pricing before enabling.
const PRICING = Object.freeze({
  model: MODEL,
  verified: true,
  input: 1.25,
  cachedInput: 0.125,
  output: 10.00
});

function calculateMarketingCost(usage) {
  if (!PRICING.verified) {
    throw new Error("MARKETING_AI_PRICING_NOT_VERIFIED");
  }

  const input = usage?.input_tokens;
  const output = usage?.output_tokens;
  const cached = usage?.cached_input_tokens;

  if (
    ![input, output, cached].every(
      value => Number.isSafeInteger(value) && value >= 0
    ) ||
    cached > input
  ) {
    throw new Error("MARKETING_AI_INVALID_USAGE");
  }

  const uncached = input - cached;

  return (
    uncached * PRICING.input +
    cached * PRICING.cachedInput +
    output * PRICING.output
  ) / 1000000;
}

function calculateMaximumReservation(maxInputTokens, maxOutputTokens) {
  if (!PRICING.verified) {
    throw new Error("MARKETING_AI_PRICING_NOT_VERIFIED");
  }

  if (
    !Number.isSafeInteger(maxInputTokens) ||
    maxInputTokens <= 0 ||
    !Number.isSafeInteger(maxOutputTokens) ||
    maxOutputTokens <= 0
  ) {
    throw new Error("INVALID_MARKETING_TOKEN_LIMITS");
  }

  // Reserve at the full uncached input and output rates.
  // Cached-token discounts are never assumed in advance.
  const amount = (
    maxInputTokens * PRICING.input +
    maxOutputTokens * PRICING.output
  ) / 1000000;

  return Math.ceil(amount * 1000000) / 1000000;
}

module.exports = {
  MODEL,
  PRICING,
  calculateMarketingCost,
  calculateMaximumReservation
};
