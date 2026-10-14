
"use strict";

const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "bot-state.json");

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const state = JSON.parse(raw);

    if (typeof state.enabled !== "boolean") {
      throw new Error("Invalid bot state");
    }

    return state;
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        enabled: false,
        updatedAt: null
      };
    }

    throw error;
  }
}

function isSalesBotEnabled() {
  return readState().enabled === true;
}

function setSalesBotEnabled(enabled) {
  if (typeof enabled !== "boolean") {
    throw new Error("enabled must be boolean");
  }

  const state = {
    enabled,
    updatedAt: new Date().toISOString()
  };

  const temporaryFile =
    STATE_FILE + "." + process.pid + ".tmp";

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(state, null, 2),
    { mode: 0o600 }
  );

  fs.renameSync(temporaryFile, STATE_FILE);

  return state;
}

module.exports = {
  readState,
  isSalesBotEnabled,
  setSalesBotEnabled
};
