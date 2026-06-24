import { badRequest } from "./errors.js";

export function requireObject(value, name = "body") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(`${name} must be an object`);
  }
  return value;
}

export function requireString(value, field, options = {}) {
  const min = options.min ?? 1;
  const max = options.max ?? 255;

  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw badRequest(`${field} must be at least ${min} character(s)`);
  }
  if (trimmed.length > max) {
    throw badRequest(`${field} must be at most ${max} character(s)`);
  }

  return trimmed;
}

export function optionalString(value, field, options = {}) {
  if (value === undefined || value === null) return null;
  return requireString(value, field, options);
}

export function requireJsonContent(value) {
  if (value === undefined) {
    throw badRequest("content is required");
  }

  if (typeof value !== "object" || value === null) {
    throw badRequest("content must be a JSON value containing document blocks");
  }

  return value;
}

export function optionalPositiveInteger(value, field) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 0) {
    throw badRequest(`${field} must be a positive integer`);
  }
  return value;
}
