"use strict";

const { randomUUID } = require("node:crypto");

async function reserveMarketingBudget(db, amountUsd) {
  if (
    !Number.isFinite(amountUsd) ||
    amountUsd <= 0
  ) {
    throw new Error("INVALID_MARKETING_RESERVATION");
  }

  const requestId = randomUUID();

  const { data, error } = await db.rpc(
    "reserve_marketing_ai_budget",
    {
      p_request_id: requestId,
      p_reserved_usd: amountUsd
    }
  );

  if (error) {
    throw new Error("MARKETING_BUDGET_RESERVATION_FAILED");
  }

  return {
    allowed: data === true,
    requestId: data === true ? requestId : null,
    reservedUsd: data === true ? amountUsd : 0
  };
}

async function finalizeMarketingBudget(
  db,
  requestId,
  actualUsd,
  success = true
) {
  if (
    !requestId ||
    !Number.isFinite(actualUsd) ||
    actualUsd < 0
  ) {
    throw new Error("INVALID_MARKETING_FINALIZATION");
  }

  const { data, error } = await db.rpc(
    "finalize_marketing_ai_request",
    {
      p_request_id: requestId,
      p_actual_usd: actualUsd,
      p_success: success
    }
  );

  if (error || data !== true) {
    throw new Error("MARKETING_BUDGET_FINALIZATION_FAILED");
  }

  return true;
}

async function markMarketingBudgetForReview(db, requestId) {
  if (!requestId) {
    throw new Error("INVALID_MARKETING_REQUEST_ID");
  }

  const { data, error } = await db.rpc(
    "mark_marketing_ai_request_for_review",
    {
      p_request_id: requestId
    }
  );

  if (error || data !== true) {
    throw new Error("MARKETING_BUDGET_REVIEW_FAILED");
  }

  return true;
}

module.exports = {
  reserveMarketingBudget,
  finalizeMarketingBudget,
  markMarketingBudgetForReview
};
