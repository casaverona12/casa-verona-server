"use strict";

/*
 * CASA VERONA — CAMPAIGN PLANNER
 * Planning only. No Meta API, no spending, no database writes.
 */

(function (root) {
  const DEFAULTS = Object.freeze({
    platform: "meta",
    objective: "whatsapp",
    dailyBudget: 150,
    durationDays: 30,
    audience: "לקוחות בישראל המתעניינים בריהוט לבית",
    format: "carousel",
    product: "",
    headline: "",
    primaryText: "",
    status: "draft"
  });

  function createDraft(overrides = {}) {
    return {
      ...DEFAULTS,
      ...overrides,
      status: "draft"
    };
  }

  function validateDraft(draft) {
    const errors = [];

    if (
      !Number.isFinite(Number(draft.dailyBudget)) ||
      Number(draft.dailyBudget) <= 0
    ) {
      errors.push("יש להגדיר תקציב יומי חיובי");
    }

    if (
      !Number.isInteger(Number(draft.durationDays)) ||
      Number(draft.durationDays) < 1
    ) {
      errors.push("יש להגדיר מספר ימי קמפיין תקין");
    }

    if (!String(draft.audience || "").trim()) {
      errors.push("יש להגדיר קהל יעד");
    }

    return errors;
  }

  function estimateBudget(draft) {
    const errors = validateDraft(draft);

    if (errors.length) {
      return { valid: false, errors };
    }

    const daily = Number(draft.dailyBudget);
    const days = Number(draft.durationDays);

    return {
      valid: true,
      dailyBudget: daily,
      durationDays: days,
      totalBudget: Math.round(daily * days * 100) / 100,
      currency: "ILS",
      note: "הערכה לתכנון בלבד, לא הוצאה בפועל"
    };
  }

  root.CasaVeronaCampaignPlanner = {
    defaults: DEFAULTS,
    createDraft,
    validateDraft,
    estimateBudget
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.CasaVeronaCampaignPlanner;
  }
})(typeof window !== "undefined" ? window : globalThis);
