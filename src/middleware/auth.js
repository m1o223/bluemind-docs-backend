const PUBLIC_WORKSPACE_USER = {
  id: "public-workspace",
  email: "public@bluemind-docs.local",
  name: "BlueMind Docs"
};

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

export function getPublicWorkspaceUser(db) {
  const timestamp = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password_hash, password_salt, created_at, updated_at)
    VALUES (?, ?, ?, NULL, NULL, ?, ?)
  `).run(PUBLIC_WORKSPACE_USER.id, PUBLIC_WORKSPACE_USER.email, PUBLIC_WORKSPACE_USER.name, timestamp, timestamp);
  return db.prepare("SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?").get(PUBLIC_WORKSPACE_USER.id);
}

export function authenticate(ctx) {
  ctx.user = getPublicWorkspaceUser(ctx.db);
}
