import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function isInside(base, candidate) {
  const relative = normalize(candidate).startsWith(normalize(base));
  return relative;
}

export function sendStaticFile(res, root, requestPath, headers = {}) {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const decoded = decodeURIComponent(cleanPath.split("?")[0]);
  const filePath = resolve(join(root, decoded));
  const resolvedRoot = resolve(root);

  if (!isInside(resolvedRoot, filePath) || !existsSync(filePath)) return false;

  const stats = statSync(filePath);
  if (!stats.isFile()) return false;

  res.writeHead(200, {
    "content-type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "content-length": stats.size,
    ...headers
  });
  createReadStream(filePath).pipe(res);
  return true;
}
