import { SCREENS } from '../../config/menus.js';
import { writeAudit, diff } from '../../utils/audit.js';
import { badRequest, conflict, isReferenceError, notFound } from '../../utils/errors.js';
import { escapeLike, paginationQuerySchema, pagedResponseSchema, WhereBuilder } from '../../utils/query.js';

/*
 * Project types with their task template (tasks created for every new project of the type)
 * and default effort split (% per task group, must total 100). Saved together in one transaction.
 */

const tags = ['Project Types'];
const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } };

const template = {
  type: 'object',
  required: ['taskGroupId', 'taskTypeId', 'taskTitle'],
  additionalProperties: false,
  properties: {
    taskGroupId: { type: 'integer', minimum: 1 },
    taskTypeId: { type: 'integer', minimum: 1 },
    taskTitle: { type: 'string', minLength: 1, maxLength: 300 },
    description: { type: ['string', 'null'], maxLength: 5000 },
    effortPercentage: { type: ['number', 'null'], minimum: 0, maximum: 100 },
    managerApproval: { type: 'boolean', default: false },
    clientApproval: { type: 'boolean', default: false },
    roleIds: { type: 'array', items: { type: 'integer', minimum: 1 }, uniqueItems: true, maxItems: 20, default: [] },
  },
};
const estimate = {
  type: 'object',
  required: ['taskGroupId', 'effortPercentage'],
  additionalProperties: false,
  properties: {
    taskGroupId: { type: 'integer', minimum: 1 },
    effortPercentage: { type: 'number', minimum: 0, maximum: 100 },
  },
};
const body = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: ['string', 'null'], maxLength: 2000 },
    isActive: { type: 'boolean', default: true },
    templates: { type: 'array', items: template, default: [], maxItems: 200 },
    estimates: { type: 'array', items: estimate, default: [], maxItems: 50 },
  },
};
const listItem = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    isActive: { type: 'boolean' },
    taskCount: { type: 'integer' },
    projectCount: { type: 'integer' },
    split: {
      type: 'array',
      items: { type: 'object', properties: { taskGroupName: { type: 'string' }, effortPercentage: { type: 'number' } } },
    },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};
const detail = {
  ...listItem,
  properties: {
    ...listItem.properties,
    templates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskGroupId: { type: 'integer' },
          taskGroupName: { type: 'string' },
          taskTypeId: { type: 'integer' },
          taskTypeName: { type: 'string' },
          taskTitle: { type: 'string' },
          description: { type: ['string', 'null'] },
          effortPercentage: { type: ['number', 'null'] },
          managerApproval: { type: 'boolean' },
          clientApproval: { type: 'boolean' },
          roles: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } },
        },
      },
    },
    estimates: {
      type: 'array',
      items: {
        type: 'object',
        properties: { taskGroupId: { type: 'integer' }, taskGroupName: { type: 'string' }, effortPercentage: { type: 'number' } },
      },
    },
  },
};

const LIST_SELECT = `
  SELECT x.id, x.name, x.description, x.is_active, x.updated_at,
         (SELECT count(*)::int FROM project_type_task_templates t WHERE t.project_type_id = x.id) AS task_count,
         (SELECT count(*)::int FROM projects p WHERE p.project_type_id = x.id) AS project_count,
         COALESCE((SELECT json_agg(json_build_object('taskGroupName', g.name, 'effortPercentage', e.effort_percentage)
                                   ORDER BY e.effort_percentage DESC, g.name)
                     FROM project_type_default_estimates e JOIN task_groups g ON g.id = e.task_group_id
                    WHERE e.project_type_id = x.id), '[]') AS split
    FROM project_types x`;

const toListDto = (r) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  isActive: r.is_active,
  taskCount: r.task_count,
  projectCount: r.project_count,
  split: r.split.map((s) => ({ ...s, effortPercentage: Number(s.effortPercentage) })),
  updatedAt: r.updated_at,
});

