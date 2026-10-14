"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const Busboy = require("busboy");

const { produceCommercial } = require("./auto-production");

// CV_IMAGE_PROBE_V1
const { spawnSync } = require("node:child_process");

function validateImageFile(filepath) {
  const result = spawnSync(
    "/opt/homebrew/bin/ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=codec_type,width,height",
      "-of", "json",
      filepath
    ],
    {
      encoding: "utf8",
      timeout: 8000,
      maxBuffer: 64 * 1024
    }
  );

  if (result.status !== 0 || result.error) return false;

  try {
    const stream = JSON.parse(result.stdout).streams?.[0];

    return (
      stream?.codec_type === "video" &&
      Number.isInteger(stream.width) &&
      Number.isInteger(stream.height) &&
      stream.width >= 100 &&
      stream.height >= 100 &&
      stream.width <= 6000 &&
      stream.height <= 6000 &&
      stream.width * stream.height <= 24000000
    );
  } catch {
    return false;
  }
}


const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");

const MAX_FILES = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILES * MAX_FILE_SIZE + 1024 * 1024;

let rendering = false;

function detectImage(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from("89504e470d0a1a0a", "hex")
    )
  ) return ".png";

  if (
    buffer.length >= 3 &&
    buffer.subarray(0, 3).equals(
      Buffer.from("ffd8ff", "hex")
    )
  ) return ".jpg";

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return ".webp";

  return null;
}

async function handleProductionUpload(req, res) {
  function respond(status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(data));
  }

  if (rendering) {
    return respond(429, {
      success: false,
      error: "PRODUCTION_BUSY"
    });
  }

  const declaredSize = Number(req.headers["content-length"]);

  if (
    Number.isFinite(declaredSize) &&
    declaredSize > MAX_REQUEST_SIZE
  ) {
    return respond(413, {
      success: false,
      error: "REQUEST_TOO_LARGE"
    });
  }

  rendering = true;
  const saved = [];

  try {
    fs.mkdirSync(UPLOADS, { recursive: true });

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: MAX_FILES,
        fileSize: MAX_FILE_SIZE,
        fields: 5,
        parts: MAX_FILES + 5
      }
    });

    const images = [];
    const pending = [];
    let invalid = null;
    let receivedBytes = 0;

    await new Promise((resolve, reject) => {
      req.on("aborted", () => reject(new Error("UPLOAD_ABORTED")));
      req.on("error", reject);

      busboy.on("file", (field, stream) => {
        const chunks = [];
        let size = 0;

        if (field !== "images") {
          invalid = "INVALID_FIELD";
          stream.resume();
          return;
        }

        const task = new Promise((done, fail) => {
          stream.on("data", chunk => {
            size += chunk.length;
            receivedBytes += chunk.length;

            if (
              size > MAX_FILE_SIZE ||
              receivedBytes > MAX_REQUEST_SIZE
            ) {
              invalid = "FILE_TOO_LARGE";
              stream.resume();
              return;
            }

            chunks.push(chunk);
          });

          stream.on("limit", () => {
            invalid = "FILE_TOO_LARGE";
          });

          stream.on("error", fail);

          stream.on("end", () => {
            if (invalid) return done();

            const buffer = Buffer.concat(chunks);
            const ext = detectImage(buffer);

            if (!ext) {
              invalid = "INVALID_IMAGE";
              return done();
            }

            const filename =
              "production-" + crypto.randomUUID() + ext;

            const filepath = path.join(UPLOADS, filename);

            fs.writeFileSync(filepath, buffer, { flag: "wx" });

            saved.push(filepath);
            images.push(filepath);
            done();
          });
        });

        pending.push(task);
      });

      busboy.on("filesLimit", () => {
        invalid = "TOO_MANY_FILES";
      });

      busboy.on("partsLimit", () => {
        invalid = "TOO_MANY_PARTS";
      });

      busboy.on("error", reject);

      busboy.on("finish", async () => {
        try {
          await Promise.all(pending);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      req.pipe(busboy);
    });

    if (invalid) {
      return respond(400, {
        success: false,
        error: invalid
      });
    }

    if (images.length < 2) {
      return respond(400, {
        success: false,
        error: "AT_LEAST_TWO_IMAGES_REQUIRED"
      });
    }

    for (const image of images) {
      if (!validateImageFile(image)) {
        return respond(400, {
          success: false,
          error: "INVALID_IMAGE_CONTENT"
        });
      }
    }

    const result = await produceCommercial({
      images,
      sceneDuration: 3
    });

    return respond(200, {
      success: true,
      productionId: path.basename(result.output, ".mp4"),
      scenes: result.scenes,
      duration: result.duration,
      bytes: result.bytes
    });

  } catch (error) {
    console.error("VIDEO PRODUCTION ERROR:", error.message);

    return respond(500, {
      success: false,
      error: "VIDEO_PRODUCTION_FAILED"
    });

  } finally {
    for (const file of saved) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }

    rendering = false;
  }
}

module.exports = { handleProductionUpload };
