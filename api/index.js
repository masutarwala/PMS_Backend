// Vercel entry point: Vercel runs this function per request instead of `node src/server.js`
// (which calls app.listen). The Fastify app is built once per warm instance and reused.
import { buildApp } from '../src/app.js';

let appReady;

export default async function handler(req, res) {
  appReady ??= buildApp().then(async (app) => {
    await app.ready();
    return app;
  });
  const app = await appReady;
  app.server.emit('request', req, res);
}
