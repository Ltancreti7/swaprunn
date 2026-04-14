/**
 * upload.ts — Local disk file upload handler
 *
 * Replaces the Replit Object Storage integration with a simple disk-based
 * upload system. Maintains the same 2-step API contract used by the frontend:
 *
 *   1. POST /api/uploads/request-url  → returns { uploadURL, objectPath }
 *   2. PUT  /api/uploads/file/:id      → receives raw binary, saves to disk
 *   3. GET  /objects/uploads/:id       → serves the file
 *
 * Files are stored in the UPLOADS_DIR (default: ./uploads at project root).
 * On Railway, this directory persists across deploys.
 *
 * To migrate to cloud storage (Cloudinary, S3, etc.) in the future, only this
 * file needs to change — the frontend and database code are unaffected.
 */

import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Resolve uploads directory — use env var or fall back to ./uploads at project root
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, "..", "uploads");

// Pending upload tokens: fileId → { userId, contentType, expiresAt }
const pendingUploads = new Map<
  string,
  { userId: string; contentType: string; expiresAt: number }
>();

// Ensure uploads directory exists on startup
if (\!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[upload] Created uploads directory: ${UPLOADS_DIR}`);
}

export function registerUploadRoutes(app: Express): void {
  /**
   * Step 1 — Request an upload URL.
   * Returns a short-lived upload token URL + the final object path.
   */
  app.post("/api/uploads/request-url", (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (\!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { name, size, contentType } = req.body;

    if (\!name) {
      return res.status(400).json({ error: "Missing required field: name" });
    }
    if (size && Number(size) > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "File too large. Maximum size is 5MB" });
    }
    if (contentType && \!ALLOWED_TYPES.includes(contentType)) {
      return res
        .status(400)
        .json({ error: "Invalid file type. Only JPEG, PNG, GIF, WebP allowed" });
    }

    const fileId = randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min
    pendingUploads.set(fileId, { userId, contentType: contentType || "image/jpeg", expiresAt });

    // Auto-expire the token
    setTimeout(() => pendingUploads.delete(fileId), 15 * 60 * 1000);

    return res.json({
      uploadURL: `/api/uploads/file/${fileId}`,
      objectPath: `/objects/uploads/${fileId}`,
      metadata: { name, size, contentType },
    });
  });

  /**
   * Step 2 — Receive the raw file binary and save it to disk.
   * The frontend PUTs the file directly to this URL.
   */
  app.put(
    "/api/uploads/file/:fileId",
    // Parse raw binary body for this route only
    (req: Request, res: Response, next: Function) => {
      // express.raw is built into Express 4.x+ — no extra dependency needed
      const rawParser = (express as any).raw
        ? (express as any).raw({ type: "*/*", limit: "5mb" })
        : require("express").raw({ type: "*/*", limit: "5mb" });
      rawParser(req, res, next);
    },
    (req: Request, res: Response) => {
      const { fileId } = req.params;
      const upload = pendingUploads.get(fileId);

      if (\!upload) {
        return res.status(404).json({ error: "Upload token not found or expired" });
      }
      if (Date.now() > upload.expiresAt) {
        pendingUploads.delete(fileId);
        return res.status(410).json({ error: "Upload token expired" });
      }
      if (\!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "No file data received" });
      }

      try {
        const filePath = path.join(UPLOADS_DIR, fileId);
        fs.writeFileSync(filePath, req.body);
        pendingUploads.delete(fileId);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error("[upload] Error saving file:", err);
        return res.status(500).json({ error: "Failed to save file" });
      }
    }
  );

  /**
   * Step 3 — Serve uploaded files.
   * The objectPath stored in the DB (/objects/uploads/:id) resolves here.
   */
  app.get("/objects/uploads/:fileId", (req: Request, res: Response) => {
    // Sanitise to prevent path traversal
    const safeId = path.basename(req.params.fileId);
    const filePath = path.join(UPLOADS_DIR, safeId);

    if (\!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(filePath);
  });
}

// Re-export express so index.ts can use it (avoids a second import)
import express from "express";