async function getOne(db, id) {
  const { rows } = await db.query(`SELECT * FROM (${LIST_SELECT}) s WHERE s.id = $1`, [id]);
  if (!rows[0]) throw notFound('Project type');
  const [templates, estimates] = await Promise.all([
    db.query(
      `SELECT t.task_group_id, g.name AS group_name, t.task_type_id, tt.name AS type_name, t.task_title,
              t.description, t.effort_percentage, t.manager_approval, t.client_approval,
              COALESCE((SELECT json_agg(json_build_object('id', l.id, 'name', l.name) ORDER BY l.display_order, l.name)
                          FROM project_type_task_template_roles r JOIN lookups l ON l.id = r.role_id
                         WHERE r.task_template_id = t.id), '[]') AS roles
         FROM project_type_task_templates t
         JOIN task_groups g ON g.id = t.task_group_id JOIN task_types tt ON tt.id = t.task_type_id
        WHERE t.project_type_id = $1 ORDER BY t.sort_order, t.id`,
      [id],
    ),
    db.query(
      `SELECT e.task_group_id, g.name, e.effort_percentage FROM project_type_default_estimates e
         JOIN task_groups g ON g.id = e.task_group_id WHERE e.project_type_id = $1 ORDER BY e.effort_percentage DESC, g.name`,
      [id],
    ),
  ]);
  return {
    ...toListDto(rows[0]),
    templates: templates.rows.map((t) => ({
      taskGroupId: t.task_group_id,
      taskGroupName: t.group_name,
      taskTypeId: t.task_type_id,
      taskTypeName: t.type_name,
      taskTitle: t.task_title,
      description: t.description,
      effortPercentage: t.effort_percentage,
      managerApproval: t.manager_approval,
      clientApproval: t.client_approval,
      roles: t.roles,
    })),
    estimates: estimates.rows.map((e) => ({ taskGroupId: e.task_group_id, taskGroupName: e.name, effortPercentage: e.effort_percentage })),
  };
}

/**
 * When template tasks carry an effort %, they must total 100 and the default effort split is
 * calculated from them (sum per task group). Otherwise the split given in the body is used.
 */
function deriveSplit(b) {
  const withEffort = b.templates.filter((t) => t.effortPercentage !== null && t.effortPercentage !== undefined);
  if (!withEffort.length) return;
  const total = withEffort.reduce((s, t) => s + t.effortPercentage, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw badRequest(`Task efforts must total 100% (now ${Math.round(total * 100) / 100}%)`, [{ field: 'templates', message: 'efforts must total 100%' }]);
  }
  const byGroup = new Map();
  for (const t of withEffort) byGroup.set(t.taskGroupId, (byGroup.get(t.taskGroupId) ?? 0) + t.effortPercentage);
  b.estimates = [...byGroup].filter(([, pct]) => pct > 0).map(([taskGroupId, pct]) => ({ taskGroupId, effortPercentage: Math.round(pct * 100) / 100 }));
}

/** Effort split must total 100 (when given) and use each group once; template task types must belong to their group. */
async function validate(db, b) {
  deriveSplit(b);
  const groups = b.estimates.map((e) => e.taskGroupId);
  if (new Set(groups).size !== groups.length) throw badRequest('Each task group can appear only once in the effort split');
  if (b.estimates.length) {
    const total = b.estimates.reduce((s, e) => s + e.effortPercentage, 0);
    if (Math.abs(total - 100) > 0.001) {
      throw badRequest(`The default effort split must total 100% (now ${Math.round(total * 100) / 100}%)`, [{ field: 'estimates', message: 'must total 100%' }]);
    }
  }
  if (b.templates.length) {
    const { rows } = await db.query(`SELECT id, task_group_id FROM task_types WHERE id = ANY($1)`, [b.templates.map((t) => t.taskTypeId)]);
    const groupOf = new Map(rows.map((r) => [r.id, r.task_group_id]));
    b.templates.forEach((t, i) => {
      if (groupOf.get(t.taskTypeId) !== t.taskGroupId) {
        throw badRequest(`Task row ${i + 1}: the task type does not belong to the selected task group`, [{ field: `templates.${i}.taskTypeId`, message: 'does not belong to the task group' }]);
      }
    });
    const roleIds = [...new Set(b.templates.flatMap((t) => t.roleIds ?? []))];
    if (roleIds.length) {
      const { rows: roles } = await db.query(`SELECT id FROM lookups WHERE id = ANY($1) AND type = 'TASK_ROLE'`, [roleIds]);
      if (roles.length !== roleIds.length) throw badRequest('One of the assigned roles does not exist (Parameters → TASK_ROLE)');
    }
  }
}

