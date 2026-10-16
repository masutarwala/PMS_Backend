import fp from 'fastify-plugin';
import { AppError } from '../utils/errors.js';
import { PASSWORD_RULE_TEXT } from '../utils/crypto.js';

// PostgreSQL error codes we translate into client errors.
const PG = {
  UNIQUE: '23505',
  FOREIGN_KEY: '23503',
  RESTRICT: '23001',
  CHECK: '23514',
  NOT_NULL: '23502',
  INVALID_TEXT: '22P02',
};

// Friendly messages for the unique constraints users can hit from the UI.
const UNIQUE_MESSAGES = {
  uq_users__username: 'This username is already taken',
  uq_users__emp_code: 'This employee code is already used',
  uq_roles__code: 'A role with this code already exists',
  uq_projects__code: 'A project with this code already exists',
};

function send(reply, statusCode, code, message, details) {
  return reply.status(statusCode).send({ statusCode, code, message, ...(details ? { details } : {}) });
}

/**
 * Single error format for the whole API:
 *   { statusCode, code, message, details? }
 */
async function errorHandler(fastify) {
  fastify.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError) {
      return send(reply, err.statusCode, err.code, err.message, err.details);
    }

    // Request schema validation (Ajv)
    if (err.validation) {
      const details = err.validation.map((v) => {
        const field = (v.params?.missingProperty || v.instancePath || '').replace(/^\//, '').replace(/\//g, '.');
        const isPasswordRule = v.keyword === 'pattern' && /password/i.test(field);
        return { field, message: isPasswordRule ? PASSWORD_RULE_TEXT : v.message };
      });
      return send(reply, 400, 'VALIDATION_ERROR', 'Some fields are invalid', details);
    }

    // PostgreSQL constraint errors
    switch (err.code) {
      case PG.RESTRICT:
        return send(reply, 409, 'IN_USE', 'This record is used by other records and cannot be removed', {
          constraint: err.constraint,
        });
      case PG.UNIQUE:
        return send(reply, 409, 'DUPLICATE', UNIQUE_MESSAGES[err.constraint] || 'This record already exists', {
          constraint: err.constraint,
        });
      case PG.FOREIGN_KEY:
        return send(
          reply,
          409,
          'IN_USE',
          err.message.includes('still referenced')
            ? 'This record is used by other records and cannot be removed'
            : 'A linked record does not exist',
          { constraint: err.constraint },
        );
      case PG.CHECK:
      case PG.NOT_NULL:
      case PG.INVALID_TEXT:
        return send(reply, 400, 'INVALID_DATA', 'The data is not valid', { constraint: err.constraint });
      default:
        break;
    }

    // Errors raised by Fastify / plugins with a status (401 from JWT, 429 from rate limit, 415, …)
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
    if (status < 500) {
      return send(reply, status, err.code || 'REQUEST_ERROR', err.message);
    }

    request.log.error({ err }, 'Unhandled error');
    return send(reply, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  });

  fastify.setNotFoundHandler((request, reply) =>
    send(reply, 404, 'ROUTE_NOT_FOUND', `Route ${request.method} ${request.url} not found`),
  );
}

export default fp(errorHandler, { name: 'error-handler' });
