"use strict";

const MODELS = Object.freeze({
  current: "gpt-5.1",
  candidate: "gpt-6-luna"
});

const LUNA_PRICING = Object.freeze({
  input: 0.10,
  cachedInput: 0.01,
  output: 0.50
});

function estimateLunaCost(inputTokens, outputTokens, cachedTokens = 0) {
  if (
    ![inputTokens, outputTokens, cachedTokens].every(
      n => Number.isSafeInteger(n) && n >= 0
    ) ||
    cachedTokens > inputTokens
  ) {
    throw new Error("INVALID_TOKEN_USAGE");
  }

  return (
    (inputTokens - cachedTokens) * LUNA_PRICING.input +
    cachedTokens * LUNA_PRICING.cachedInput +
    outputTokens * LUNA_PRICING.output
  ) / 1000000;
}

module.exports = { MODELS, LUNA_PRICING, estimateLunaCost };
