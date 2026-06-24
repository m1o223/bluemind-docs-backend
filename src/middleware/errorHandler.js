import { AppError } from "../utils/errors.js";
import { sendJson } from "../http/response.js";

export function handleError(error, ctx) {
  if (error instanceof AppError) {
    ctx.logger.warn(error.message, { code: error.code, status: error.status, requestId: ctx.requestId });
    sendJson(ctx.res, error.status, {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    }, ctx.responseHeaders);
    return;
  }

  ctx.logger.error("Unhandled request error", {
    requestId: ctx.requestId,
    error: { message: error.message, stack: error.stack }
  });

  sendJson(ctx.res, 500, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred"
    }
  }, ctx.responseHeaders);
}
