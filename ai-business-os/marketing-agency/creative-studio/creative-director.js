 "use strict";

// CASA VERONA CREATIVE DIRECTOR V1
// Instruction management only.
// No image generation or paid AI calls.

const MAX_INSTRUCTION_LENGTH = 2000;

function createCreativeProject(input = {}) {
  const imageCount = Number(input.imageCount || 1);

  if (
    !Number.isInteger(imageCount) ||
    imageCount < 1 ||
    imageCount > 10
  ) {
    throw new Error("INVALID_IMAGE_COUNT");
  }

  return {
    version: 1,
    brand: "Casa Verona",
    format: input.format || "carousel",
    imageCount,
    direction: {
      mode: "AI_DECIDES",
      background: "AUTO",
      visualConsistency: true,
      productLock: true,
      instructions: []
    },
    generationStatus: "NOT_STARTED",
    approvalRequired: true
  };
}

function addCreativeInstruction(project, message) {
  if (!project || !project.direction) {
    throw new Error("INVALID_PROJECT");
  }

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > MAX_INSTRUCTION_LENGTH
  ) {
    throw new Error("INVALID_INSTRUCTION");
  }

  const updated = structuredClone(project);
  const instruction = message.trim();

  updated.direction.instructions.push({
    role: "user",
    content: instruction
  });

  // Do not pretend to understand free-form Hebrew using
  // keyword matching. Keep instructions for a future
  // AI director to interpret.

  updated.direction.mode = "USER_GUIDED";

  return updated;
}

function getCreativeDirection(project) {
  if (!project || !project.direction) {
    throw new Error("INVALID_PROJECT");
  }

  return {
    brand: project.brand,
    format: project.format,
    imageCount: project.imageCount,
    defaultBehavior:
      "Choose suitable premium backgrounds and compositions",
    visualConsistency:
      project.direction.visualConsistency,
    productLock:
      project.direction.productLock,
    userInstructions:
      project.direction.instructions.map(item => item.content),
    status: "AWAITING_AI_INTERPRETATION"
  };
}

module.exports = {
  createCreativeProject,
  addCreativeInstruction,
  getCreativeDirection
};
