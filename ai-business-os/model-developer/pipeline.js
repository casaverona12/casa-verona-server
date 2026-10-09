const { createModelConcept } = require("./index");
const { createFactoryPack } = require("../factory-pack");

function developModel(input = {}) {
  const concept = createModelConcept(input);

  return {
    success: true,
    stage: "CONCEPT",
    status: "AWAITING_RENDER",

    concept,

    workflow: {
      current: "CONCEPT_CREATED",
      next: "CREATE_RENDER"
    },

    available_actions: [
      "CREATE_RENDER",
      "REVISE_CONCEPT",
      "REJECT"
    ],

    generated_at: new Date().toISOString()
  };
}

function approveModel(model = {}) {
  return {
    ...model,
    status: "APPROVED_FOR_PROTOTYPE",
    approved_at: new Date().toISOString(),

    workflow: {
      current: "OWNER_APPROVED",
      next: "CREATE_FACTORY_PACK"
    }
  };
}

function generateFactoryPack(model = {}) {

  if (model.status !== "APPROVED_FOR_PROTOTYPE") {
    return {
      success: false,
      reason: "OWNER_APPROVAL_REQUIRED"
    };
  }

  return createFactoryPack({
    ...model.production_spec,
    status: "APPROVED"
  });
}

function factoryVerify(model = {}, verifiedSpec = {}) {

  if (!verifiedSpec || !Object.keys(verifiedSpec).length) {
    return {
      success: false,
      reason: "VERIFIED_SPEC_REQUIRED"
    };
  }

  return {
    success: true,

    model: {
      ...model,
      factory_verified_spec: verifiedSpec,

      status: "FACTORY_VERIFIED",

      version:
        verifiedSpec.version ||
        "V2",

      verified_at:
        new Date().toISOString()
    },

    production: {
      prototype_complete: true,
      factory_verified: true,
      master_spec_locked: true,
      ready_for_repeat_production: true
    }
  };
}

module.exports = {
  developModel,
  approveModel,
  generateFactoryPack,
  factoryVerify
};
