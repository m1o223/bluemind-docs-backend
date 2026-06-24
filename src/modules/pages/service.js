import { createId } from "../../utils/ids.js";
import { nowIso } from "../../utils/time.js";
import { notFound } from "../../utils/errors.js";
import { rowToPage } from "../../db/database.js";
import { getFolder } from "../folders/service.js";

const emptyContent = { type: "doc", blocks: [] };

export function createPage(db, userId, folderId, title, content = emptyContent) {
  getFolder(db, userId, folderId);

  const timestamp = nowIso();
  const page = {
    id: createId(),
    folderId,
    userId,
    title,
    content,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.prepare(`
    INSERT INTO pages (id, folder_id, user_id, title, content_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(page.id, page.folderId, page.userId, page.title, JSON.stringify(page.content), page.createdAt, page.updatedAt);

  return page;
}

export function listPages(db, userId, folderId = null) {
  if (folderId) {
    getFolder(db, userId, folderId);
    return db.prepare(`
      SELECT * FROM pages WHERE user_id = ? AND folder_id = ? ORDER BY updated_at DESC, title ASC
    `).all(userId, folderId).map(rowToPage);
  }

  return db.prepare(`
    SELECT * FROM pages WHERE user_id = ? ORDER BY updated_at DESC, title ASC
  `).all(userId).map(rowToPage);
}

export function getPage(db, userId, pageId) {
  const row = db.prepare(`
    SELECT * FROM pages WHERE id = ? AND user_id = ?
  `).get(pageId, userId);

  if (!row) throw notFound("Page");
  return rowToPage(row);
}

export function renamePage(db, userId, pageId, title) {
  getPage(db, userId, pageId);
  const timestamp = nowIso();

  db.prepare(`
    UPDATE pages SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?
  `).run(title, timestamp, pageId, userId);

  return getPage(db, userId, pageId);
}

export function updatePageContent(db, userId, pageId, content) {
  getPage(db, userId, pageId);
  const timestamp = nowIso();

  db.prepare(`
    UPDATE pages SET content_json = ?, updated_at = ? WHERE id = ? AND user_id = ?
  `).run(JSON.stringify(content), timestamp, pageId, userId);

  return getPage(db, userId, pageId);
}

export function deletePage(db, userId, pageId) {
  getPage(db, userId, pageId);
  db.prepare(`DELETE FROM pages WHERE id = ? AND user_id = ?`).run(pageId, userId);
}
