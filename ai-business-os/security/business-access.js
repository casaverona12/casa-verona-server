"use strict";

const {
  canAccessProductDevelopment
} = require("./product-permissions");

async function requireBusinessAccess({
  db,
  userId,
  businessId,
  action
}) {
  if (
    !db ||
    typeof userId !== "string" ||
    typeof businessId !== "string" ||
    typeof action !== "string"
  ) {
    return {
      allowed: false,
      reason: "INVALID_ACCESS_REQUEST"
    };
  }

  const { data: membership, error } = await db
    .from("ai_business_members")
    .select("business_id,user_id,business_role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !membership) {
    return {
      allowed: false,
      reason: "MEMBERSHIP_NOT_FOUND"
    };
  }

  if (
    membership.business_id !== businessId ||
    membership.user_id !== userId
  ) {
    return {
      allowed: false,
      reason: "MEMBERSHIP_MISMATCH"
    };
  }

  if (
    !canAccessProductDevelopment(
      membership.business_role,
      action
    )
  ) {
    return {
      allowed: false,
      reason: "PERMISSION_DENIED"
    };
  }

  return {
    allowed: true,
    businessId,
    role: membership.business_role
  };
}

module.exports = {
  requireBusinessAccess
};
