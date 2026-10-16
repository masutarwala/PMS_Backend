import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';

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
  // The docs UI is optional: it needs Node 22.12+ (its static-file dependency is ES-module only).
  // If it can't load, the API still starts – only /docs is missing.
  try {
    const { default: swaggerUi } = await import('@fastify/swagger-ui');
    await fastify.register(swaggerUi, { routePrefix: '/docs' });
  } catch (err) {
    fastify.log.warn({ err: err.message }, 'API docs UI (/docs) not available');
  }
}

export default fp(swaggerPlugin, { name: 'swagger' });
