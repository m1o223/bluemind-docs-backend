import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createRouter } from "./http/router.js";
import { parseRequestBody } from "./http/request.js";
import { sendJson } from "./http/response.js";
import { sendStaticFile } from "./http/static.js";
import { authenticate } from "./middleware/auth.js";
import { corsHeaders } from "./middleware/cors.js";
import { handleError } from "./middleware/errorHandler.js";
import { registerFolderRoutes } from "./modules/folders/routes.js";
import { registerPageRoutes } from "./modules/pages/routes.js";
import { registerImageRoutes } from "./modules/images/routes.js";
import { registerUploadRoutes } from "./modules/images/uploadRoutes.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerSharingRoutes } from "./modules/sharing/routes.js";

export function createApp({ db, config, logger }) {
  const router = createRouter();
  router.get("/health", async (ctx) => {
    const dbResult = ctx.db.prepare("SELECT 1 as ok").get();
    sendJson(ctx.res, 200, {
      status: "ok",
      database: dbResult.ok === 1 ? "connected" : "unavailable",
      time: new Date().toISOString()
    }, ctx.responseHeaders);
  });

  registerAuthRoutes(router);
  registerFolderRoutes(router);
  registerPageRoutes(router);
  registerImageRoutes(router);
  registerUploadRoutes(router);
  registerSharingRoutes(router);

  return createServer(async (req, res) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const responseHeaders = corsHeaders(config.corsOrigin, req.headers.origin || "");
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, responseHeaders);
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/uploads/images/")) {
      const uploadPath = url.pathname.replace("/uploads/images", "");
      if (sendStaticFile(res, config.imageStorageRoot, uploadPath, responseHeaders)) return;
    }


    const ctx = {
      req,
      res,
      db,
      config,
      logger,
      requestId,
      responseHeaders,
      url,
      body: {},
      rawBody: Buffer.alloc(0)
    };

    try {
      const parsed = await parseRequestBody(req, config.maxJsonBodyBytes);
      ctx.body = parsed.body;
      ctx.rawBody = parsed.rawBody;

      if (ctx.url.pathname.startsWith("/api/")) authenticate(ctx);

      const handled = await router.handle(ctx);
      if (!handled && !res.writableEnded) {
        sendJson(res, 404, { error: { code: "NOT_FOUND", message: "Route was not found" } }, responseHeaders);
      }
    } catch (error) {
      if (!res.writableEnded) handleError(error, ctx);
    } finally {
      logger.info("request completed", {
        requestId,
        method: req.method,
        path: url.pathname,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    }
  });
}