async function saveChildren(client, id, b, userId) {
  await client.query(`DELETE FROM project_type_task_templates WHERE project_type_id = $1`, [id]);
  await client.query(`DELETE FROM project_type_default_estimates WHERE project_type_id = $1`, [id]);
  if (b.templates.length) {
    const T = b.templates;
    const { rows } = await client.query(
      `INSERT INTO project_type_task_templates
              (project_type_id, task_group_id, task_type_id, task_title, description, manager_approval, client_approval, effort_percentage, sort_order, created_by, updated_by)
       SELECT $1, g, t, title, descr, mgr, cli, eff, ord, $8, $8
         FROM unnest($2::bigint[], $3::bigint[], $4::text[], $5::text[], $6::bool[], $7::bool[], $9::numeric[]) WITH ORDINALITY AS u(g, t, title, descr, mgr, cli, eff, ord)
       RETURNING id, sort_order`,
      [
        id,
        T.map((t) => t.taskGroupId),
        T.map((t) => t.taskTypeId),
        T.map((t) => t.taskTitle.trim()),
        T.map((t) => t.description?.trim() || null),
        T.map((t) => !!t.managerApproval),
        T.map((t) => !!t.clientApproval),
        userId,
        T.map((t) => t.effortPercentage ?? null),
      ],
    );
    // sort_order is the 1-based row position, so it links each new row back to its roles
    const pairs = rows.flatMap((r) => (T[r.sort_order - 1].roleIds ?? []).map((roleId) => [r.id, roleId]));
    if (pairs.length) {
      await client.query(
        `INSERT INTO project_type_task_template_roles (task_template_id, role_id) SELECT * FROM unnest($1::bigint[], $2::bigint[])`,
        [pairs.map((p) => p[0]), pairs.map((p) => p[1])],
      );
    }
  }
  if (b.estimates.length) {
    await client.query(
      `INSERT INTO project_type_default_estimates (project_type_id, task_group_id, effort_percentage, created_by, updated_by)
       SELECT $1, g, pct, $4, $4 FROM unnest($2::bigint[], $3::numeric[]) AS u(g, pct)`,
      [id, b.estimates.map((e) => e.taskGroupId), b.estimates.map((e) => e.effortPercentage), userId],
    );
  }
}

const unique = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    if (err.code === '23505') throw conflict('A project type with this name already exists');
    throw err;
  }
};

