"use strict";

// Pure integration layer. Does not write data, publish ads or spend money.
const crypto = require("node:crypto");
const { prepareProductMarketing } = require("../orchestrator/marketing-orchestrator");
const { STATUSES } = require("../../product-workflow");

function productSnapshot(model, approvalId) {
  if (!model || typeof model !== "object" || Array.isArray(model)) throw new Error("Model required");
  if (model.business_id !== "casa-verona") throw new Error("Business mismatch");
  if (model.development_status !== STATUSES.APPROVED_FOR_MARKETING) throw new Error("Product not approved for marketing");
  if (typeof model.id !== "string" || !model.id.trim()) throw new Error("Model id required");
  if (typeof approvalId !== "string" || !approvalId.trim()) throw new Error("Approval reference required");
  const name = model.model_name;
  if (typeof name !== "string" || !name.trim()) throw new Error("Approved product name required");
  const assets = Array.isArray(model.approved_assets) ? structuredClone(model.approved_assets) : [];
  const spec = structuredClone(model.approved_spec ?? null);
  const canonical = JSON.stringify({business_id:model.business_id,product_id:model.id,product_name:name.trim(),approval_id:approvalId,spec,assets});
  const revision = crypto.createHash("sha256").update(canonical).digest("hex");
  return {business_id:model.business_id,product_id:model.id,product_name:name.trim(),design_approved:true,design_approval_id:approvalId,assets,approved_spec:spec,revision};
}

function createLaunchHandoff(model, {approvalId,dailyBudgetIls} = {}) {
  const product = productSnapshot(model, approvalId);
  const workspace = prepareProductMarketing(product, {daily_budget_ils:dailyBudgetIls});
  return {
    ...workspace,
    product_revision:product.revision,
    approved_spec_snapshot:product.approved_spec,
    handoff_status:"DRAFT_REQUIRES_OWNER_APPROVAL",
    publication_blocked:true,
    generated_at:new Date().toISOString()
  };
}

function compareApprovedRevision(handoff, model, approvalId) {
  if (!handoff || handoff.business_id !== "casa-verona" || handoff.product_id !== model?.id) throw new Error("Handoff identity mismatch");
  const latest = productSnapshot(model,approvalId);
  return {
    current:handoff.product_revision === latest.revision,
    requires_creative_review:handoff.product_revision !== latest.revision,
    publication_blocked:handoff.publication_blocked === true || handoff.product_revision !== latest.revision
  };
}

module.exports={productSnapshot,createLaunchHandoff,compareApprovedRevision};
