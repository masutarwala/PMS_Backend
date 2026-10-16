import { writeAudit } from '../../utils/audit.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import { exact } from '../../utils/number.js';
import { escapeLike, idList, WhereBuilder } from '../../utils/query.js';

/*
 * Timesheet: users log time against the projects they are assigned to (owner or member).
 * Only task groups that have a share in the project estimate can be used, so every hour
 * lands in a group the project Analysis tracks (allocated % vs actual hours).
 */

const SORT_COLUMNS = { workDate: 't.work_date', minutes: 't.minutes', project: 'p.title', createdAt: 't.created_at' };
const DAY_LIMIT = 24 * 60;

const SELECT = `
  SELECT t.id, t.user_id, u.name AS user_name, t.work_date, t.project_id, p.code AS project_code, p.title AS project_title,
         t.task_type_id, tt.name AS task_type_name, tt.task_group_id, g.name AS task_group_name,
         t.task_id, tk.name AS task_name, t.minutes, t.comment, t.is_billable, t.created_at, t.updated_at
    FROM timesheets t
    JOIN users u ON u.id = t.user_id
    JOIN projects p ON p.id = t.project_id
    JOIN task_types tt ON tt.id = t.task_type_id
    JOIN task_groups g ON g.id = tt.task_group_id
    LEFT JOIN tasks tk ON tk.id = t.task_id`;

