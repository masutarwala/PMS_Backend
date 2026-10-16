import { writeAudit, diff } from '../../utils/audit.js';
import { badRequest, conflict, isReferenceError, notFound } from '../../utils/errors.js';
import { escapeLike, idList, WhereBuilder } from '../../utils/query.js';
import { insertReview, listReviews, loadMemberHours, loadMembers, saveEstimates, saveMembers } from './projects.tabs.js';

export const PROJECT_STATUSES = ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'];
const ACTIVE_STATUSES = ['not_started', 'in_progress'];

const SORT_COLUMNS = { title: 'p.title', code: 'p.code', endDate: 'p.end_date', startDate: 'p.start_date', createdAt: 'p.created_at' };

// API field -> column for the editable project fields (Project tab / New project form).
const FIELDS = {
  title: 'title',
  customerId: 'customer_id',
  ownerId: 'owner_id',
  projectDivisionId: 'project_division_id',
  projectTypeId: 'project_type_id',
  startDate: 'start_date',
  endDate: 'end_date',
  estimatedHours: 'estimated_hours',
  estimatedAmount: 'estimated_amount',
  estimatedAmountCurrency: 'estimated_amount_currency',
  sharepointLink: 'sharepoint_link',
  isRetainerProject: 'is_retainer_project',
  detail: 'detail',
  stageId: 'stage_id',
};
// audited columns: the stage is logged by name, together with the category it puts the project in
const AUDIT_KEYS = [...Object.values(FIELDS).filter((c) => c !== 'stage_id'), 'stage', 'status'];

// Progress = Σ(effort % of task group × completed % at the latest review) / 100.
const SELECT = `
  SELECT p.*, c.name AS customer_name, d.name AS division_name, t.name AS type_name,
         o.name AS owner_name, o.email AS owner_email, st.name AS stage_name,
         COALESCE(prog.progress, 0) AS progress,
         COALESCE(ts.logged_minutes, 0) AS logged_minutes,
         lc.comment AS last_comment, lc.created_at AS last_comment_at, lc.author AS last_comment_by,
         (SELECT max(r.review_date) FROM project_reviews r
           WHERE r.project_id = p.id
             AND EXISTS (SELECT 1 FROM project_review_task_groups g WHERE g.project_review_id = r.id)) AS last_review_date
    FROM projects p
    JOIN project_divisions d ON d.id = p.project_division_id
    JOIN project_types t ON t.id = p.project_type_id
    JOIN users o ON o.id = p.owner_id
    LEFT JOIN customers c ON c.id = p.customer_id
    LEFT JOIN lookups st ON st.id = p.stage_id
    LEFT JOIN LATERAL (
      SELECT ROUND(SUM(e.effort_percentage * rtg.completion_percentage) / 100)::int AS progress
        FROM project_reviews pr
        JOIN project_review_task_groups rtg ON rtg.project_review_id = pr.id
        JOIN project_task_group_estimates e ON e.project_id = p.id AND e.task_group_id = rtg.task_group_id
       WHERE pr.id = (SELECT r.id FROM project_reviews r
                       WHERE r.project_id = p.id
                         AND EXISTS (SELECT 1 FROM project_review_task_groups g WHERE g.project_review_id = r.id)
                       ORDER BY r.review_date DESC, r.id DESC LIMIT 1)
    ) prog ON true
    LEFT JOIN LATERAL (
      SELECT SUM(minutes)::int AS logged_minutes FROM timesheets WHERE project_id = p.id
    ) ts ON true
    LEFT JOIN LATERAL (
      -- latest progress comment (Update tab)
      SELECT r.comment, r.created_at, u.name AS author
        FROM project_reviews r LEFT JOIN users u ON u.id = r.created_by
       WHERE r.project_id = p.id AND r.comment <> ''
       ORDER BY r.created_at DESC, r.id DESC LIMIT 1
    ) lc ON true`;

