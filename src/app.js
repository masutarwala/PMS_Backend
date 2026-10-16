import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { config } from './config/env.js';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import securityPlugin from './plugins/security.js';
import swaggerPlugin from './plugins/swagger.js';
import errorHandler from './plugins/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import rolesRoutes from './modules/roles/roles.routes.js';
import menusRoutes from './modules/menus/menus.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import mastersRoutes from './modules/masters/masters.routes.js';
import configRoutes from './modules/config/config.routes.js';
import timesheetsRoutes from './modules/timesheets/timesheets.routes.js';

export async function buildApp(opts = {}) {
  const app = Fastify({
    logger: opts.logger ?? {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      ...(config.isProd ? {} : { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }),
    },
    trustProxy: true,
    // Ajv: drop unknown body fields, coerce query strings, apply schema defaults.
    ajv: { customOptions: { removeAdditional: 'all', coerceTypes: 'array', useDefaults: true } },
  });

  // Infrastructure (order matters: db → auth depends on it)
  await app.register(sensible);
  await app.register(errorHandler);
  await app.register(securityPlugin);
  await app.register(swaggerPlugin);
  await app.register(dbPlugin);
  await app.register(authPlugin);

  app.get('/health', { schema: { hide: true } }, async () => {
    await app.db.query('SELECT 1');
    return { status: 'ok', time: new Date().toISOString() };
  });

  // Feature modules
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(usersRoutes, { prefix: '/users' });
      await api.register(rolesRoutes, { prefix: '/roles' });
      await api.register(menusRoutes, { prefix: '/menus' });
      await api.register(projectsRoutes, { prefix: '/projects' });
      await api.register(mastersRoutes, { prefix: '/masters' });
      await api.register(configRoutes, { prefix: '/config' });
      await api.register(timesheetsRoutes, { prefix: '/timesheets' });
    },
    { prefix: '/api/v1' },
  );

  return app;
}