const toDto = (r) => ({
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  workDate: r.work_date,
  projectId: r.project_id,
  projectCode: r.project_code,
  projectTitle: r.project_title,
  taskGroupId: r.task_group_id,
  taskGroupName: r.task_group_name,
  taskTypeId: r.task_type_id,
  taskTypeName: r.task_type_name,
  taskId: r.task_id,
  taskName: r.task_name,
  minutes: r.minutes,
  hours: exact(r.minutes / 60),
  comment: r.comment,
  isBillable: r.is_billable,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const hrs = (minutes) => exact(Number(minutes) / 60);

/** The Team tab is for Project Managers and the Super Admin only. */
export const canSeeTeam = (auth) => auth.isSuperAdmin || auth.role.code === 'PROJECT_MANAGER';

/**
 * Entries the user may see on the Team tab:
 *   - all time logged on projects they manage (owner, or member with "Can edit" access)
 *   - plus the role's data scope: all = everyone, team = people in their teams, others = own only
 */
function applyScope(where, auth, scope) {
  if (scope === 'team' && !canSeeTeam(auth)) throw forbidden('Only project managers can see the team timesheet');
  if (scope !== 'team') {
    where.add('t.user_id = $?', auth.userId);
    return;
  }
  if (auth.isSuperAdmin || auth.role.dataScope === 'all') return;
  const managed = `t.project_id IN (SELECT p2.id FROM projects p2 WHERE p2.owner_id = $?
                     UNION SELECT pm.project_id FROM project_members pm WHERE pm.user_id = $? AND pm.access_level = 'edit')`;
  if (auth.role.dataScope === 'team') {
    where.add(
      `(t.user_id = $? OR ${managed}
         OR t.user_id IN (SELECT other.user_id FROM user_teams mine JOIN user_teams other ON other.team_id = mine.team_id WHERE mine.user_id = $?))`,
      auth.userId,
      auth.userId,
      auth.userId,
      auth.userId,
    );
    return;
  }
  where.add(`(t.user_id = $? OR ${managed})`, auth.userId, auth.userId, auth.userId);
}

function buildFilters(auth, q) {
  const where = new WhereBuilder();
  applyScope(where, auth, q.scope);
  if (q.search) {
    const s = `%${escapeLike(q.search.trim())}%`;
    where.add(`(p.title ILIKE $? OR p.code ILIKE $? OR t.comment ILIKE $? OR tt.name ILIKE $?)`, s, s, s, s);
  }
  const projectIds = idList(q.projectId);
  if (projectIds.length) where.add('t.project_id = ANY($?)', projectIds);
  const userIds = idList(q.userId);
  if (userIds.length) where.add('t.user_id = ANY($?)', userIds);
  const groupIds = idList(q.taskGroupId);
  if (groupIds.length) where.add('tt.task_group_id = ANY($?)', groupIds);
  if (q.isBillable !== undefined) where.add('t.is_billable = $?', q.isBillable);
  if (q.from) where.add('t.work_date >= $?', q.from);
  if (q.to) where.add('t.work_date <= $?', q.to);
  return where;
}

export async function listTimesheets(db, auth, q) {
  const where = buildFilters(auth, q);
  const sort = SORT_COLUMNS[q.sortBy] ?? SORT_COLUMNS.workDate;
  const dir = q.sortDir === 'asc' ? 'ASC' : 'DESC';
  const limit = where.param(q.pageSize);
  const offset = where.param((q.page - 1) * q.pageSize);
  const { rows } = await db.query(`${SELECT} ${where.toSql()} ORDER BY ${sort} ${dir}, t.id DESC LIMIT ${limit} OFFSET ${offset}`, where.params);

  const countWhere = buildFilters(auth, q);
  const { rows: totals } = await db.query(
    `SELECT count(*)::int AS total, COALESCE(SUM(t.minutes), 0)::int AS minutes
       FROM timesheets t JOIN projects p ON p.id = t.project_id JOIN task_types tt ON tt.id = t.task_type_id ${countWhere.toSql()}`,
    countWhere.params,
  );
  return { items: rows.map(toDto), total: totals[0].total, totalMinutes: totals[0].minutes, totalHours: hrs(totals[0].minutes), page: q.page, pageSize: q.pageSize };
}

/** Summary cards: this week (Mon–Sun) for the user, or the team scope. */
export async function timesheetSummary(db, auth, q) {
  const where = new WhereBuilder();
  applyScope(where, auth, q.scope);
  where.add(`t.work_date BETWEEN date_trunc('week', current_date)::date AND (date_trunc('week', current_date) + interval '6 days')::date`);
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(t.minutes), 0)::int AS total,
            COALESCE(SUM(t.minutes) FILTER (WHERE t.is_billable), 0)::int AS billable,
            COALESCE(SUM(t.minutes) FILTER (WHERE t.work_date = current_date), 0)::int AS today,
            count(DISTINCT t.project_id)::int AS projects,
            count(DISTINCT t.project_id) FILTER (WHERE p.customer_id IS NOT NULL)::int AS client_projects,
            count(DISTINCT t.work_date)::int AS days
       FROM timesheets t JOIN projects p ON p.id = t.project_id ${where.toSql()}`,
    where.params,
  );
  const r = rows[0];
  return {
    weekHours: hrs(r.total),
    billableHours: hrs(r.billable),
    nonBillableHours: hrs(r.total - r.billable),
    todayHours: hrs(r.today),
    projects: r.projects,
    clientProjects: r.client_projects,
    internalProjects: r.projects - r.client_projects,
    daysLogged: r.days,
  };
}

/**
 * What the Log time form offers: the user's assigned projects, and per project the task groups
 * of its estimate (share > 0), their task types and the project's tasks.
 */
export async function timesheetOptions(db, auth) {
  const { rows: projects } = await db.query(
    `SELECT p.id, p.code, p.title, p.status
       FROM projects p
      WHERE p.status <> 'cancelled'
        AND (p.owner_id = $1 OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1))
      ORDER BY p.title`,
    [auth.userId],
  );
  const ids = projects.map((p) => p.id);
  if (!ids.length) return [];
  const [groups, types, tasks] = await Promise.all([
    db.query(
      `SELECT e.project_id, g.id, g.name, e.effort_percentage
         FROM project_task_group_estimates e JOIN task_groups g ON g.id = e.task_group_id
        WHERE e.project_id = ANY($1) AND e.effort_percentage > 0
        ORDER BY e.effort_percentage DESC, g.name`,
      [ids],
    ),
    db.query(`SELECT id, name, task_group_id FROM task_types WHERE is_active ORDER BY name`),
    db.query(
      `SELECT id, project_id, name, task_group_id, task_type_id FROM tasks
        WHERE project_id = ANY($1) AND status <> 'closed' ORDER BY display_order, name`,
      [ids],
    ),
  ]);
  return projects.map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    taskGroups: groups.rows
      .filter((g) => g.project_id === p.id)
      .map((g) => ({
        id: g.id,
        name: g.name,
        effortPercentage: Number(g.effort_percentage),
        taskTypes: types.rows.filter((t) => t.task_group_id === g.id).map((t) => ({ id: t.id, name: t.name })),
      })),
    tasks: tasks.rows
      .filter((t) => t.project_id === p.id)
      .map((t) => ({ id: t.id, name: t.name, taskGroupId: t.task_group_id, taskTypeId: t.task_type_id })),
  }));
}

/** Checks project assignment, the task group rule, the task and the daily limit. */
async function validateEntry(db, auth, userId, body, excludeId = null) {
  const { rows: proj } = await db.query(
    `SELECT p.id, p.status,
            (p.owner_id = $2 OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2)) AS assigned
       FROM projects p WHERE p.id = $1`,
    [body.projectId, userId],
  );
  if (!proj[0]) throw badRequest('Project does not exist', [{ field: 'projectId', message: 'does not exist' }]);
  if (!proj[0].assigned) throw badRequest('You are not assigned to this project', [{ field: 'projectId', message: 'not assigned' }]);
  if (proj[0].status === 'cancelled') throw badRequest('This project is cancelled', [{ field: 'projectId', message: 'is cancelled' }]);

  const { rows: type } = await db.query(
    `SELECT tt.id, tt.task_group_id, g.name AS group_name,
            (SELECT e.effort_percentage FROM project_task_group_estimates e WHERE e.project_id = $2 AND e.task_group_id = tt.task_group_id) AS effort
       FROM task_types tt JOIN task_groups g ON g.id = tt.task_group_id WHERE tt.id = $1`,
    [body.taskTypeId, body.projectId],
  );
  if (!type[0]) throw badRequest('Task type does not exist', [{ field: 'taskTypeId', message: 'does not exist' }]);
  if (body.taskGroupId && type[0].task_group_id !== body.taskGroupId) {
    throw badRequest('The task type is not in the selected task group', [{ field: 'taskTypeId', message: 'not in the task group' }]);
  }
  if (!(Number(type[0].effort) > 0)) {
    throw badRequest(`"${type[0].group_name}" is not in this project's estimate – pick a task group of the project`, [
      { field: 'taskGroupId', message: 'not in the project estimate' },
    ]);
  }

  if (body.taskId) {
    const { rows: task } = await db.query(`SELECT project_id FROM tasks WHERE id = $1`, [body.taskId]);
    if (!task[0] || task[0].project_id !== body.projectId) throw badRequest('The task is not part of this project', [{ field: 'taskId', message: 'not in the project' }]);
  }

  const { rows: day } = await db.query(
    `SELECT COALESCE(SUM(minutes), 0)::int AS minutes FROM timesheets WHERE user_id = $1 AND work_date = $2 AND id IS DISTINCT FROM $3`,
    [userId, body.workDate, excludeId],
  );
  const minutes = body.minutes;
  if (day[0].minutes + minutes > DAY_LIMIT) {
    throw badRequest(`That makes more than 24 hours (1440 mins) on this day – ${day[0].minutes} mins already logged`, [{ field: 'minutes', message: 'over 24 hours a day' }]);
  }
  return minutes;
}

