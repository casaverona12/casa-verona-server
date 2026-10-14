const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateImage(job = {}) {
  if (!job.render_id || !job.prompt) {
    return {
      success: false,
      reason: "INVALID_RENDER_JOB"
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      reason: "OPENAI_API_KEY_MISSING"
    };
  }

  const outputDir = path.join(
    process.cwd(),
    "ai-business-os",
    "generated-renders"
  );

  fs.mkdirSync(outputDir, {
    recursive: true
  });

  console.log("🎨 Generating furniture concept...");
  console.log("Render:", job.render_id);

  const response = await client.images.generate({
    model: "gpt-image-2.5-flare",
    prompt: job.prompt,
    size: "1536x1024",
    quality: "medium",
    output_format: "png",
    background: "opaque",
    n: 1
  });

  const imageBase64 =
    response.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error(
      "Image provider returned no image data"
    );
  }

  const filename =
    `${job.render_id}.png`;

  const filepath =
    path.join(outputDir, filename);

  fs.writeFileSync(
    filepath,
    Buffer.from(imageBase64, "base64")
  );

  return {
    success: true,
    render_id: job.render_id,
    status: "RENDERED",
    provider: "OPENAI",
    model: "gpt-image-2.5-flare",
    image_path: filepath,
    filename,
    generated_at:
      new Date().toISOString()
  };
}

module.exports = {
  generateImage
};
