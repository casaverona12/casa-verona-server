 "use strict";

const FORMATS = Object.freeze({
  story: {
    width: 1080,
    height: 1920,
    label: "Instagram Story"
  },
  carousel: {
    width: 1080,
    height: 1350,
    label: "Instagram / Facebook Carousel"
  },
  post: {
    width: 1080,
    height: 1350,
    label: "Social Post"
  },
  reel: {
    width: 1080,
    height: 1920,
    label: "Reels"
  }
});

const STYLES = [
  "luxury",
  "minimal",
  "cinematic",
  "architectural",
  "sales"
];

function createCreativeBrief(input = {}) {
  if (!input || typeof input !== "object" ||
      Array.isArray(input)) {
    throw new Error("INVALID_CREATIVE_INPUT");
  }

  const format = String(input.format || "story");

  if (!FORMATS[format]) {
    throw new Error("INVALID_CREATIVE_FORMAT");
  }

  const style = String(input.style || "luxury");

  if (!STYLES.includes(style)) {
    throw new Error("INVALID_CREATIVE_STYLE");
  }

  const imageCount = Number(input.imageCount ?? 1);

  if (!Number.isInteger(imageCount) ||
      imageCount < 1 || imageCount > 10) {
    throw new Error("INVALID_IMAGE_COUNT");
  }

  const productName = String(
    input.productName || "Casa Verona Furniture"
  ).trim().slice(0, 120);

  const objective = String(
    input.objective || "WhatsApp leads"
  ).trim().slice(0, 200);

  return {
    success: true,
    version: 1,
    brand: "Casa Verona",
    productName,
    format,
    dimensions: FORMATS[format],
    style,
    objective,
    imageCount,
    productLock: true,
    approvalRequired: true,
    generationStatus: "BRIEF_ONLY",
    slides: Array.from(
      { length: imageCount },
      (_, index) => ({
        position: index + 1,
        sourceImageIndex: index,
        headline: "",
        body: "",
        callToAction: "",
        designInstructions: "",
        approved: false
      })
    )
  };
}

module.exports = {
  FORMATS,
  STYLES,
  createCreativeBrief
};
