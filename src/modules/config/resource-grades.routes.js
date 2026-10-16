import { SCREENS } from '../../config/menus.js';
import { writeAudit } from '../../utils/audit.js';
import { badRequest, conflict, isReferenceError, notFound } from '../../utils/errors.js';
import { escapeLike, paginationQuerySchema, pagedResponseSchema, WhereBuilder } from '../../utils/query.js';

/*
 * Resource grades (grade = lookup type GRADE, optionally per team) with their cost-per-hour history.
 * Users point at a resource grade; the user form pre-fills the hourly rate from the current cost.
 */

const tags = ['Resource Grades'];
const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } };
const date = { type: 'string', format: 'date' };

const cost = {
  type: 'object',
  required: ['costPerHour', 'currency', 'fromDate'],
  additionalProperties: false,
  properties: {
    costPerHour: { type: 'number', minimum: 0, maximum: 9999999 },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    fromDate: date,
    toDate: { anyOf: [date, { type: 'null' }] },
  },
};
const body = {
  type: 'object',
  required: ['gradeId'],
  additionalProperties: false,
  properties: {
    gradeId: { type: 'integer', minimum: 1 },
    teamId: { type: ['integer', 'null'], minimum: 1 },
    costs: { type: 'array', items: cost, default: [], maxItems: 100 },
  },
};
const item = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    gradeId: { type: 'integer' },
    gradeName: { type: 'string' },
    teamId: { type: ['integer', 'null'] },
    teamName: { type: ['string', 'null'] },
    userCount: { type: 'integer' },
    currentCost: { type: ['number', 'null'] },
    currentCurrency: { type: ['string', 'null'] },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
const detail = {
  ...item,
  properties: {
    ...item.properties,
    costs: {
      type: 'array',
      items: {
        type: 'object',
        properties: { costPerHour: { type: 'number' }, currency: { type: 'string' }, fromDate: { type: 'string' }, toDate: { type: ['string', 'null'] } },
      },
    },
  },
};

// current cost = the period covering today, else the latest one
export const CURRENT_COST = `
  LEFT JOIN LATERAL (
    SELECT c.cost_per_hour, c.currency FROM resource_grade_costs c
     WHERE c.resource_grade_id = x.id
     ORDER BY (c.from_date <= current_date AND (c.to_date IS NULL OR c.to_date >= current_date)) DESC, c.from_date DESC
     LIMIT 1) cc ON true`;

const SELECT = `
  SELECT x.id, x.grade_id, g.name AS grade_name, g.display_order, x.team_id, t.name AS team_name, x.updated_at,
         (SELECT count(*)::int FROM users u WHERE u.resource_grade_id = x.id) AS user_count,
         cc.cost_per_hour AS current_cost, trim(cc.currency) AS current_currency
    FROM resource_grades x
    JOIN lookups g ON g.id = x.grade_id
    LEFT JOIN teams t ON t.id = x.team_id
    ${CURRENT_COST}`;

const toDto = (r) => ({
  id: r.id,
  gradeId: r.grade_id,
  gradeName: r.grade_name,
  teamId: r.team_id,
  teamName: r.team_name,
  userCount: r.user_count,
  currentCost: r.current_cost,
  currentCurrency: r.current_currency,
  updatedAt: r.updated_at,
});

async function getOne(db, id) {
  const { rows } = await db.query(`SELECT * FROM (${SELECT}) s WHERE s.id = $1`, [id]);
  if (!rows[0]) throw notFound('Resource grade');
  const costs = await db.query(
    `SELECT cost_per_hour, trim(currency) AS currency, from_date, to_date FROM resource_grade_costs
      WHERE resource_grade_id = $1 ORDER BY from_date DESC`,
    [id],
  );
  return {
    ...toDto(rows[0]),
    costs: costs.rows.map((c) => ({ costPerHour: c.cost_per_hour, currency: c.currency, fromDate: c.from_date, toDate: c.to_date })),
  };
}

/** Grade must be a GRADE lookup, unique per team; cost periods must be valid and must not overlap. */
async function validate(db, b, id) {
  const { rows } = await db.query(`SELECT 1 FROM lookups WHERE id = $1 AND type = 'GRADE'`, [b.gradeId]);
  if (!rows.length) throw badRequest('Select a grade (Parameters → GRADE)', [{ field: 'gradeId', message: 'is not a grade' }]);
  const dup = await db.query(
    `SELECT 1 FROM resource_grades WHERE grade_id = $1 AND team_id IS NOT DISTINCT FROM $2 AND id IS DISTINCT FROM $3`,
    [b.gradeId, b.teamId ?? null, id],
  );
  if (dup.rowCount) throw conflict('This grade already exists for the selected team');

  const periods = [...b.costs].sort((a, c) => a.fromDate.localeCompare(c.fromDate));
  periods.forEach((p, i) => {
    if (p.toDate && p.toDate < p.fromDate) throw badRequest(`Cost from ${p.fromDate}: the end date is before the start date`);
    const next = periods[i + 1];
    if (next && (!p.toDate || p.toDate >= next.fromDate)) {
      throw badRequest(`Cost periods overlap (${p.fromDate} and ${next.fromDate}). End the earlier period before the next one starts.`);
    }
  });
}

