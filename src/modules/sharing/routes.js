import { sendJson } from "../../http/response.js";
import { requireObject } from "../../utils/validation.js";
import { createOrEnablePageShare, getPageShare, getSharedPageByToken, setPageSharePrivacy } from "./service.js";

function sharePayload(ctx, share) {
  if (!share) return null;
  return {
    ...share,
    url: `${ctx.url.origin}/share/${share.token}`,
    isPrivate: !share.isEnabled
  };
}

export function registerSharingRoutes(router) {
  router.get("/api/share/:token", async (ctx) => {
    const page = getSharedPageByToken(ctx.db, ctx.params.token);
    sendJson(ctx.res, page ? 200 : 404, page ? { data: page } : { error: { code: "NOT_FOUND", message: "Shared page was not found" } }, ctx.responseHeaders);
  });

  router.get("/api/pages/:pageId/share", async (ctx) => {
    sendJson(ctx.res, 200, { data: sharePayload(ctx, getPageShare(ctx.db, ctx.user.id, ctx.params.pageId)) }, ctx.responseHeaders);
  });

  router.post("/api/pages/:pageId/share", async (ctx) => {
    const share = createOrEnablePageShare(ctx.db, ctx.user.id, ctx.params.pageId);
    sendJson(ctx.res, 201, { data: sharePayload(ctx, share) }, ctx.responseHeaders);
  });

  router.patch("/api/pages/:pageId/share", async (ctx) => {
    const body = requireObject(ctx.body);
    const share = setPageSharePrivacy(ctx.db, ctx.user.id, ctx.params.pageId, body.isPrivate);
    sendJson(ctx.res, 200, { data: sharePayload(ctx, share) }, ctx.responseHeaders);
  });
}

