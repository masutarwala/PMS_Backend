// Vercel entry point: Vercel runs this function per request instead of `node src/server.js`
// (which calls app.listen). The Fastify app is built once per warm instance and reused.
// The app is imported lazily so a startup problem (missing env variable, unreachable DB…)
// is reported as JSON and in the Vercel logs instead of a bare FUNCTION_INVOCATION_FAILED.
let appReady;

async function start() {
  const { buildApp } = await import('../src/app.js');
  const app = await buildApp();
  await app.ready();
  return app;
}

export default async function handler(req, res) {
  try {
    appReady ??= start();
    const app = await appReady;
    app.server.emit('request', req, res);
  } catch (err) {
    appReady = undefined; // retry on the next request
    console.error('API failed to start:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ statusCode: 500, code: 'STARTUP_FAILED', message: err.message }));
  }
}
