import { createRequire } from 'node:module';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';

const require = createRequire(import.meta.url);

/**
 * The docs UI serves its files through @fastify/static, whose dependencies are ES-module only and
 * need Node 22.12+ (require of ES modules). swagger-ui loads it lazily during startup, so a failure
 * would stop the whole API – check up front and skip only the /docs page instead.
 */
function docsUiAvailable(log) {
  try {
    const fromSwaggerUi = createRequire(require.resolve('@fastify/swagger-ui'));
    fromSwaggerUi('@fastify/static');
    return true;
  } catch (err) {
    log.warn({ err: err.message }, `API docs UI (/docs) not available on Node ${process.version}`);
    return false;
  }
}

// OpenAPI docs generated from the route schemas: http://localhost:4000/docs
async function swaggerPlugin(fastify) {
  await fastify.register(swagger, {
    openapi: {
      info: { title: 'emQube PMS API', version: '0.1.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  if (docsUiAvailable(fastify.log)) {
    const { default: swaggerUi } = await import('@fastify/swagger-ui');
    await fastify.register(swaggerUi, { routePrefix: '/docs' });
  }
}

export default fp(swaggerPlugin, { name: 'swagger' });