const toDto = (p) => ({
  id: p.id,
  code: p.code,
  title: p.title,
  customerId: p.customer_id,
  customerName: p.customer_name,
  ownerId: p.owner_id,
  ownerName: p.owner_name,
  ownerEmail: p.owner_email,
  projectDivisionId: p.project_division_id,
  divisionName: p.division_name,
  projectTypeId: p.project_type_id,
  typeName: p.type_name,
  isRetainerProject: p.is_retainer_project,
  startDate: p.start_date,
  endDate: p.end_date,
  estimatedHours: p.estimated_hours,
  estimatedAmount: p.estimated_amount,
  estimatedAmountCurrency: p.estimated_amount_currency?.trim() ?? null,
  sharepointLink: p.sharepoint_link,
  detail: p.detail,
  status: p.status, // category of the stage
  stageId: p.stage_id,
  stageName: p.stage_name ?? p.stage,
  progress: p.progress,
  loggedHours: Math.round((p.logged_minutes / 60) * 10) / 10,
  lastComment: p.last_comment ?? null,
  lastCommentBy: p.last_comment_by ?? null,
  lastCommentAt: p.last_comment_at ? new Date(p.last_comment_at).toISOString() : null,
  lastReviewDate: p.last_review_date ?? null, // review date of the latest progress entry
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

/**
 * Row-level security from the role's data scope:
 *   all      – every project
 *   team     – projects owned by / shared with anyone in the user's teams
 *   own      – projects the user owns or is a member of
 *   customer – projects of the user's customer (customer logins)
 *   vendor   – same as own (projects have no vendor link)
 */
function applyDataScope(where, auth) {
  if (auth.isSuperAdmin || auth.role.dataScope === 'all') return;
  const me = auth.userId;
  const ownOrMember = `(p.owner_id = $? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $?))`;

  switch (auth.role.dataScope) {
    case 'customer':
      where.add(`p.customer_id = $?`, auth.customerId ?? -1);
      break;
    case 'team':
      where.add(
        `(${ownOrMember} OR EXISTS (
            SELECT 1 FROM user_teams mine
              JOIN user_teams other ON other.team_id = mine.team_id
             WHERE mine.user_id = $?
               AND (other.user_id = p.owner_id
                    OR EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = p.id AND pm2.user_id = other.user_id))))`,
        me,
        me,
        me,
      );
      break;
    default:
      where.add(ownOrMember, me, me);
  }
}

function buildFilters(auth, q) {
  const where = new WhereBuilder();
  applyDataScope(where, auth);

  if (q.tab === 'mine') {
    where.add(`(p.owner_id = $? OR EXISTS (SELECT 1 FROM project_members pm3 WHERE pm3.project_id = p.id AND pm3.user_id = $?))`, auth.userId, auth.userId);
  } else if (q.tab === 'owned') {
    where.add(`p.owner_id = $?`, auth.userId);
  }
  if (q.search) {
    const s = `%${escapeLike(q.search)}%`;
    where.add(`(p.title ILIKE $? OR p.code ILIKE $? OR c.name ILIKE $?)`, s, s, s);
  }
  if (q.status) {
    const statuses = q.status.split(',').filter((s) => PROJECT_STATUSES.includes(s));
    if (statuses.length) where.add(`p.status = ANY($?)`, statuses);
  }
  for (const [param, col] of [
    ['divisionId', 'p.project_division_id'],
    ['typeId', 'p.project_type_id'],
    ['ownerId', 'p.owner_id'],
    ['customerId', 'p.customer_id'],
  ]) {
    const ids = idList(q[param]);
    if (ids.length) where.add(`${col} = ANY($?)`, ids);
  }
  const stageIds = idList(q.stageId);
  if (stageIds.length) where.add(`p.stage_id = ANY($?)`, stageIds);
  if (q.isRetainerProject !== undefined) where.add(`p.is_retainer_project = $?`, q.isRetainerProject);
  if (q.overdue) where.add(`p.end_date < current_date AND p.status = ANY($?)`, ACTIVE_STATUSES);
  if (q.startFrom) where.add(`p.start_date >= $?`, q.startFrom);
  if (q.startTo) where.add(`p.start_date <= $?`, q.startTo);
  if (q.endFrom) where.add(`p.end_date >= $?`, q.endFrom);
  if (q.endTo) where.add(`p.end_date <= $?`, q.endTo);
  return where;
}

export async function listProjects(db, auth, q) {
  const where = buildFilters(auth, q);
  const sort = SORT_COLUMNS[q.sortBy] || 'p.created_at';
  const dir = q.sortDir === 'asc' ? 'ASC' : 'DESC';
  const limit = where.param(q.pageSize);
  const offset = where.param((q.page - 1) * q.pageSize);
  const { rows } = await db.query(
    `${SELECT} ${where.toSql()}
      ORDER BY ${sort} ${dir} NULLS LAST, p.id DESC
      LIMIT ${limit} OFFSET ${offset}`,
    where.params,
  );
  // total in a separate light query (the list query has lateral joins)
  const countWhere = buildFilters(auth, q);
  const { rows: cnt } = await db.query(
    `SELECT count(*)::int AS total FROM projects p LEFT JOIN customers c ON c.id = p.customer_id ${countWhere.toSql()}`,
    countWhere.params,
  );
  return { items: rows.map(toDto), total: cnt[0].total, page: q.page, pageSize: q.pageSize };
}

/**
 * Everything the Project List summary cards and tabs show, within the user's data scope:
 *   Active projects  – count, created this month, on track / at risk (ends in 14 days) / late, 12-month trend
 *   On hold          – client (has a customer) / internal
 *   Over allocation  – projects whose logged hours exceed the estimate (top 2 listed)
 *   Hours this month – logged hours, billable / internal, hours per day of the current week
 */
export async function projectSummary(db, auth) {
  const where = new WhereBuilder();
  applyDataScope(where, auth);
  const scope = { sql: where.toSql(), params: [...where.params] }; // for queries that don't use "me"
  const me = where.param(auth.userId);
  const active = `p.status = ANY('{${ACTIVE_STATUSES.join(',')}}')`;
  const scoped = `scoped AS (SELECT p.* FROM projects p ${scope.sql})`;

  const [counts, trend, overAlloc, hours, week, stages] = await Promise.all([
    db.query(
      `WITH ${scoped}
       SELECT count(*)::int AS total,
              count(*) FILTER (WHERE ${active})::int AS active,
              count(*) FILTER (WHERE p.status = 'not_started')::int AS not_started,
              count(*) FILTER (WHERE p.status = 'in_progress')::int AS in_progress,
              count(*) FILTER (WHERE p.status = 'on_hold')::int AS on_hold,
              count(*) FILTER (WHERE p.status = 'on_hold' AND p.customer_id IS NOT NULL)::int AS on_hold_client,
              count(*) FILTER (WHERE p.status = 'completed')::int AS completed,
              count(*) FILTER (WHERE p.status = 'cancelled')::int AS cancelled,
              count(*) FILTER (WHERE ${active} AND p.end_date < current_date)::int AS late,
              count(*) FILTER (WHERE ${active} AND p.end_date BETWEEN current_date AND current_date + 14)::int AS at_risk,
              count(*) FILTER (WHERE ${active} AND p.created_at >= date_trunc('month', now()))::int AS created_this_month,
              count(*) FILTER (WHERE p.owner_id = ${me}
                                OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ${me}))::int AS mine,
              count(*) FILTER (WHERE p.owner_id = ${me})::int AS owned
         FROM scoped p`,
      where.params,
    ),
    // projects created per month, last 12 months (sparkline)
    db.query(
      `WITH ${scoped}
       SELECT m.month, count(p.id)::int AS n
         FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') AS m(month)
         LEFT JOIN scoped p ON date_trunc('month', p.created_at) = m.month
        GROUP BY m.month ORDER BY m.month`,
      scope.params,
    ),
    db.query(
      `WITH ${scoped}, burn AS (
         SELECT p.id, p.title, o.name AS owner_name, p.estimated_hours,
                COALESCE((SELECT SUM(t.minutes) FROM timesheets t WHERE t.project_id = p.id), 0) / 60.0 AS logged
           FROM scoped p JOIN users o ON o.id = p.owner_id
          WHERE p.estimated_hours > 0 AND p.status <> 'cancelled')
       SELECT id, title, owner_name, ROUND(logged * 100 / estimated_hours)::int AS pct, count(*) OVER()::int AS total
         FROM burn WHERE logged > estimated_hours
        ORDER BY logged / estimated_hours DESC LIMIT 2`,
      scope.params,
    ),
    db.query(
      `WITH ${scoped}
       SELECT COALESCE(SUM(t.minutes), 0)::int AS total,
              COALESCE(SUM(t.minutes) FILTER (WHERE t.is_billable), 0)::int AS billable
         FROM timesheets t JOIN scoped p ON p.id = t.project_id
        WHERE t.work_date >= date_trunc('month', current_date)`,
      scope.params,
    ),
    // hours per day of the current week, Monday first
    db.query(
      `WITH ${scoped}
       SELECT d.day::date AS day, COALESCE(SUM(t.minutes), 0)::int AS minutes
         FROM generate_series(date_trunc('week', current_date), date_trunc('week', current_date) + interval '6 days', interval '1 day') AS d(day)
         LEFT JOIN timesheets t ON t.work_date = d.day::date AND t.project_id IN (SELECT id FROM scoped)
        GROUP BY d.day ORDER BY d.day`,
      scope.params,
    ),
    // projects per stage (Project stages pie)
    db.query(
      `WITH ${scoped}
       SELECT l.id, l.name, l.value AS status, count(p.id)::int AS n
         FROM scoped p JOIN lookups l ON l.id = p.stage_id
        GROUP BY l.id, l.name, l.value, l.display_order
        ORDER BY l.display_order, l.name`,
      scope.params,
    ),
  ]);

  const r = counts.rows[0];
  const hrs = (min) => Math.round(min / 6) / 10;
  return {
    total: r.total,
    active: r.active,
    overdue: r.late,
    createdThisMonth: r.created_this_month,
    mine: r.mine,
    owned: r.owned,
    activeHealth: { onTrack: r.active - r.late - r.at_risk, atRisk: r.at_risk, late: r.late },
    onHold: { total: r.on_hold, client: r.on_hold_client, internal: r.on_hold - r.on_hold_client },
    createdByMonth: trend.rows.map((m) => m.n),
    overAllocation: {
      total: overAlloc.rows[0]?.total ?? 0,
      items: overAlloc.rows.map((o) => ({ id: o.id, title: o.title, ownerName: o.owner_name, percent: o.pct })),
    },
    hoursThisMonth: {
      total: hrs(hours.rows[0].total),
      billable: hrs(hours.rows[0].billable),
      internal: hrs(hours.rows[0].total - hours.rows[0].billable),
      week: week.rows.map((d) => hrs(d.minutes)),
    },
    byStage: stages.rows.map((st) => ({ id: st.id, name: st.name, status: st.status, count: st.n })),
    byStatus: {
      not_started: r.not_started,
      in_progress: r.in_progress,
      on_hold: r.on_hold,
      completed: r.completed,
      cancelled: r.cancelled,
    },
  };
}

export async function getProject(db, auth, id) {
  const where = new WhereBuilder();
  where.add(`p.id = $?`, id);
  applyDataScope(where, auth);
  const { rows } = await db.query(`${SELECT} ${where.toSql()}`, where.params);
  if (!rows[0]) throw notFound('Project');

  const [estimates, taskCount, members, record, memberHours] = await Promise.all([
    // effort % per task group, with the hours actually logged against task types of that group
    db.query(
      `SELECT e.task_group_id, g.name, e.effort_percentage,
              COALESCE((SELECT SUM(t.minutes) FROM timesheets t JOIN task_types tt ON tt.id = t.task_type_id
                         WHERE t.project_id = e.project_id AND tt.task_group_id = e.task_group_id), 0) AS actual_minutes
         FROM project_task_group_estimates e JOIN task_groups g ON g.id = e.task_group_id
        WHERE e.project_id = $1 ORDER BY e.effort_percentage DESC, g.name`,
      [id],
    ),
    db.query(`SELECT count(*)::int AS n FROM tasks WHERE project_id = $1`, [id]),
    loadMembers(db, id, rows[0].owner_id),
    db.query(
      `SELECT c.name AS created_by_name, u.name AS updated_by_name
         FROM projects p LEFT JOIN users c ON c.id = p.created_by LEFT JOIN users u ON u.id = p.updated_by WHERE p.id = $1`,
      [id],
    ),
    loadMemberHours(db, id),
  ]);
  const est = rows[0].estimated_hours;
  return {
    ...toDto(rows[0]),
    taskCount: taskCount.rows[0].n,
    createdByName: record.rows[0].created_by_name,
    updatedByName: record.rows[0].updated_by_name,
    members,
    memberHours,
    estimates: estimates.rows.map((e) => ({
      taskGroupId: e.task_group_id,
      taskGroupName: e.name,
      effortPercentage: e.effort_percentage,
      hours: est != null ? Math.round(est * e.effort_percentage) / 100 : null,
      actualHours: Math.round(Number(e.actual_minutes) / 6) / 10,
    })),
  };
}

/** Audit-log entries of a project, newest first. */
export async function projectActivity(db, auth, id) {
  await getProject(db, auth, id); // existence + data scope
  const { rows } = await db.query(
    `SELECT a.id, a.action, a.message, a.changes, a.logged_at, u.name AS user_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.entity = 'projects' AND a.entity_id = $1
      ORDER BY a.logged_at DESC, a.id DESC LIMIT 20`,
    [id],
  );
  return rows.map((a) => ({ id: a.id, action: a.action, message: a.message, changes: a.changes, userName: a.user_name, loggedAt: a.logged_at }));
}

/** A stage (lookups PROJECT_STAGE) and the status category it stands for. */
async function resolveStage(db, stageId) {
  const { rows } = stageId
    ? await db.query(`SELECT id, name, value, is_visible FROM lookups WHERE id = $1 AND type = 'PROJECT_STAGE'`, [stageId])
    : // default for new projects: the first "not started" stage (Draft)
      await db.query(
        `SELECT id, name, value, is_visible FROM lookups WHERE type = 'PROJECT_STAGE' AND is_visible
          ORDER BY (value = 'not_started') DESC, display_order, name LIMIT 1`,
      );
  const st = rows[0];
  if (!st) throw badRequest('Select a valid project stage', [{ field: 'stageId', message: 'is not a project stage' }]);
  if (!st.is_visible && stageId) throw badRequest('This stage is hidden – pick another one', [{ field: 'stageId', message: 'is hidden' }]);
  const status = PROJECT_STATUSES.includes(st.value) ? st.value : 'in_progress';
  return { id: st.id, name: st.name, status };
}

/** Checks that the selected masters exist and are active. */
async function validateReferences(db, body) {
  const checks = [];
  if (body.projectDivisionId !== undefined)
    checks.push(['projectDivisionId', 'Project division', `SELECT is_active FROM project_divisions WHERE id = $1`, body.projectDivisionId]);
  if (body.projectTypeId !== undefined)
    checks.push(['projectTypeId', 'Project type', `SELECT is_active FROM project_types WHERE id = $1`, body.projectTypeId]);
  if (body.ownerId !== undefined)
    checks.push(['ownerId', 'Project owner', `SELECT is_active FROM users WHERE id = $1`, body.ownerId]);
  if (body.customerId)
    checks.push(['customerId', 'Customer', `SELECT is_active FROM customers WHERE id = $1`, body.customerId]);

  for (const [field, label, sql, value] of checks) {
    const { rows } = await db.query(sql, [value]);
    if (!rows[0]) throw badRequest(`${label} does not exist`, [{ field, message: 'does not exist' }]);
    if (!rows[0].is_active) throw badRequest(`${label} is inactive`, [{ field, message: 'is inactive' }]);
  }
  if (body.startDate && body.endDate && body.endDate < body.startDate) {
    throw badRequest('End date cannot be before the start date', [{ field: 'endDate', message: 'must be on or after the start date' }]);
  }
}

/** Next free PRJ-#### code (serialised with an advisory lock). */
async function nextProjectCode(client) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('projects.code'))`);
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(substring(code FROM '^PRJ-(\\d+)$')::int), 1000) + 1 AS n FROM projects`,
  );
  return `PRJ-${rows[0].n}`;
}

