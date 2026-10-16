import { buildApp } from './app.js';
import { config } from './config/env.js';

const app = await buildApp();

// Graceful shutdown: stop accepting requests, finish in-flight ones, close the DB pool.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    app.log.info(`${signal} received, shutting down`);
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info(`API docs: http://localhost:${config.port}/docs`);
} catch (err) {
  app.log.error({ err }, 'Failed to start');
  process.exit(1);
}
