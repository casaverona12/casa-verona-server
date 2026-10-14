"use strict";

const DOMAIN_INTERVAL_MS = 10000;
const HOURLY_LIMIT = 30;
const HOUR_MS = 60 * 60 * 1000;

const domainRequests = new Map();
let hourlyWindowStart = Date.now();
let hourlyCount = 0;

function checkResearchRateLimit(inputUrl) {
  const hostname = new URL(inputUrl).hostname.toLowerCase();
  const now = Date.now();

  if (now - hourlyWindowStart >= HOUR_MS) {
    hourlyWindowStart = now;
    hourlyCount = 0;
    domainRequests.clear();
  }

  if (hourlyCount >= HOURLY_LIMIT) {
    throw new Error("RESEARCH_HOURLY_LIMIT_REACHED");
  }

  const lastRequest = domainRequests.get(hostname);

  if (
    lastRequest !== undefined &&
    now - lastRequest < DOMAIN_INTERVAL_MS
  ) {
    throw new Error("RESEARCH_DOMAIN_RATE_LIMIT");
  }

  domainRequests.set(hostname, now);
  hourlyCount++;

  return true;
}

module.exports = {
  checkResearchRateLimit
};