async function loadOwn(db, auth, id) {
  const { rows } = await db.query(`${SELECT} WHERE t.id = $1`, [id]);
  if (!rows[0]) throw notFound('Time entry');
  if (rows[0].user_id !== auth.userId && !auth.isSuperAdmin) throw forbidden('You can only change your own time entries');
  return rows[0];
}

export async function getTimesheet(db, auth, id) {
  return toDto(await loadOwn(db, auth, id));
}

export async function createTimesheet(db, auth, body) {
  const minutes = await validateEntry(db, auth, auth.userId, body);
  const id = await db.tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO timesheets (user_id, work_date, project_id, task_type_id, task_id, minutes, comment, is_billable, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $1, $1) RETURNING id`,
      [auth.userId, body.workDate, body.projectId, body.taskTypeId, body.taskId ?? null, minutes, body.comment.trim(), body.isBillable ?? true],
    );
    await writeAudit(client, { entity: 'timesheets', entityId: rows[0].id, action: 'create', userId: auth.userId, message: `${minutes} mins logged` });
    return rows[0].id;
  });
  return getTimesheet(db, auth, id);
}

export async function updateTimesheet(db, auth, id, body) {
  const before = await loadOwn(db, auth, id);
  const merged = {
    workDate: body.workDate ?? before.work_date,
    projectId: body.projectId ?? before.project_id,
    taskGroupId: body.taskGroupId,
    taskTypeId: body.taskTypeId ?? before.task_type_id,
    taskId: body.taskId === undefined ? before.task_id : body.taskId,
    minutes: body.minutes ?? before.minutes,
    comment: body.comment ?? before.comment ?? '',
    isBillable: body.isBillable ?? before.is_billable,
  };
  const minutes = await validateEntry(db, auth, before.user_id, merged, id);
  await db.tx(async (client) => {
    await client.query(
      `UPDATE timesheets SET work_date = $2, project_id = $3, task_type_id = $4, task_id = $5, minutes = $6, comment = $7, is_billable = $8, updated_by = $9
        WHERE id = $1`,
      [id, merged.workDate, merged.projectId, merged.taskTypeId, merged.taskId ?? null, minutes, merged.comment.trim(), merged.isBillable, auth.userId],
    );
    await writeAudit(client, { entity: 'timesheets', entityId: id, action: 'update', userId: auth.userId });
  });
  return getTimesheet(db, auth, id);
}

export async function deleteTimesheet(db, auth, id) {
  await loadOwn(db, auth, id);
  await db.tx(async (client) => {
    await client.query(`DELETE FROM timesheets WHERE id = $1`, [id]);
    await writeAudit(client, { entity: 'timesheets', entityId: id, action: 'delete', userId: auth.userId });
  });
}
