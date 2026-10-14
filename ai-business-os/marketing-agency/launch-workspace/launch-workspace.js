"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  prepareProductMarketing
} = require("../orchestrator/marketing-orchestrator");

const DATA_DIR = path.join(__dirname, "local-data");

function safeId(value, field) {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(value)
  ) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function launchFile(businessId, productId) {
  const business = safeId(businessId, "business_id");
  const product = safeId(productId, "product_id");

  return path.join(DATA_DIR, `${business}--${product}.json`);
}

function createOrGetLaunch(product, options = {}) {
  if (!product || typeof product !== "object") {
    throw new Error("Product required");
  }

  const file = launchFile(product.business_id, product.product_id);

  if (fs.existsSync(file)) {
    const existing = JSON.parse(fs.readFileSync(file, "utf8"));

    if (
      existing.business_id !== product.business_id ||
      existing.product_id !== product.product_id
    ) {
      throw new Error("Stored launch identity mismatch");
    }

    return { created: false, file, workspace: existing };
  }

  const workspace = prepareProductMarketing(product, options);

  fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(
    file,
    JSON.stringify(workspace, null, 2),
    { encoding: "utf8", flag: "wx" }
  );

  return { created: true, file, workspace };
}

module.exports = {
  createOrGetLaunch,
  launchFile
};
