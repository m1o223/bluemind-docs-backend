import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

function numberFromEnv(key, fallback) {
  const raw = process.env[key];
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} must be a number`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV || "development",
  host: process.env.HOST || "127.0.0.1",
  port: numberFromEnv("PORT", 4000),
  databasePath: resolve(process.cwd(), process.env.DATABASE_PATH || "./data/bluemind-docs.sqlite"),
  logLevel: process.env.LOG_LEVEL || "info",
  maxJsonBodyBytes: numberFromEnv("MAX_JSON_BODY_BYTES", 1024 * 1024),
  imageStorageRoot: resolve(process.cwd(), process.env.IMAGE_STORAGE_ROOT || "./storage/images"),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  devAuthUserId: process.env.DEV_AUTH_USER_ID || "dev-user",
  devAuthEmail: process.env.DEV_AUTH_EMAIL || "dev@bluemind.local"
};
