// Application errors carry an HTTP status and a stable machine-readable code.
// The global error handler (plugins/error-handler.js) turns them into JSON responses.
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Record') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (message, details) => new AppError(409, 'CONFLICT', message, details);

// 23503 = foreign_key_violation (NO ACTION), 23001 = restrict_violation (ON DELETE RESTRICT)
export const isReferenceError = (err) => err?.code === '23503' || err?.code === '23001';
