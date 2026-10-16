import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { config } from '../config/env.js';
import { loadAuthContext, can } from '../modules/auth/auth-context.js';
import { forbidden, unauthorized } from '../utils/errors.js';

/**
 * Authentication + RBAC middleware.
 *
 *   onRequest: [fastify.authenticate]                       – valid access token + active user
 *   preHandler: [fastify.authorize(SCREENS.PROJECTS, 'create')] – role permission on a screen
 *
 * After `authenticate`, `request.auth` holds the user, role and permissions.
 */
async function authPlugin(fastify) {
  await fastify.register(cookie, { secret: config.auth.cookieSecret });
  await fastify.register(jwt, {
    secret: config.auth.accessSecret,
    sign: { expiresIn: config.auth.accessTtl },
  });

  fastify.decorateRequest('auth', null);

  fastify.decorate('authenticate', async function authenticate(request) {
    let payload;
    try {
      payload = await request.jwtVerify();
    } catch {
      throw unauthorized('Your session has expired. Please sign in again.');
    }
    const ctx = await loadAuthContext(fastify.db, Number(payload.sub));
    if (!ctx || !ctx.isActive) throw unauthorized('Your account is inactive');
    request.auth = ctx;
  });

  fastify.decorate('authorize', function authorize(screen, action = 'view') {
    return async function checkPermission(request) {
      if (!can(request.auth, screen, action)) {
        throw forbidden(`You do not have ${action} permission on this screen`);
      }
    };
  });

  // Passes when any one of the [screen, action] pairs is allowed.
  fastify.decorate('authorizeAny', function authorizeAny(pairs) {
    return async function checkAnyPermission(request) {
      if (!pairs.some(([screen, action]) => can(request.auth, screen, action))) throw forbidden();
    };
  });
}

export default fp(authPlugin, { name: 'auth', dependencies: ['db'] });
