"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
const EXPORTS = path.join(ROOT, "exports");

function safePath(file, folder) {
  const resolved = path.resolve(file);
  const relative = path.relative(folder, resolved);

  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Media path is outside allowed directory");
  }

  return resolved;
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const binary = fs.existsSync("/opt/homebrew/bin/ffmpeg")
      ? "/opt/homebrew/bin/ffmpeg"
      : "ffmpeg";

    const child = spawn(binary, [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      ...args
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";

    child.stderr.on("data", chunk => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });

    child.on("error", reject);

    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(stderr || "FFmpeg failed"));
    });
  });
}

async function produceCommercial(options) {
  const images = options.images;

  if (
    !Array.isArray(images) ||
    images.length < 1 ||
    images.length > 8
  ) {
    throw new Error("Provide 1–8 product images");
  }

  const duration = Number(options.sceneDuration ?? 3);

  if (
    !Number.isFinite(duration) ||
    duration < 2 ||
    duration > 8
  ) {
    throw new Error("Invalid scene duration");
  }

  const transition = 0.6;
  const fps = 25;
  const width = 720;
  const height = 1280;

  const work = fs.mkdtempSync(
    path.join(os.tmpdir(), "cv-production-")
  );

  const clips = [];

  try {
    for (let i = 0; i < images.length; i++) {
      const input = safePath(images[i], UPLOADS);

      if (!fs.existsSync(input)) {
        throw new Error("Image not found: " + i);
      }

      const output = path.join(work, `scene-${i}.mp4`);

      const frames = Math.round(duration * fps);

      const zoom = i % 2 === 0
        ? "min(zoom+0.0007,1.12)"
        : "max(1.12-on*0.0007,1.0)";

      const filter = [
        `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase`,
        `crop=${width * 2}:${height * 2}`,
        `zoompan=z='${zoom}':d=${frames}:s=${width}x${height}:fps=${fps}`,
        "format=yuv420p"
      ].join(",");

      await ffmpeg([
        "-y",
        "-loop", "1",
        "-framerate", String(fps),
        "-i", input,
        "-vf", filter,
        "-frames:v", String(frames),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        output
      ]);

      clips.push(output);
    }

    const outputName = `cv-commercial-${randomUUID()}.mp4`;
    const finalOutput = path.join(EXPORTS, outputName);

    const args = ["-y"];

    for (const clip of clips) {
      args.push("-i", clip);
    }

    const filters = [];

    for (let i = 0; i < clips.length; i++) {
      filters.push(
        `[${i}:v]settb=AVTB,setpts=PTS-STARTPTS,format=yuv420p[v${i}]`
      );
    }

    let current = "v0";

    for (let i = 1; i < clips.length; i++) {
      const next = `mix${i}`;
      const offset = i * (duration - transition);

      filters.push(
        `[${current}][v${i}]xfade=transition=fade:duration=${transition}:offset=${offset.toFixed(3)}[${next}]`
      );

      current = next;
    }

    await ffmpeg([
      ...args,
      "-filter_complex", filters.join(";"),
      "-map", `[${current}]`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      finalOutput
    ]);

    return {
      success: true,
      output: finalOutput,
      scenes: clips.length,
      duration: clips.length * duration -
        (clips.length - 1) * transition,
      bytes: fs.statSync(finalOutput).size
    };

  } finally {
    fs.rmSync(work, {
      recursive: true,
      force: true
    });
  }
}

module.exports = {
  produceCommercial
};
