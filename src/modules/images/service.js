import { createId } from "../../utils/ids.js";
import { nowIso } from "../../utils/time.js";
import { notFound } from "../../utils/errors.js";
import { rowToImage } from "../../db/database.js";
import { getPage } from "../pages/service.js";

export function createPageImage(db, userId, pageId, input) {
  getPage(db, userId, pageId);

  const timestamp = nowIso();
  const image = {
    id: createId(),
    pageId,
    userId,
    storageKey: input.storageKey,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    width: input.width,
    height: input.height,
    altText: input.altText,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.prepare(`
    INSERT INTO page_images (
      id, page_id, user_id, storage_key, file_name, mime_type,
      size_bytes, width, height, alt_text, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    image.id,
    image.pageId,
    image.userId,
    image.storageKey,
    image.fileName,
    image.mimeType,
    image.sizeBytes,
    image.width,
    image.height,
    image.altText,
    image.createdAt,
    image.updatedAt
  );

  return image;
}

export function listPageImages(db, userId, pageId) {
  getPage(db, userId, pageId);

  return db.prepare(`
    SELECT * FROM page_images WHERE page_id = ? AND user_id = ? ORDER BY created_at ASC
  `).all(pageId, userId).map(rowToImage);
}

export function deletePageImage(db, userId, pageId, imageId) {
  getPage(db, userId, pageId);

  const image = db.prepare(`
    SELECT * FROM page_images WHERE id = ? AND page_id = ? AND user_id = ?
  `).get(imageId, pageId, userId);

  if (!image) throw notFound("Image");
  db.prepare(`DELETE FROM page_images WHERE id = ? AND page_id = ? AND user_id = ?`).run(imageId, pageId, userId);
}
