import { sendJson, sendNoContent } from "../../http/response.js";
import { optionalPositiveInteger, optionalString, requireObject, requireString } from "../../utils/validation.js";
import { createPageImage, deletePageImage, listPageImages } from "./service.js";

function validateImageInput(body) {
  return {
    storageKey: requireString(body.storageKey, "storageKey", { max: 500 }),
    fileName: requireString(body.fileName, "fileName", { max: 255 }),
    mimeType: requireString(body.mimeType, "mimeType", { max: 120 }),
    sizeBytes: optionalPositiveInteger(body.sizeBytes, "sizeBytes"),
    width: optionalPositiveInteger(body.width, "width"),
    height: optionalPositiveInteger(body.height, "height"),
    altText: optionalString(body.altText, "altText", { max: 500 })
  };
}

export function registerImageRoutes(router) {
  router.post("/api/pages/:pageId/images", async (ctx) => {
    const body = requireObject(ctx.body);
    const input = validateImageInput(body);
    const image = createPageImage(ctx.db, ctx.user.id, ctx.params.pageId, input);
    sendJson(ctx.res, 201, { data: image }, ctx.responseHeaders);
  });

  router.get("/api/pages/:pageId/images", async (ctx) => {
    const images = listPageImages(ctx.db, ctx.user.id, ctx.params.pageId);
    sendJson(ctx.res, 200, { data: images }, ctx.responseHeaders);
  });

  router.delete("/api/pages/:pageId/images/:imageId", async (ctx) => {
    deletePageImage(ctx.db, ctx.user.id, ctx.params.pageId, ctx.params.imageId);
    sendNoContent(ctx.res, ctx.responseHeaders);
  });
}
