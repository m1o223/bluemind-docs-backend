import { sendJson } from "../../http/response.js";
import { requireObject, requireString } from "../../utils/validation.js";
import { deleteSession, loginUser, registerUser } from "./service.js";
import { getPublicWorkspaceUser, getSessionToken, sessionCookie, clearSessionCookie } from "../../middleware/auth.js";

function authPayload(result) {
  return { user: result.user, expiresAt: result.session.expiresAt };
}

export function registerAuthRoutes(router) {
  router.post("/api/auth/register", async (ctx) => {
    const body = requireObject(ctx.body);
    const result = registerUser(ctx.db, {
      name: requireString(body.name, "name", { max: 120 }),
      email: requireString(body.email, "email", { max: 255 }),
      password: requireString(body.password, "password", { min: 8, max: 200 })
    });
    sendJson(ctx.res, 201, { data: authPayload(result) }, { ...ctx.responseHeaders, "set-cookie": sessionCookie(result.session.token, result.session.expiresAt) });
  });

  router.post("/api/auth/login", async (ctx) => {
    const body = requireObject(ctx.body);
    const result = loginUser(ctx.db, {
      email: requireString(body.email, "email", { max: 255 }),
      password: requireString(body.password, "password", { min: 1, max: 200 })
    });
    sendJson(ctx.res, 200, { data: authPayload(result) }, { ...ctx.responseHeaders, "set-cookie": sessionCookie(result.session.token, result.session.expiresAt) });
  });

  router.get("/api/auth/me", async (ctx) => {
    const user = getPublicWorkspaceUser(ctx.db);
    sendJson(ctx.res, 200, { data: { user } }, ctx.responseHeaders);
  });

  router.post("/api/auth/logout", async (ctx) => {
    deleteSession(ctx.db, getSessionToken(ctx.req));
    sendJson(ctx.res, 200, { data: { ok: true } }, { ...ctx.responseHeaders, "set-cookie": clearSessionCookie() });
  });
}

