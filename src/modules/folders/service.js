import { createId } from "../../utils/ids.js";
import { nowIso } from "../../utils/time.js";
import { notFound } from "../../utils/errors.js";
import { rowToFolder } from "../../db/database.js";

export function createFolder(db, userId, name) {
  const timestamp = nowIso();
  const folder = { id: createId(), userId, name, createdAt: timestamp, updatedAt: timestamp };

  db.prepare(`
    INSERT INTO folders (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(folder.id, folder.userId, folder.name, folder.createdAt, folder.updatedAt);

  return folder;
}

export function listFolders(db, userId) {
  return db.prepare(`
    SELECT * FROM folders WHERE user_id = ? ORDER BY updated_at DESC, name ASC
  `).all(userId).map(rowToFolder);
}

export function getFolder(db, userId, folderId) {
  const row = db.prepare(`
    SELECT * FROM folders WHERE id = ? AND user_id = ?
  `).get(folderId, userId);

  if (!row) throw notFound("Folder");
  return rowToFolder(row);
}

export function renameFolder(db, userId, folderId, name) {
  getFolder(db, userId, folderId);
  const timestamp = nowIso();

  db.prepare(`
    UPDATE folders SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?
  `).run(name, timestamp, folderId, userId);

  return getFolder(db, userId, folderId);
}

export function deleteFolder(db, userId, folderId) {
  getFolder(db, userId, folderId);
  db.prepare(`DELETE FROM folders WHERE id = ? AND user_id = ?`).run(folderId, userId);
}
