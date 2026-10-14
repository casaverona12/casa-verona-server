"use strict";

function validateResearchSource(source = {}) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("INVALID_RESEARCH_SOURCE");
  }

  if (typeof source.url !== "string") {
    throw new Error("SOURCE_URL_REQUIRED");
  }

  let parsed;

  try {
    parsed = new URL(source.url);
  } catch {
    throw new Error("INVALID_SOURCE_URL");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("UNSUPPORTED_SOURCE_PROTOCOL");
  }

  if (!parsed.hostname || source.url.length > 2048) {
    throw new Error("INVALID_SOURCE_URL");
  }

  return {
    url: parsed.href,
    domain: parsed.hostname.toLowerCase(),
    title: typeof source.title === "string"
      ? source.title.trim().slice(0, 300)
      : null,
    status: "pending_verification",
    content_verified: false,
    checked_at: null
  };
}

module.exports = {
  validateResearchSource
};
