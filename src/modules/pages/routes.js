import { sendJson, sendNoContent } from "../../http/response.js";
import { requireJsonContent, requireObject, requireString } from "../../utils/validation.js";
import { createPage, deletePage, getPage, listPages, renamePage, updatePageContent } from "./service.js";

export function registerPageRoutes(router) {
  router.post("/api/folders/:folderId/pages", async (ctx) => {
    const body = requireObject(ctx.body);
    const title = requireString(body.title, "title", { max: 180 });
    const content = body.content === undefined ? { type: "doc", blocks: [] } : requireJsonContent(body.content);
    const page = createPage(ctx.db, ctx.user.id, ctx.params.folderId, title, content);
    sendJson(ctx.res, 201, { data: page }, ctx.responseHeaders);
  });

  router.get("/api/folders/:folderId/pages", async (ctx) => {
    sendJson(ctx.res, 200, { data: listPages(ctx.db, ctx.user.id, ctx.params.folderId) }, ctx.responseHeaders);
  });

  router.get("/api/pages", async (ctx) => {
    const folderId = ctx.url.searchParams.get("folderId");
    sendJson(ctx.res, 200, { data: listPages(ctx.db, ctx.user.id, folderId) }, ctx.responseHeaders);
  });

  router.get("/api/pages/:pageId", async (ctx) => {
    sendJson(ctx.res, 200, { data: getPage(ctx.db, ctx.user.id, ctx.params.pageId) }, ctx.responseHeaders);
  });

  router.patch("/api/pages/:pageId", async (ctx) => {
    const body = requireObject(ctx.body);
    const title = requireString(body.title, "title", { max: 180 });
    const page = renamePage(ctx.db, ctx.user.id, ctx.params.pageId, title);
    sendJson(ctx.res, 200, { data: page }, ctx.responseHeaders);
  });

  router.patch("/api/pages/:pageId/content", async (ctx) => {
    const body = requireObject(ctx.body);
    const content = requireJsonContent(body.content);
    const page = updatePageContent(ctx.db, ctx.user.id, ctx.params.pageId, content);
    sendJson(ctx.res, 200, { data: page }, ctx.responseHeaders);
  });

  router.delete("/api/pages/:pageId", async (ctx) => {
    deletePage(ctx.db, ctx.user.id, ctx.params.pageId);
    sendNoContent(ctx.res, ctx.responseHeaders);
  });
}