async function saveCosts(client, id, costs, userId) {
  await client.query(`DELETE FROM resource_grade_costs WHERE resource_grade_id = $1`, [id]);
  if (!costs.length) return;
  await client.query(
    `INSERT INTO resource_grade_costs (resource_grade_id, cost_per_hour, currency, from_date, to_date, created_by, updated_by)
     SELECT $1, c, cur, f, t, $6, $6 FROM unnest($2::numeric[], $3::text[], $4::date[], $5::date[]) AS u(c, cur, f, t)`,
    [id, costs.map((c) => c.costPerHour), costs.map((c) => c.currency), costs.map((c) => c.fromDate), costs.map((c) => c.toDate ?? null), userId],
  );
}

export default async function resourceGradesRoutes(fastify) {
  const { db, authorize } = fastify;
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get(
    '/',
    {
      schema: {
        tags,
        summary: 'List resource grades',
        querystring: { type: 'object', properties: { ...paginationQuerySchema, teamId: { type: 'string' } } },
        response: { 200: pagedResponseSchema(item) },
      },
      preHandler: authorize(SCREENS.RESOURCE_GRADES, 'view'),
    },
    async (req) => {
      const q = req.query;
      const where = new WhereBuilder();
      if (q.search) where.add(`(s.grade_name ILIKE $? OR s.team_name ILIKE $?)`, `%${escapeLike(q.search)}%`, `%${escapeLike(q.search)}%`);
      const limit = where.param(q.pageSize);
      const offset = where.param((q.page - 1) * q.pageSize);
      const { rows } = await db.query(
        `SELECT s.*, count(*) OVER()::int AS total FROM (${SELECT}) s ${where.toSql()}
          ORDER BY s.team_name NULLS FIRST, s.display_order, s.grade_name LIMIT ${limit} OFFSET ${offset}`,
        where.params,
      );
      return { items: rows.map(toDto), total: rows[0]?.total ?? 0, page: q.page, pageSize: q.pageSize };
    },
  );

  fastify.get('/:id', { schema: { tags, summary: 'Get a resource grade with its cost history', params: idParams, response: { 200: detail } }, preHandler: authorize(SCREENS.RESOURCE_GRADES, 'view') }, (req) =>
    getOne(db, req.params.id),
  );

  fastify.post(
    '/',
    { schema: { tags, summary: 'Create a resource grade', body, response: { 201: detail } }, preHandler: authorize(SCREENS.RESOURCE_GRADES, 'create') },
    async (req, reply) => {
      const b = req.body;
      await validate(db, b, null);
      const id = await db.tx(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO resource_grades (grade_id, team_id, created_by, updated_by) VALUES ($1, $2, $3, $3) RETURNING id`,
          [b.gradeId, b.teamId ?? null, req.auth.userId],
        );
        await saveCosts(client, rows[0].id, b.costs, req.auth.userId);
        await writeAudit(client, { entity: 'resource_grades', entityId: rows[0].id, action: 'create', userId: req.auth.userId });
        return rows[0].id;
      });
      return reply.status(201).send(await getOne(db, id));
    },
  );

  fastify.put(
    '/:id',
    { schema: { tags, summary: 'Update a resource grade and its costs', params: idParams, body, response: { 200: detail } }, preHandler: authorize(SCREENS.RESOURCE_GRADES, 'edit') },
    async (req) => {
      const { id } = req.params;
      const b = req.body;
      const { rowCount } = await db.query(`SELECT 1 FROM resource_grades WHERE id = $1`, [id]);
      if (!rowCount) throw notFound('Resource grade');
      await validate(db, b, id);
      await db.tx(async (client) => {
        await client.query(`UPDATE resource_grades SET grade_id = $2, team_id = $3, updated_by = $4 WHERE id = $1`, [id, b.gradeId, b.teamId ?? null, req.auth.userId]);
        await saveCosts(client, id, b.costs, req.auth.userId);
        await writeAudit(client, { entity: 'resource_grades', entityId: id, action: 'update', userId: req.auth.userId, message: 'Grade and cost history saved' });
      });
      return getOne(db, id);
    },
  );

  fastify.delete(
    '/:id',
    { schema: { tags, summary: 'Delete a resource grade (no users on it)', params: idParams, response: { 204: { type: 'null' } } }, preHandler: authorize(SCREENS.RESOURCE_GRADES, 'delete') },
    async (req, reply) => {
      try {
        const res = await db.tx(async (client) => {
          const r = await client.query(`DELETE FROM resource_grades WHERE id = $1`, [req.params.id]);
          if (r.rowCount) await writeAudit(client, { entity: 'resource_grades', entityId: req.params.id, action: 'delete', userId: req.auth.userId });
          return r;
        });
        if (!res.rowCount) throw notFound('Resource grade');
      } catch (err) {
        if (isReferenceError(err)) throw conflict('Users are on this grade – move them to another grade first');
        throw err;
      }
      return reply.status(204).send();
    },
  );
}
