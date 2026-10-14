
"use strict";

const TABLE = "sales_bot_settings";
const CONTROL_ID = "main";

async function readState(db) {
  if (!db) {
    throw new Error("SUPABASE_UNAVAILABLE");
  }

  const { data, error } = await db
    .from(TABLE)
    .select("enabled,updated_at")
    .eq("id", CONTROL_ID)
    .single();

  if (error || !data || typeof data.enabled !== "boolean") {
    throw new Error("SALES_BOT_STATE_UNAVAILABLE");
  }

  return {
    enabled: data.enabled,
    updatedAt: data.updated_at,
    scope: "SUPABASE"
  };
}

async function setState(db, enabled) {
  if (!db) {
    throw new Error("SUPABASE_UNAVAILABLE");
  }

  if (typeof enabled !== "boolean") {
    throw new Error("INVALID_BOT_STATE");
  }

  const { data, error } = await db
    .from(TABLE)
    .update({
      enabled,
      updated_at: new Date().toISOString()
    })
    .eq("id", CONTROL_ID)
    .select("enabled,updated_at")
    .single();

  if (error || !data || data.enabled !== enabled) {
    throw new Error("SALES_BOT_UPDATE_FAILED");
  }

  return {
    enabled: data.enabled,
    updatedAt: data.updated_at,
    scope: "SUPABASE"
  };
}

async function isEnabled(db) {
  const state = await readState(db);
  return state.enabled === true;
}

module.exports = {
  readState,
  setState,
  isEnabled
};
