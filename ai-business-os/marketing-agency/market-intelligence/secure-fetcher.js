"use strict";

const https = require("node:https");

const { validateResearchDns } = require("./dns-guard");
const { isPublicIP } = require("./network-policy");
const {
  checkResearchRateLimit
} = require("./research-rate-limiter");

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 8000;

async function fetchResearchPage(inputUrl) {
  // Validate URL and apply rate limit before any network activity.
  const { validatePublicResearchUrl } = require("./url-policy");
  const safeUrl = validatePublicResearchUrl(inputUrl);

  checkResearchRateLimit(safeUrl);

  const checked = await validateResearchDns(safeUrl);

  const address = checked.addresses.find(
    ip => isPublicIP(ip) && require("node:net").isIP(ip) === 4
  );

  if (!address) {
    throw new Error("RESEARCH_NO_APPROVED_IPV4");
  }

  const url = new URL(checked.url);

  return new Promise((resolve, reject) => {
    const request = https.get({
      protocol: "https:",
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      servername: url.hostname,
      lookup: (_hostname, _options, callback) => {
        callback(null, address, 4);
      },
      timeout: TIMEOUT_MS,
      maxRedirects: 0,
      headers: {
        "User-Agent": "CasaVeronaResearchBot/1.0",
        "Accept": "text/html",
        "Accept-Encoding": "identity"
      }
    }, response => {
      const status = response.statusCode || 0;

      if (status >= 300 && status < 400) {
        response.destroy();
        reject(new Error("RESEARCH_REDIRECT_BLOCKED"));
        return;
      }

      if (status !== 200) {
        response.destroy();
        reject(new Error("RESEARCH_HTTP_STATUS_" + status));
        return;
      }

      const contentType = String(
        response.headers["content-type"] || ""
      ).toLowerCase();

      if (!/^text\/html(?:\s*;|\s*$)/.test(contentType)) {
        response.destroy();
        reject(new Error("RESEARCH_CONTENT_TYPE_BLOCKED"));
        return;
      }

      const encoding = String(
        response.headers["content-encoding"] || "identity"
      ).toLowerCase().trim();

      if (encoding !== "identity") {
        response.destroy();
        reject(new Error("RESEARCH_ENCODING_BLOCKED"));
        return;
      }

      const chunks = [];
      let size = 0;

      response.on("data", chunk => {
        size += chunk.length;

        if (size > MAX_BYTES) {
          response.destroy(
            new Error("RESEARCH_RESPONSE_TOO_LARGE")
          );
          return;
        }

        chunks.push(chunk);
      });

      response.on("end", () => {
        resolve({
          url: checked.url,
          status,
          html: Buffer.concat(chunks).toString("utf8"),
          fetched_at: new Date().toISOString()
        });
      });

      response.on("error", reject);
    });

    // Absolute deadline, including connection and response download.
    const deadline = setTimeout(() => {
      request.destroy(new Error("RESEARCH_REQUEST_TIMEOUT"));
    }, TIMEOUT_MS);

    deadline.unref();

    request.on("close", () => clearTimeout(deadline));

    request.on("timeout", () => {
      request.destroy(new Error("RESEARCH_REQUEST_TIMEOUT"));
    });

    request.on("error", reject);
  });
}

module.exports = {
  fetchResearchPage
};
