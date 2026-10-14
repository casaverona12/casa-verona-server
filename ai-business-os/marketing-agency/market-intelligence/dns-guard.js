"use strict";

const dns = require("node:dns").promises;

const {
  validatePublicResearchUrl
} = require("./url-policy");

const {
  isPublicIP
} = require("./network-policy");

async function validateResearchDns(inputUrl) {
  const safeUrl = validatePublicResearchUrl(inputUrl);
  const hostname = new URL(safeUrl).hostname;

  let addresses;

  try {
    addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true
    });
  } catch {
    throw new Error("RESEARCH_DNS_LOOKUP_FAILED");
  }

  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error("RESEARCH_DNS_EMPTY");
  }

  if (!addresses.every(item =>
    item &&
    typeof item.address === "string" &&
    isPublicIP(item.address)
  )) {
    throw new Error("RESEARCH_DNS_UNSAFE_ADDRESS");
  }

  return {
    url: safeUrl,
    hostname,
    addresses: addresses.map(item => item.address),
    status: "dns_checked"
  };
}

module.exports = {
  validateResearchDns
};
