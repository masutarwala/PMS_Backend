import { CURRENT_COST } from '../config/resource-grades.routes.js';
// Read-only option lists for dropdowns (any signed-in user).
// Full CRUD for these masters comes with their own Administration screens later.

const option = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    code: { type: ['string', 'null'] },
    email: { type: ['string', 'null'] },
    groupId: { type: 'integer' },
    costPerHour: { type: ['number', 'null'] },
    currency: { type: ['string', 'null'] },
    gradeName: { type: ['string', 'null'] },
    teamName: { type: ['string', 'null'] },
    position: { type: ['string', 'null'] },
  },
};
const optionsResponse = { 200: { type: 'array', items: option } };
const activeQuery = {
  type: 'object',
  properties: { includeInactive: { type: 'boolean', default: false } },
};

const LISTS = {
  'project-divisions': `SELECT id, name FROM project_divisions WHERE is_active OR $1 ORDER BY name`,
  'project-types': `SELECT id, name FROM project_types WHERE is_active OR $1 ORDER BY name`,
  customers: `SELECT id, name, code FROM customers WHERE is_active OR $1 ORDER BY name`,
  sites: `SELECT id, name FROM sites WHERE is_active OR $1 ORDER BY name`,
  // "Dubai Shift (08:30 - 18:00)" like the old screens; shifts have no active flag
  shifts: `SELECT id, name || ' (' || to_char(start_time, 'HH24:MI') || ' - ' || to_char(end_time, 'HH24:MI') || ')' AS name
             FROM shifts ORDER BY start_time, name`,
  // grade, team position and hourly rate fill the project Users tab when a member is added
  users: `SELECT u.id, u.name, u.emp_code AS code, u.email, g.name AS grade_name, tm.name AS team_name,
                 u.hourly_rate AS cost_per_hour, u.hourly_rate_currency AS currency,
                 (SELECT ut.position FROM user_teams ut WHERE ut.user_id = u.id AND ut.position IS NOT NULL ORDER BY ut.team_id LIMIT 1) AS position
            FROM users u
            LEFT JOIN resource_grades rg ON rg.id = u.resource_grade_id
            LEFT JOIN lookups g ON g.id = rg.grade_id
            LEFT JOIN teams tm ON tm.id = rg.team_id
           WHERE u.is_active OR $1 ORDER BY u.name`,
  'task-groups': `SELECT id, name FROM task_groups ORDER BY name`,
  teams: `SELECT id, name FROM teams ORDER BY name`,
};

// used when no CURRENCY parameters are configured
export const CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR'];

export default async function mastersRoutes(fastify) {
  const { db } = fastify;
  fastify.addHook('onRequest', fastify.authenticate);

  for (const [path, sql] of Object.entries(LISTS)) {
    fastify.get(
      `/${path}`,
      { schema: { tags: ['Masters'], summary: `Options: ${path}`, querystring: activeQuery, response: optionsResponse } },
      async (req) =>
        (await db.query(sql, sql.includes('$1') ? [req.query.includeInactive] : [])).rows.map(
          ({ grade_name: gradeName, team_name: teamName, cost_per_hour: costPerHour, ...r }) =>
            gradeName !== undefined ? { ...r, gradeName, teamName, costPerHour: costPerHour == null ? null : Number(costPerHour), currency: r.currency?.trim() ?? null } : r,
        ),
    );
  }

  fastify.get(
    '/lookups/:type',
    {
      schema: {
        tags: ['Masters'],
        summary: 'Options from the lookups table (e.g. USER_TYPE)',
        params: { type: 'object', properties: { type: { type: 'string', maxLength: 50 } } },
        response: optionsResponse,
      },
    },
    async (req) =>
      (
        await db.query(
          `SELECT id, name, value AS code FROM lookups WHERE type = $1 AND is_visible ORDER BY display_order, name`,
          [req.params.type.toUpperCase()],
        )
      ).rows,
  );

  fastify.get(
    '/resource-grades',
    { schema: { tags: ['Masters'], summary: 'Options: resource grades with their current cost', response: optionsResponse } },
    async () =>
      (
        await db.query(
          // "SW India (Level C)" – team first, like the old screens; team-less grades show the grade only
          `SELECT x.id, CASE WHEN t.name IS NULL THEN g.name ELSE t.name || ' (' || g.name || ')' END AS name,
                  cc.cost_per_hour AS "costPerHour", trim(cc.currency) AS currency
             FROM resource_grades x JOIN lookups g ON g.id = x.grade_id LEFT JOIN teams t ON t.id = x.team_id
             ${CURRENT_COST}
            ORDER BY t.name NULLS FIRST, g.display_order, g.name`,
        )
      ).rows,
  );

  fastify.get(
    '/task-types',
    { schema: { tags: ['Masters'], summary: 'Options: task types (with their task group)', querystring: activeQuery, response: optionsResponse } },
    async (req) =>
      (await db.query(`SELECT id, name, task_group_id AS "groupId" FROM task_types WHERE is_active OR $1 ORDER BY name`, [req.query.includeInactive])).rows,
  );

  // Currency codes come from Parameters (type CURRENCY, value = ISO code)
  fastify.get(
    '/currencies',
    { schema: { tags: ['Masters'], summary: 'Currency codes', response: { 200: { type: 'array', items: { type: 'string' } } } } },
    async () => {
      const { rows } = await db.query(
        `SELECT upper(COALESCE(NULLIF(value, ''), name)) AS code FROM lookups
          WHERE type = 'CURRENCY' AND is_visible ORDER BY display_order, name`,
      );
      const codes = rows.map((r) => r.code).filter((c) => /^[A-Z]{3}$/.test(c));
      return codes.length ? codes : CURRENCIES;
    },
  );
}
