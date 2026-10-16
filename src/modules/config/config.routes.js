import { SCREENS } from '../../config/menus.js';
import { CONFIG_DEFS, LOOKUP_TYPES } from './config.defs.js';
import { crudRoutes } from './crud-factory.js';
import projectTypesRoutes from './project-types.routes.js';
import resourceGradesRoutes from './resource-grades.routes.js';

/** Configuration (master data) screens: /api/v1/config/<name> */
export default async function configRoutes(fastify) {
  // extra read-only endpoints first, so they are not taken as "/:id"
  await fastify.register(async (f) => {
    f.addHook('onRequest', f.authenticate);

    f.get(
      '/parameters/types',
      {
        schema: { tags: ['Parameters'], summary: 'Lookup types in use', response: { 200: { type: 'array', items: { type: 'string' } } } },
        preHandler: f.authorize(SCREENS.PARAMETERS, 'view'),
      },
      async () => {
        const { rows } = await f.db.query(`SELECT DISTINCT type FROM lookups ORDER BY type`);
        return [...new Set([...LOOKUP_TYPES, ...rows.map((r) => r.type)])].sort();
      },
    );

    f.get(
      '/customers/summary',
      {
        schema: {
          tags: ['Customers'],
          summary: 'Customer list summary cards',
          response: {
            200: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                active: { type: 'integer' },
                inactive: { type: 'integer' },
                createdThisQuarter: { type: 'integer' },
                totalByMonth: { type: 'array', items: { type: 'integer' } },
                projectsRunning: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    fixed: { type: 'integer' },
                    retainer: { type: 'integer' },
                    byMonth: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, count: { type: 'integer' } } } },
                  },
                },
                locations: { type: 'object', properties: { total: { type: 'integer' }, customersWith: { type: 'integer' }, customersWithout: { type: 'integer' } } },
              },
            },
          },
        },
        preHandler: f.authorize(SCREENS.CUSTOMERS, 'view'),
      },
      async () => {
        const [c, trend, running, months, loc] = await Promise.all([
          f.db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE is_active)::int AS active,
                             count(*) FILTER (WHERE created_at >= date_trunc('quarter', now()))::int AS quarter FROM customers`),
          f.db.query(`SELECT count(c.id)::int AS n
                        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m(month)
                        LEFT JOIN customers c ON c.created_at < m.month + interval '1 month'
                       GROUP BY m.month ORDER BY m.month`),
          f.db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE is_retainer_project)::int AS retainer
                        FROM projects WHERE customer_id IS NOT NULL AND status IN ('not_started', 'in_progress')`),
          // customer projects started per month, last 7 months
          f.db.query(`SELECT to_char(m.month, 'Mon') AS label, count(p.id)::int AS n
                        FROM generate_series(date_trunc('month', now()) - interval '6 months', date_trunc('month', now()), interval '1 month') m(month)
                        LEFT JOIN projects p ON p.customer_id IS NOT NULL AND date_trunc('month', p.start_date) = m.month
                       GROUP BY m.month ORDER BY m.month`),
          f.db.query(`SELECT (SELECT count(*)::int FROM customer_locations) AS total,
                             (SELECT count(DISTINCT customer_id)::int FROM customer_locations) AS with_loc`),
        ]);
        const r = c.rows[0];
        const run = running.rows[0];
        return {
          total: r.total,
          active: r.active,
          inactive: r.total - r.active,
          createdThisQuarter: r.quarter,
          totalByMonth: trend.rows.map((m) => m.n),
          projectsRunning: {
            total: run.total,
            fixed: run.total - run.retainer,
            retainer: run.retainer,
            byMonth: months.rows.map((m) => ({ label: m.label, count: m.n })),
          },
          locations: { total: loc.rows[0].total, customersWith: loc.rows[0].with_loc, customersWithout: r.total - loc.rows[0].with_loc },
        };
      },
    );
  });

  for (const def of CONFIG_DEFS) {
    await fastify.register(crudRoutes(def), { prefix: `/${def.name}` });
  }
  await fastify.register(projectTypesRoutes, { prefix: '/project-types' });
  await fastify.register(resourceGradesRoutes, { prefix: '/resource-grades' });
}
