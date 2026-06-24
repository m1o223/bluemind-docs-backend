import { mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { parseMultipartForm } from "../../http/multipart.js";
import { sendJson } from "../../http/response.js";
import { badRequest } from "../../utils/errors.js";
import { createId } from "../../utils/ids.js";
import { createPageImage } from "./service.js";

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function extensionFor(file) {
  const fromName = extname(file.fileName).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fromName)) return fromName;
  if (file.mimeType === "image/png") return ".png";
  if (file.mimeType === "image/jpeg") return ".jpg";
  if (file.mimeType === "image/gif") return ".gif";
  if (file.mimeType === "image/webp") return ".webp";
  return "";
}

export function registerUploadRoutes(router) {
  router.post("/api/uploads/image", async (ctx) => {
    const contentType = ctx.req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      throw badRequest("Image uploads must use multipart/form-data");
    }

    const { fields, files } = parseMultipartForm(ctx.rawBody, contentType);
    const pageId = fields.pageId;
    const file = files.image;

    if (!pageId) throw badRequest("pageId is required");
    if (!file || !file.buffer.length) throw badRequest("image file is required");
    if (!allowedImageTypes.has(file.mimeType)) throw badRequest("Only PNG, JPEG, GIF, and WebP images are supported");

    const imageId = createId();
    const extension = extensionFor(file);
    if (!extension) throw badRequest("Unsupported image extension");

    const relativeDir = join(ctx.user.id, pageId);
    const storageDir = join(ctx.config.imageStorageRoot, relativeDir);
    mkdirSync(storageDir, { recursive: true });

    const storedName = `${imageId}${extension}`;
    const storageKey = join(relativeDir, storedName).replace(/\\/g, "/");
    const storagePath = join(storageDir, storedName);
    writeFileSync(storagePath, file.buffer);

    const image = createPageImage(ctx.db, ctx.user.id, pageId, {
      storageKey,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.buffer.length,
      width: null,
      height: null,
      altText: fields.altText || null
    });

    const url = `/uploads/images/${storageKey}`;
    sendJson(ctx.res, 201, { data: { ...image, url } }, ctx.responseHeaders);
  });
}
