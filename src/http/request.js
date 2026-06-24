import { badRequest } from "../utils/errors.js";

export async function readRequestBody(req, maxBytes) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw badRequest("Request body is too large");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export function parseJsonBuffer(buffer) {
  if (!buffer.length) return {};

  const raw = buffer.toString("utf8");
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}

export async function parseRequestBody(req, maxBytes) {
  const method = req.method || "GET";
  if (["GET", "HEAD", "DELETE"].includes(method)) {
    return { body: {}, rawBody: Buffer.alloc(0) };
  }

  const rawBody = await readRequestBody(req, maxBytes);
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    return { body: {}, rawBody };
  }

  return { body: parseJsonBuffer(rawBody), rawBody };
}
