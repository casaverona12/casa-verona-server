"use strict";

const net = require("node:net");

function validatePublicResearchUrl(value) {
  if (typeof value !== "string" || value.length > 2048) {
    throw new Error("INVALID_RESEARCH_URL");
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("INVALID_RESEARCH_URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("RESEARCH_HTTPS_REQUIRED");
  }

  if (url.username || url.password) {
    throw new Error("RESEARCH_CREDENTIALS_FORBIDDEN");
  }

  if (url.port && url.port !== "443") {
    throw new Error("RESEARCH_PORT_FORBIDDEN");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    net.isIP(hostname) !== 0 ||
    !hostname.includes(".")
  ) {
    throw new Error("RESEARCH_HOST_FORBIDDEN");
  }

  return url.href;
}

module.exports = {
  validatePublicResearchUrl
};