function pickColumns(body) {
  const cols = [];
  const vals = [];
  for (const [field, col] of Object.entries(FIELDS)) {
    if (body[field] !== undefined) {
      cols.push(col);
      vals.push(typeof body[field] === 'string' ? body[field].trim() || null : body[field]);
    }
  }
  return { cols, vals };
}

/**
 * Creates a project and, from its project type:
 *   - copies the default effort % per task group into the project estimate
 *   - creates the template tasks
 * The owner is added as a project member with edit access.
 */
export async function createProject(db, auth, body) {
  await validateReferences(db, body);
  const id = await db.tx(async (client) => {
    const code = await nextProjectCode(client);
    const stage = await resolveStage(client, body.stageId);
    const { cols, vals } = pickColumns({ ...body, stageId: stage.id });
    cols.push('stage', 'status', 'code', 'created_by', 'updated_by');
    vals.push(stage.name, stage.status, code, auth.userId, auth.userId);
    const { rows } = await client.query(
      `INSERT INTO projects (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      vals,
    );
    const projectId = rows[0].id;

    await client.query(
      `INSERT INTO project_task_group_estimates (project_id, task_group_id, effort_percentage, created_by, updated_by)
       SELECT $1, task_group_id, effort_percentage, $3, $3
         FROM project_type_default_estimates WHERE project_type_id = $2`,
      [projectId, body.projectTypeId, auth.userId],
    );
    const tasks = await client.query(
      // task estimate = project estimated hours × the task's effort % (when both are known)
      `INSERT INTO tasks (kind, customer_id, project_id, task_group_id, task_type_id, name, description, owner_id, status,
                          estimated_minutes, display_order, created_by, updated_by)
       SELECT 'project', $2, $1, task_group_id, task_type_id, task_title, description, $3, 'open',
              ROUND($6::numeric * 60 * effort_percentage / 100)::int, sort_order, $5, $5
         FROM project_type_task_templates WHERE project_type_id = $4
        ORDER BY sort_order`,
      [projectId, body.customerId ?? null, body.ownerId, body.projectTypeId, auth.userId, body.estimatedHours ?? null],
    );
    await client.query(
      `INSERT INTO project_members (project_id, user_id, access_level, created_by, updated_by) VALUES ($1, $2, 'edit', $3, $3)`,
      [projectId, body.ownerId, auth.userId],
    );
    await writeAudit(client, {
      entity: 'projects',
      entityId: projectId,
      action: 'create',
      userId: auth.userId,
      message: `Project ${code} created with ${tasks.rowCount} template task(s)`,
    });
    return projectId;
  });
  return getProject(db, auth, id);
}

export async function updateProject(db, auth, id, input) {
  // members / estimates (Users and Estimate tabs) are saved in the same transaction as the fields
  const { members, estimates, ...body } = input;
  await getProject(db, auth, id); // existence + data scope
  const { rows } = await db.query(`SELECT * FROM projects WHERE id = $1`, [id]);
  const before = rows[0];
  await validateReferences(db, {
    ...body,
    startDate: body.startDate ?? before.start_date,
    endDate: body.endDate === undefined ? before.end_date : body.endDate,
  });

  const { cols, vals } = pickColumns(body);
  if (body.stageId !== undefined) {
    const stage = await resolveStage(db, body.stageId);
    cols.push('stage', 'status');
    vals.push(stage.name, stage.status);
  }
  cols.push('updated_by');
  vals.push(auth.userId);
  await db.tx(async (client) => {
    const { rows: after } = await client.query(
      `UPDATE projects SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...vals],
    );
    if (body.ownerId && body.ownerId !== before.owner_id) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, access_level, created_by, updated_by)
         SELECT $1, $2, 'edit', $3, $3
          WHERE NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2)`,
        [id, body.ownerId, auth.userId],
      );
    }
    const changes = diff(before, after[0], AUDIT_KEYS) ?? {};
    if (members) {
      const c = await saveMembers(client, auth, after[0], members);
      if (c) changes.members = c;
    }
    if (estimates) {
      const c = await saveEstimates(client, auth, id, estimates);
      if (c) changes.estimate = c;
    }
    await writeAudit(client, {
      entity: 'projects',
      entityId: id,
      action: changes.stage && Object.keys(changes).every((k) => k === 'stage' || k === 'status') ? 'status_change' : 'update',
      userId: auth.userId,
      changes: Object.keys(changes).length ? changes : null,
    });
  });
  return getProject(db, auth, id);
}

export async function projectReviews(db, auth, id) {
  await getProject(db, auth, id); // existence + data scope
  return listReviews(db, id);
}

/**
 * Update tab: adds a progress entry (stage, review date, % completed per task group) and/or a comment.
 * Either can be sent on its own; a new stage is applied to the project as well.
 */
export async function addReview(db, auth, id, input) {
  const body = { ...input, comment: input.comment?.trim() ?? '', reviewDate: input.reviewDate ?? new Date().toISOString().slice(0, 10) };
  if (!body.comment && !body.completion?.length && !body.stageId) {
    throw badRequest('Add a comment or the % completed', [{ field: 'comment', message: 'is required without progress' }]);
  }
  const project = await getProject(db, auth, id);
  const stage = body.stageId && body.stageId !== project.stageId ? await resolveStage(db, body.stageId) : null;
  await db.tx(async (client) => {
    let changes = null;
    if (stage) {
      await client.query(`UPDATE projects SET stage_id = $2, stage = $3, status = $4, updated_by = $5 WHERE id = $1`, [
        id,
        stage.id,
        stage.name,
        stage.status,
        auth.userId,
      ]);
      changes = { stage: { old: project.stageName, new: stage.name } };
      if (stage.status !== project.status) changes.status = { old: project.status, new: stage.status };
    }
    await insertReview(client, auth, id, stage?.name ?? project.stageName, body);
    const message = body.comment || (body.completion?.length ? 'Progress updated' : null);
    await writeAudit(client, { entity: 'projects', entityId: id, action: 'update', userId: auth.userId, message, changes });
  });
  return listReviews(db, id);
}

/** Deletes a project with its template tasks; refused once time has been logged against it. */
export async function deleteProject(db, auth, id) {
  const project = await getProject(db, auth, id);
  try {
    await db.tx(async (client) => {
      // children before parents (tasks.parent_task_id is ON DELETE RESTRICT)
      const { rows } = await client.query(`SELECT COALESCE(MAX(level), 0) AS max FROM tasks WHERE project_id = $1`, [id]);
      for (let level = rows[0].max; level >= 0; level -= 1) {
        await client.query(`DELETE FROM tasks WHERE project_id = $1 AND level = $2`, [id, level]);
      }
      await client.query(`DELETE FROM projects WHERE id = $1`, [id]);
      await writeAudit(client, { entity: 'projects', entityId: id, action: 'delete', userId: auth.userId, message: `Project ${project.code} deleted` });
    });
  } catch (err) {
    if (isReferenceError(err)) {
      throw conflict('This project has timesheets, plans or other linked records. Set its stage to Cancelled instead.');
    }
    throw err;
  }
}
