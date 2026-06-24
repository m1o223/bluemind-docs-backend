import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { createId } from "../../utils/ids.js";
import { nowIso } from "../../utils/time.js";
import { badRequest, conflict, unauthorized } from "../../utils/errors.js";
import { rowToUser } from "../../db/database.js";

const SESSION_DAYS = 30;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createSession(db, userId) {
  const token = randomBytes(32).toString("hex");
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(createId(), userId, hashSessionToken(token), timestamp, expiresAt);
  return { token, expiresAt };
}

export function registerUser(db, { name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw badRequest("email is required");
  if (!name || String(name).trim().length < 1) throw badRequest("name is required");
  if (!password || String(password).length < 8) throw badRequest("password must be at least 8 characters");

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) throw conflict("An account with this email already exists");

  const timestamp = nowIso();
  const { salt, hash } = hashPassword(String(password));
  const userId = createId();
  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, password_salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, normalizedEmail, String(name).trim(), hash, salt, timestamp, timestamp);

  const user = rowToUser(db.prepare("SELECT * FROM users WHERE id = ?").get(userId));
  return { user, session: createSession(db, user.id) };
}

export function loginUser(db, { email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
  if (!row || !row.password_hash || !row.password_salt) throw unauthorized("Invalid email or password");
  if (!verifyPassword(String(password || ""), row.password_salt, row.password_hash)) {
    throw unauthorized("Invalid email or password");
  }
  return { user: rowToUser(row), session: createSession(db, row.id) };
}

export function getUserBySessionToken(db, token) {
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const row = db.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(tokenHash, nowIso());
  return row ? rowToUser(row) : null;
}

export function deleteSession(db, token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
}
