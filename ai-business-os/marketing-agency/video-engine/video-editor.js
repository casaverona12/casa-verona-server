"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
const EXPORTS = path.join(ROOT, "exports");

for (const folder of [UPLOADS, EXPORTS]) {
  fs.mkdirSync(folder, { recursive: true });
}

function insideFolder(file, folder) {
  const resolved = path.resolve(file);
  const relative = path.relative(folder, resolved);

  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Invalid media path");
  }

  return resolved;
}

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const executable =
      fs.existsSync("/opt/homebrew/bin/ffmpeg")
        ? "/opt/homebrew/bin/ffmpeg"
        : "ffmpeg";

    const child = spawn(executable, args, {
      stdio: ["ignore", "ignore", "pipe"]
    });

    let errors = "";

    child.stderr.on("data", chunk => {
      errors = (errors + chunk.toString()).slice(-6000);
    });

    child.on("error", reject);

    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error("FFmpeg failed: " + errors));
    });
  });
}

async function trimVideo(options) {
  const {
    input,
    output,
    start,
    end
  } = options;

  const startTime = Number(start);
  const endTime = Number(end);

  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    startTime < 0 ||
    endTime <= startTime ||
    endTime - startTime > 600
  ) {
    throw new Error("Invalid trim range");
  }

  const inputPath = insideFolder(input, UPLOADS);
  const outputPath = insideFolder(output, EXPORTS);

  if (!fs.existsSync(inputPath)) {
    throw new Error("Input video not found");
  }

  await runFFmpeg([
    "-hide_banner",
    "-nostdin",
    "-y",
    "-ss", String(startTime),
    "-i", inputPath,
    "-t", String(endTime - startTime),
    "-map", "0:v:0",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-movflags", "+faststart",
    outputPath
  ]);

  return {
    success: true,
    output: outputPath,
    bytes: fs.statSync(outputPath).size,
    duration: endTime - startTime
  };
}

module.exports = {
  trimVideo,
  UPLOADS,
  EXPORTS
};
