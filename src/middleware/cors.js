export function corsHeaders(origin = "*", requestOrigin = "") {
  const allowOrigin = origin === "*" ? (requestOrigin || "*") : origin;
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  };
}
