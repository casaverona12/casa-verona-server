"use strict";

const BUSINESS_ROLES = Object.freeze({
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER"
});

const PRODUCT_ACTIONS = Object.freeze({
  VIEW: "VIEW",
  CREATE: "CREATE",
  EDIT: "EDIT",
  APPROVE: "APPROVE"
});

const PERMISSIONS = Object.freeze({
  OWNER: ["VIEW", "CREATE", "EDIT", "APPROVE"],
  ADMIN: ["VIEW", "CREATE", "EDIT"],
  EDITOR: ["VIEW", "CREATE", "EDIT"],
  VIEWER: ["VIEW"]
});

function canAccessProductDevelopment(role, action) {
  if (typeof role !== "string" ||
      typeof action !== "string") {
    return false;
  }

  return (PERMISSIONS[role] || []).includes(action);
}

module.exports = {
  BUSINESS_ROLES,
  PRODUCT_ACTIONS,
  canAccessProductDevelopment
};
