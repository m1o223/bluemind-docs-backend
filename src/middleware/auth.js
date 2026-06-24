import { unauthorized } from "../utils/errors.js";
import { getUserBySessionToken } from "../modules/auth/service.js";

const PUBLIC_API_ROUTES = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/me"
]);

export function isPublicApiRoute(pathname) {
  return PUBLIC_API_ROUTES.has(pathname) || pathname.startsWith("/api/share/");
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index === -1) return null;
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(Boolean));
}

export function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
  return cookies.bm_docs_session || bearer || null;
}

function cookieSecurityAttributes() {
  return process.env.VERCEL || process.env.NODE_ENV === "production" ? "SameSite=None; Secure" : "SameSite=Lax";
}

export function sessionCookie(token, expiresAt) {
  return `bm_docs_session=${encodeURIComponent(token)}; HttpOnly; ${cookieSecurityAttributes()}; Path=/; Expires=${new Date(expiresAt).toUTCString()}`;
}

export function clearSessionCookie() {
  return `bm_docs_session=; HttpOnly; ${cookieSecurityAttributes()}; Path=/; Max-Age=0`;
}

export function authenticate(ctx) {
  const user = getUserBySessionToken(ctx.db, getSessionToken(ctx.req));
  if (!user) throw unauthorized();
  ctx.user = user;
}

