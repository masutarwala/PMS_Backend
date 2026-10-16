import { writeAudit, diff } from '../../utils/audit.js';
import { conflict, isReferenceError, notFound } from '../../utils/errors.js';
import { escapeLike, idList, paginationQuerySchema, pagedResponseSchema, WhereBuilder } from '../../utils/query.js';

/**
 * Builds list / get / create / update / delete routes for a simple master table.
 *
 * def = {
 *   name, label, table, screen,                 // screen = RBAC key (menus.url)
 *   fields: { apiName: { col, schema } },       // editable columns
 *   required: ['apiName'],
 *   select: 'SELECT … FROM <table> x …',        // row source; alias the table "x"
 *   computed: { apiName: schema },              // extra read-only output fields (snake_case in SQL)
 *   search: ['name', …],                         // output columns of `select` to search
 *   filters: { queryParam: { schema, sql: (where, value) => void } },
 *   sort: { apiName: 'sql expr' }, defaultSort,
 *   uniqueMessage, beforeSave(db, body, id)
 * }
 */
export function crudRoutes(def) {
  const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const outputProps = {
    id: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    // output only needs the JSON type (input constraints like pattern / anyOf stay on the body schema)
    ...Object.fromEntries(Object.entries(def.fields).map(([k, f]) => [k, f.schema.type ? { type: nullable(f.schema.type) } : {}])),
    ...(def.computed ?? {}),
  };
  const itemSchema = { type: 'object', properties: outputProps };
  const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } };
  const bodyProps = Object.fromEntries(Object.entries(def.fields).map(([k, f]) => [k, f.schema]));
  const tags = [def.label];

  const toDto = (row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === 'total') continue;
      out[toCamel(k)] = typeof v === 'string' && /^[A-Z]{3} ?$/.test(v) ? v.trim() : v;
    }
    return out;
  };

  return async function routes(fastify) {
    const { db, authorize } = fastify;
    fastify.addHook('onRequest', fastify.authenticate);

    const fetchOne = async (id) => {
      const { rows } = await db.query(`SELECT * FROM (${def.select}) s WHERE s.id = $1`, [id]);
      if (!rows[0]) throw notFound(def.label.replace(/s$/, ''));
      return toDto(rows[0]);
    };

    fastify.get(
      '/',
      {
        schema: {
          tags,
          summary: `List ${def.label.toLowerCase()}`,
          querystring: {
            type: 'object',
            properties: {
              ...paginationQuerySchema,
              pageSize: { type: 'integer', minimum: 1, maximum: 500, default: 10 },
              sortBy: { type: 'string', enum: Object.keys(def.sort ?? { name: 1 }) },
              ...Object.fromEntries(Object.entries(def.filters ?? {}).map(([k, f]) => [k, f.schema])),
            },
          },
          response: { 200: pagedResponseSchema(itemSchema) },
        },
        preHandler: authorize(def.screen, 'view'),
      },
      async (req) => {
        const q = req.query;
        const where = new WhereBuilder();
        if (q.search && def.search?.length) {
          const s = `%${escapeLike(q.search)}%`;
          where.add(`(${def.search.map((c) => `s.${c} ILIKE $?`).join(' OR ')})`, ...def.search.map(() => s));
        }
        for (const [k, f] of Object.entries(def.filters ?? {})) {
          if (q[k] !== undefined && q[k] !== '') f.sql(where, q[k], idList);
        }
        const sort = def.sort?.[q.sortBy] ?? def.defaultSort ?? 's.name';
        const limit = where.param(q.pageSize);
        const offset = where.param((q.page - 1) * q.pageSize);
        const { rows } = await db.query(
          `SELECT s.*, count(*) OVER()::int AS total FROM (${def.select}) s ${where.toSql()}
            ORDER BY ${sort} ${q.sortDir === 'desc' ? 'DESC' : 'ASC'} NULLS LAST, s.id
            LIMIT ${limit} OFFSET ${offset}`,
          where.params,
        );
        return { items: rows.map(toDto), total: rows[0]?.total ?? 0, page: q.page, pageSize: q.pageSize };
      },
    );

    fastify.get('/:id', { schema: { tags, summary: `Get one`, params: idParams, response: { 200: itemSchema } }, preHandler: authorize(def.screen, 'view') }, (req) =>
      fetchOne(req.params.id),
    );

    const columnsOf = (body) => {
      const cols = [];
      const vals = [];
      for (const [k, f] of Object.entries(def.fields)) {
        if (body[k] === undefined) continue;
        cols.push(f.col);
        vals.push(typeof body[k] === 'string' ? body[k].trim() || null : body[k]);
      }
      return { cols, vals };
    };
    const wrapUnique = async (fn) => {
      try {
        return await fn();
      } catch (err) {
        if (err.code === '23505') throw conflict(def.uniqueMessage ?? 'A record with this name already exists');
        throw err;
      }
    };

    fastify.post(
      '/',
      {
        schema: {
          tags,
          summary: 'Create',
          body: { type: 'object', required: def.required, additionalProperties: false, properties: bodyProps },
          response: { 201: itemSchema },
        },
        preHandler: authorize(def.screen, 'create'),
      },
      async (req, reply) => {
        if (def.beforeSave) await def.beforeSave(db, req.body, null);
        const { cols, vals } = columnsOf(req.body);
        for (const [col, v] of Object.entries(def.fixed ?? {})) {
          cols.push(col);
          vals.push(v);
        }
        if (def.audited !== false) {
          cols.push('created_by', 'updated_by');
          vals.push(req.auth.userId, req.auth.userId);
        }
        const id = await wrapUnique(() =>
          db.tx(async (client) => {
            const { rows } = await client.query(
              `INSERT INTO ${def.table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
              vals,
            );
            await writeAudit(client, { entity: def.table, entityId: rows[0].id, action: 'create', userId: req.auth.userId });
            return rows[0].id;
          }),
        );
        return reply.status(201).send(await fetchOne(id));
      },
    );

    fastify.put(
      '/:id',
      {
        schema: {
          tags,
          summary: 'Update',
          params: idParams,
          body: { type: 'object', additionalProperties: false, minProperties: 1, properties: bodyProps },
          response: { 200: itemSchema },
        },
        preHandler: authorize(def.screen, 'edit'),
      },
      async (req) => {
        const id = req.params.id;
        // raw row for the audit diff, limited to the rows this screen manages (e.g. one lookup type)
        const { rows: before } = await db.query(`SELECT * FROM ${def.table} WHERE id = $1 AND id IN (SELECT id FROM (${def.select}) s)`, [id]);
        if (!before[0]) throw notFound(def.label.replace(/s$/, ''));
        if (def.beforeSave) await def.beforeSave(db, req.body, id);
        const { cols, vals } = columnsOf(req.body);
        if (def.audited !== false) {
          cols.push('updated_by');
          vals.push(req.auth.userId);
        }
        await wrapUnique(() =>
          db.tx(async (client) => {
            const { rows: after } = await client.query(
              `UPDATE ${def.table} SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
              [id, ...vals],
            );
            await writeAudit(client, {
              entity: def.table,
              entityId: id,
              action: 'update',
              userId: req.auth.userId,
              changes: diff(before[0], after[0], Object.values(def.fields).map((f) => f.col)),
            });
          }),
        );
        return fetchOne(id);
      },
    );

    fastify.delete(
      '/:id',
      { schema: { tags, summary: 'Delete', params: idParams, response: { 204: { type: 'null' } } }, preHandler: authorize(def.screen, 'delete') },
      async (req, reply) => {
        const id = req.params.id;
        try {
          const { rowCount } = await db.tx(async (client) => {
            const res = await client.query(`DELETE FROM ${def.table} WHERE id = $1 AND id IN (SELECT id FROM (${def.select}) s)`, [id]);
            if (res.rowCount) await writeAudit(client, { entity: def.table, entityId: id, action: 'delete', userId: req.auth.userId });
            return res;
          });
          if (!rowCount) throw notFound(def.label.replace(/s$/, ''));
        } catch (err) {
          if (isReferenceError(err)) {
            throw conflict(def.inUseMessage ?? `This record is in use and cannot be deleted${def.fields.isActive ? ' – deactivate it instead' : ''}`);
          }
          throw err;
        }
        return reply.status(204).send();
      },
    );
  };
}

function nullable(type) {
  if (Array.isArray(type)) return type.includes('null') ? type : [...type, 'null'];
  return type === 'null' ? type : [type, 'null'];
}
