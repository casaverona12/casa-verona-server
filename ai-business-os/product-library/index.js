"use strict";

const {
  requireBusinessAccess
} = require("../security/business-access");

async function saveConcept({ db, userId, businessId, concept }) {
  const access = await requireBusinessAccess({
    db, userId, businessId, action: "CREATE"
  });

  if (!access.allowed) {
    return { success: false, error: "ACCESS_DENIED" };
  }

  if (!concept || typeof concept !== "object" ||
      Array.isArray(concept)) {
    return { success: false, error: "INVALID_CONCEPT" };
  }

  const { data, error } = await db
    .from("ai_product_models")
    .insert({
      business_id: businessId,
      created_by: userId,
      category: String(concept.concept?.category || "sofas"),
      concept_data: concept,
      development_status: "AWAITING_RENDER"
    })
    .select("id,business_id,created_by,category,development_status,created_at")
    .single();

  if (error) {
    return { success: false, error: "SAVE_FAILED" };
  }

  return { success: true, model: data };
}

async function listConcepts({ db, userId, businessId }) {
  const access = await requireBusinessAccess({
    db, userId, businessId, action: "VIEW"
  });

  if (!access.allowed) {
    return { success: false, error: "ACCESS_DENIED" };
  }

  const { data, error } = await db
    .from("ai_product_models")
    .select("id,category,model_name,development_status,created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { success: false, error: "LIST_FAILED" };
  }

  return { success: true, models: data || [] };
}

async function getConcept({ db, userId, businessId, modelId }) {
  const access = await requireBusinessAccess({
    db, userId, businessId, action: "VIEW"
  });

  if (!access.allowed) {
    return { success: false, error: "ACCESS_DENIED" };
  }

  const { data, error } = await db
    .from("ai_product_models")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", modelId)
    .maybeSingle();

  if (error) {
    return { success: false, error: "READ_FAILED" };
  }

  if (!data) {
    return { success: false, error: "MODEL_NOT_FOUND" };
  }

  return { success: true, model: data };
}

module.exports = {
  saveConcept,
  listConcepts,
  getConcept
};
