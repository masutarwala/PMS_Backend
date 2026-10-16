import { config } from '../../config/env.js';
import * as service from './auth.service.js';
import * as schemas from './auth.schemas.js';

const REFRESH_COOKIE = 'pms_rt';

function setRefreshCookie(reply, token, expiresAt) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/api/v1/auth',
    // "Keep me signed in" → persistent cookie; otherwise a browser-session cookie.
    ...(service.isRememberToken(token) ? { expires: expiresAt } : {}),
  });
}

function clearRefreshCookie(reply) {
  reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}

export default async function authRoutes(fastify) {
  const { db } = fastify;
  const signAccess = (userId) => fastify.jwt.sign({ sub: String(userId) });

  fastify.post(
    '/login',
    {
      schema: schemas.loginSchema,
      // Brute-force protection on top of the per-account lockout.
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { username, password, rememberMe } = request.body;
      const userId = await service.verifyCredentials(db, username.trim(), password);
      const { refreshToken, expiresAt } = await service.createSession(db, userId, rememberMe);
      setRefreshCookie(reply, refreshToken, expiresAt);
      return { accessToken: signAccess(userId), ...(await service.getSessionInfo(db, userId)) };
    },
  );

  fastify.post(
    '/refresh',
    { schema: schemas.refreshSchema, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE];
      if (!token) {
        return reply.status(401).send({ statusCode: 401, code: 'UNAUTHORIZED', message: 'Not signed in' });
      }
      try {
        const { userId, refreshToken, expiresAt } = await service.rotateSession(db, token);
        setRefreshCookie(reply, refreshToken, expiresAt);
        return { accessToken: signAccess(userId), ...(await service.getSessionInfo(db, userId)) };
      } catch (err) {
        clearRefreshCookie(reply);
        throw err;
      }
    },
  );

  fastify.post('/logout', { schema: schemas.logoutSchema }, async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (token) await service.revokeSession(db, token);
    clearRefreshCookie(reply);
    return reply.status(204).send();
  });

  fastify.get('/me', { schema: schemas.meSchema, onRequest: [fastify.authenticate] }, async (request) =>
    service.getSessionInfo(db, request.auth),
  );

  fastify.post(
    '/change-password',
    { schema: schemas.changePasswordSchema, onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      await service.changePassword(db, request.auth.userId, currentPassword, newPassword, request.cookies[REFRESH_COOKIE]);
      return reply.status(204).send();
    },
  );
}
