import { randomBytes } from "node:crypto";
import { createId } from "../../utils/ids.js";
import { nowIso } from "../../utils/time.js";
import { badRequest } from "../../utils/errors.js";
import { rowToShareLink } from "../../db/database.js";
import { getPage } from "../pages/service.js";

export function getPageShare(db, userId, pageId) {
  getPage(db, userId, pageId);
  const row = db.prepare("SELECT * FROM page_share_links WHERE page_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1").get(pageId, userId);
  return row ? rowToShareLink(row) : null;
}

export function createOrEnablePageShare(db, userId, pageId) {
  getPage(db, userId, pageId);
  const existing = getPageShare(db, userId, pageId);
  const timestamp = nowIso();
  if (existing) {
    db.prepare("UPDATE page_share_links SET is_enabled = 1, updated_at = ? WHERE id = ? AND user_id = ?").run(timestamp, existing.id, userId);
    return getPageShare(db, userId, pageId);
  }

  const token = randomBytes(18).toString("base64url");
  db.prepare(`
    INSERT INTO page_share_links (id, page_id, user_id, token, is_enabled, permission, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 'view', ?, ?)
  `).run(createId(), pageId, userId, token, timestamp, timestamp);
  return getPageShare(db, userId, pageId);
}

export function setPageSharePrivacy(db, userId, pageId, isPrivate) {
  if (typeof isPrivate !== "boolean") throw badRequest("isPrivate must be a boolean");
  const share = createOrEnablePageShare(db, userId, pageId);
  const timestamp = nowIso();
  db.prepare("UPDATE page_share_links SET is_enabled = ?, updated_at = ? WHERE id = ? AND user_id = ?").run(isPrivate ? 0 : 1, timestamp, share.id, userId);
  return getPageShare(db, userId, pageId);
}

export function getSharedPageByToken(db, token) {
  if (!token) throw badRequest("share token is required");
  const row = db.prepare(`
    SELECT pages.*, page_share_links.permission, page_share_links.is_enabled
    FROM page_share_links
    JOIN pages ON pages.id = page_share_links.page_id
    WHERE page_share_links.token = ?
  `).get(token);
  if (!row || !row.is_enabled) return null;
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    content: JSON.parse(row.content_json || "[]"),
    permission: row.permission,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
