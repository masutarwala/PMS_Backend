import fp from 'fastify-plugin';
import pg from 'pg';
import { config } from '../config/env.js';

// bigint (int8) columns come back as strings by default; ids in this schema fit in a JS number.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => (v === null ? null : Number(v)));
// numeric stays a string by default; convert so the API returns numbers for hours / money.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
// date columns: keep 'YYYY-MM-DD' instead of a JS Date shifted by the server time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export function createPool() {
  return new pg.Pool({
    connectionString: config.db.connectionString,
    max: config.db.max,
    ssl: config.db.ssl,
  });
}

/**
 * Decorates the instance with `db`:
 *   db.query(text, params)        – single statement
 *   db.tx(async (client) => {...}) – runs the callback in a transaction
 */
async function dbPlugin(fastify) {
  const pool = createPool();
  pool.on('error', (err) => fastify.log.error({ err }, 'Unexpected PostgreSQL pool error'));

  // Fail fast at boot if the database is unreachable.
  const client = await pool.connect();
  client.release();

  const db = {
    pool,
    query: (text, params) => pool.query(text, params),
    async tx(fn) {
      const conn = await pool.connect();
      try {
        await conn.query('BEGIN');
        const result = await fn(conn);
        await conn.query('COMMIT');
        return result;
      } catch (err) {
        await conn.query('ROLLBACK');
        throw err;
      } finally {
        conn.release();
      }
    },
  };

  fastify.decorate('db', db);
  fastify.addHook('onClose', async () => pool.end());
}

export default fp(dbPlugin, { name: 'db' });
