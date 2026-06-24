import { badRequest } from "../utils/errors.js";

function parseHeaderLine(line) {
  const [name, ...rest] = line.split(":");
  if (!name || rest.length === 0) return null;
  return [name.trim().toLowerCase(), rest.join(":").trim()];
}

function parseDisposition(value) {
  const result = {};
  for (const part of value.split(";")) {
    const [rawKey, rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = rawValue ? rawValue.replace(/^"|"$/g, "") : true;
  }
  return result;
}

export function parseMultipartForm(rawBody, contentType) {
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType || "");
  if (!boundaryMatch) throw badRequest("multipart boundary is missing");

  const boundary = `--${boundaryMatch[1]}`;
  const text = rawBody.toString("binary");
  const parts = text.split(boundary).slice(1, -1);
  const fields = {};
  const files = {};

  for (const rawPart of parts) {
    const normalized = rawPart.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const splitIndex = normalized.indexOf("\r\n\r\n");
    if (splitIndex === -1) continue;

    const headerText = normalized.slice(0, splitIndex);
    const bodyText = normalized.slice(splitIndex + 4);
    const headers = Object.fromEntries(
      headerText.split("\r\n").map(parseHeaderLine).filter(Boolean)
    );

    const disposition = parseDisposition(headers["content-disposition"] || "");
    const name = disposition.name;
    if (!name) continue;

    const buffer = Buffer.from(bodyText, "binary");
    if (disposition.filename) {
      files[name] = {
        fieldName: name,
        fileName: disposition.filename,
        mimeType: headers["content-type"] || "application/octet-stream",
        buffer
      };
    } else {
      fields[name] = buffer.toString("utf8");
    }
  }

  return { fields, files };
}
