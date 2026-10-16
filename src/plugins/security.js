import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/env.js';

// Security headers, CORS for the React app, and a global rate limit
// (routes can tighten it with `config: { rateLimit: {...} }`, e.g. login).
async function securityPlugin(fastify) {
  await fastify.register(helmet, {
    // Swagger UI needs inline scripts/styles; the API itself only returns JSON.
    contentSecurityPolicy: false,
  });

  await fastify.register(cors, {
    origin: config.corsOrigins,
    credentials: true, // refresh-token cookie
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
  });
}

export default fp(securityPlugin, { name: 'security' });
