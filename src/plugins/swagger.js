import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

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
  await fastify.register(swaggerUi, { routePrefix: '/docs' });
}

export default fp(swaggerPlugin, { name: 'swagger' });