export default async function projectTypesRoutes(fastify) {
  const { db, authorize } = fastify;
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get(
    '/',
    {
      schema: {
        tags,
        summary: 'List project types',
        querystring: {
          type: 'object',
          properties: {
            ...paginationQuerySchema,
            sortBy: { type: 'string', enum: ['name', 'taskCount', 'projectCount'] },
            isActive: { type: 'boolean' },
          },
        },
        response: { 200: pagedResponseSchema(listItem) },
      },
      preHandler: authorize(SCREENS.PROJECT_TYPES, 'view'),
    },
    async (req) => {
      const q = req.query;
      const where = new WhereBuilder();
      if (q.search) where.add(`(s.name ILIKE $? OR s.description ILIKE $?)`, `%${escapeLike(q.search)}%`, `%${escapeLike(q.search)}%`);
      if (q.isActive !== undefined) where.add(`s.is_active = $?`, q.isActive);
      const sort = { name: 's.name', taskCount: 's.task_count', projectCount: 's.project_count' }[q.sortBy] ?? 's.name';
      const limit = where.param(q.pageSize);
      const offset = where.param((q.page - 1) * q.pageSize);
      const { rows } = await db.query(
        `SELECT s.*, count(*) OVER()::int AS total FROM (${LIST_SELECT}) s ${where.toSql()}
          ORDER BY ${sort} ${q.sortDir === 'desc' ? 'DESC' : 'ASC'}, s.id LIMIT ${limit} OFFSET ${offset}`,
        where.params,
      );
      return { items: rows.map(toListDto), total: rows[0]?.total ?? 0, page: q.page, pageSize: q.pageSize };
    },
  );

  fastify.get('/:id', { schema: { tags, summary: 'Get a project type with template and split', params: idParams, response: { 200: detail } }, preHandler: authorize(SCREENS.PROJECT_TYPES, 'view') }, (req) =>
    getOne(db, req.params.id),
  );

  fastify.post(
    '/',
    { schema: { tags, summary: 'Create a project type', body, response: { 201: detail } }, preHandler: authorize(SCREENS.PROJECT_TYPES, 'create') },
    async (req, reply) => {
      const b = req.body;
      await validate(db, b);
      const id = await unique(() =>
        db.tx(async (client) => {
          const { rows } = await client.query(
            `INSERT INTO project_types (name, description, is_active, created_by, updated_by) VALUES ($1, $2, $3, $4, $4) RETURNING id`,
            [b.name.trim(), b.description?.trim() || null, b.isActive, req.auth.userId],
          );
          await saveChildren(client, rows[0].id, b, req.auth.userId);
          await writeAudit(client, { entity: 'project_types', entityId: rows[0].id, action: 'create', userId: req.auth.userId });
          return rows[0].id;
        }),
      );
      return reply.status(201).send(await getOne(db, id));
    },
  );

  fastify.put(
    '/:id',
    { schema: { tags, summary: 'Update a project type, its template and split', params: idParams, body, response: { 200: detail } }, preHandler: authorize(SCREENS.PROJECT_TYPES, 'edit') },
    async (req) => {
      const { id } = req.params;
      const b = req.body;
      const { rows } = await db.query(`SELECT * FROM project_types WHERE id = $1`, [id]);
      if (!rows[0]) throw notFound('Project type');
      await validate(db, b);
      await unique(() =>
        db.tx(async (client) => {
          const { rows: after } = await client.query(
            `UPDATE project_types SET name = $2, description = $3, is_active = $4, updated_by = $5 WHERE id = $1 RETURNING *`,
            [id, b.name.trim(), b.description?.trim() || null, b.isActive, req.auth.userId],
          );
          await saveChildren(client, id, b, req.auth.userId);
          await writeAudit(client, {
            entity: 'project_types',
            entityId: id,
            action: 'update',
            userId: req.auth.userId,
            message: 'Task template and effort split saved',
            changes: diff(rows[0], after[0], ['name', 'description', 'is_active']),
          });
        }),
      );
      return getOne(db, id);
    },
  );

  fastify.delete(
    '/:id',
    { schema: { tags, summary: 'Delete a project type (not used by projects)', params: idParams, response: { 204: { type: 'null' } } }, preHandler: authorize(SCREENS.PROJECT_TYPES, 'delete') },
    async (req, reply) => {
      try {
        const res = await db.tx(async (client) => {
          const r = await client.query(`DELETE FROM project_types WHERE id = $1`, [req.params.id]);
          if (r.rowCount) await writeAudit(client, { entity: 'project_types', entityId: req.params.id, action: 'delete', userId: req.auth.userId });
          return r;
        });
        if (!res.rowCount) throw notFound('Project type');
      } catch (err) {
        if (isReferenceError(err)) throw conflict('Projects use this project type – deactivate it instead');
        throw err;
      }
      return reply.status(204).send();
    },
  );
}
