import { sendJson, sendNoContent } from "../../http/response.js";
import { requireObject, requireString } from "../../utils/validation.js";
import { createFolder, deleteFolder, getFolder, listFolders, renameFolder } from "./service.js";

export function registerFolderRoutes(router) {
  router.post("/api/folders", async (ctx) => {
    const body = requireObject(ctx.body);
    const name = requireString(body.name, "name", { max: 120 });
    const folder = createFolder(ctx.db, ctx.user.id, name);
    sendJson(ctx.res, 201, { data: folder }, ctx.responseHeaders);
  });

  router.get("/api/folders", async (ctx) => {
    sendJson(ctx.res, 200, { data: listFolders(ctx.db, ctx.user.id) }, ctx.responseHeaders);
  });

  router.get("/api/folders/:folderId", async (ctx) => {
    sendJson(ctx.res, 200, { data: getFolder(ctx.db, ctx.user.id, ctx.params.folderId) }, ctx.responseHeaders);
  });

  router.patch("/api/folders/:folderId", async (ctx) => {
    const body = requireObject(ctx.body);
    const name = requireString(body.name, "name", { max: 120 });
    const folder = renameFolder(ctx.db, ctx.user.id, ctx.params.folderId, name);
    sendJson(ctx.res, 200, { data: folder }, ctx.responseHeaders);
  });

  router.delete("/api/folders/:folderId", async (ctx) => {
    deleteFolder(ctx.db, ctx.user.id, ctx.params.folderId);
    sendNoContent(ctx.res, ctx.responseHeaders);
  });
}
