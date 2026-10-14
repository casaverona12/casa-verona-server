"use strict";

const STATUSES = Object.freeze({
  CONCEPT_CREATED: "CONCEPT_CREATED",
  AWAITING_RENDER: "AWAITING_RENDER",
  RENDER_READY: "RENDER_READY",
  AWAITING_OWNER_APPROVAL: "AWAITING_OWNER_APPROVAL",
  APPROVED_FOR_FACTORY_REVIEW: "APPROVED_FOR_FACTORY_REVIEW",
  FACTORY_APPROVED: "FACTORY_APPROVED",
  APPROVED_FOR_MARKETING: "APPROVED_FOR_MARKETING",
  REJECTED: "REJECTED"
});

const TRANSITIONS = Object.freeze({
  CONCEPT_CREATED: ["AWAITING_RENDER"],
  AWAITING_RENDER: ["RENDER_READY"],
  RENDER_READY: ["AWAITING_OWNER_APPROVAL"],
  AWAITING_OWNER_APPROVAL: [
    "APPROVED_FOR_FACTORY_REVIEW",
    "REJECTED"
  ],
  APPROVED_FOR_FACTORY_REVIEW: ["FACTORY_APPROVED"],
  FACTORY_APPROVED: ["APPROVED_FOR_MARKETING"],
  APPROVED_FOR_MARKETING: [],
  REJECTED: []
});

function canTransition({
  currentStatus,
  nextStatus,
  businessRole
}) {
  if (!Object.values(STATUSES).includes(currentStatus)) {
    return false;
  }

  if (!Object.values(STATUSES).includes(nextStatus)) {
    return false;
  }

  const allowed = TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    return false;
  }

  if (
    (
      currentStatus === "AWAITING_OWNER_APPROVAL" ||
      nextStatus === "APPROVED_FOR_MARKETING"
    ) &&
    businessRole !== "OWNER"
  ) {
    return false;
  }

  return true;
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  canTransition
};
