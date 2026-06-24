import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function createDatabase(databasePath) {
  const resolvedPath = resolve(databasePath);
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const db = new DatabaseSync(resolvedPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");

  return db;
}

function columnExists(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

function addColumnIfMissing(db, table, column, definition) {
  if (!columnExists(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

export function migrateDatabase(db) {
  const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  db.exec(schema);
  addColumnIfMissing(db, "users", "password_hash", "TEXT");
  addColumnIfMissing(db, "users", "password_salt", "TEXT");
}

export function rowToUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function rowToFolder(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function rowToPage(row) {
  return {
    id: row.id,
    folderId: row.folder_id,
    userId: row.user_id,
    title: row.title,
    content: JSON.parse(row.content_json || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function rowToImage(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    userId: row.user_id,
    storageKey: row.storage_key,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    altText: row.alt_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function rowToShareLink(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    userId: row.user_id,
    token: row.token,
    isEnabled: Boolean(row.is_enabled),
    permission: row.permission,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
