export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new AppError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Authentication is required") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function notFound(resource = "Resource") {
  return new AppError(404, "NOT_FOUND", `${resource} was not found`);
}

export function conflict(message, details) {
  return new AppError(409, "CONFLICT", message, details);
}
