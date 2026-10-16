/*
 * Project details tabs that have their own child records:
 *   Users    – project_members (access level, optional cost per hour)
 *   Estimate – project_task_group_estimates (% of effort per task group)
 *   Update   – project_reviews + project_review_task_groups (stage, comment, % completed per group)
 */
import { badRequest } from '../../utils/errors.js';
import { exact } from '../../utils/number.js';

export const ACCESS_LEVELS = ['view', 'advanced_view', 'edit'];

const hrs = (minutes) => exact(Number(minutes) / 60);
const num = (v) => (v === null || v === undefined ? null : Number(v));

/** Members with grade, team position, rate and the hours they logged on the project. */
export async function loadMembers(db, projectId, ownerId) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, pm.access_level, pm.cost_per_hour, pm.currency,
            u.hourly_rate, u.hourly_rate_currency, g.name AS grade_name, tm.name AS team_name,
            (SELECT ut.position FROM user_teams ut WHERE ut.user_id = u.id AND ut.position IS NOT NULL ORDER BY ut.team_id LIMIT 1) AS position,
            COALESCE((SELECT SUM(t.minutes) FROM timesheets t WHERE t.project_id = pm.project_id AND t.user_id = u.id), 0) AS logged_minutes
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       LEFT JOIN resource_grades rg ON rg.id = u.resource_grade_id
       LEFT JOIN lookups g ON g.id = rg.grade_id
       LEFT JOIN teams tm ON tm.id = rg.team_id
      WHERE pm.project_id = $1
      ORDER BY (u.id = $2) DESC, u.name`,
    [projectId, ownerId],
  );
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    accessLevel: m.access_level,
    costPerHour: num(m.cost_per_hour),
    currency: m.currency?.trim() ?? null,
    defaultRate: num(m.hourly_rate),
    defaultRateCurrency: m.hourly_rate_currency?.trim() ?? null,
    gradeName: m.grade_name,
    teamName: m.team_name,
    position: m.position,
    loggedHours: hrs(m.logged_minutes),
    isOwner: m.id === ownerId,
  }));
}

/** Hours and cost of everyone who logged time on the project (Analysis tab). */
export async function loadMemberHours(db, projectId) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, SUM(t.minutes)::int AS minutes, COALESCE(pm.cost_per_hour, u.hourly_rate) AS rate
       FROM timesheets t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = t.user_id
      WHERE t.project_id = $1
      GROUP BY u.id, u.name, pm.cost_per_hour, u.hourly_rate
      ORDER BY minutes DESC, u.name`,
    [projectId],
  );
  return rows.map((r) => {
    const hours = hrs(r.minutes);
    const rate = num(r.rate);
    // cost from the exact minutes, not the displayed hours
    return { id: r.id, name: r.name, hours, rate, cost: rate != null ? exact((Number(r.minutes) / 60) * rate) : null };
  });
}

const memberLabel = (rows) => rows.map((m) => `${m.name} (${m.access_level})`).join(', ') || null;

/**
 * Replaces the project members. The owner always stays (with edit access);
 * people who logged time on the project cannot be removed.
 */
export async function saveMembers(client, auth, project, members) {
  const seen = new Set();
  for (const m of members) {
    if (seen.has(m.userId)) throw badRequest('A person is listed twice in the members', [{ field: 'members', message: 'duplicate user' }]);
    seen.add(m.userId);
  }
  const list = members.map((m) => (m.userId === project.owner_id ? { ...m, accessLevel: 'edit' } : m));
  if (!seen.has(project.owner_id)) list.push({ userId: project.owner_id, accessLevel: 'edit', costPerHour: null });

  const { rows: before } = await client.query(
    `SELECT pm.user_id, pm.access_level, pm.cost_per_hour, u.name,
            EXISTS (SELECT 1 FROM timesheets t WHERE t.project_id = pm.project_id AND t.user_id = pm.user_id) AS has_time
       FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = $1 ORDER BY u.name`,
    [project.id],
  );
  const keep = new Set(list.map((m) => m.userId));
  const removed = before.filter((m) => !keep.has(m.user_id));
  const locked = removed.find((m) => m.has_time);
  if (locked) throw badRequest(`${locked.name} has logged time on this project and cannot be removed`, [{ field: 'members', message: 'has logged time' }]);

  const existing = new Set(before.map((m) => m.user_id));
  const added = list.filter((m) => !existing.has(m.userId)).map((m) => m.userId);
  if (added.length) {
    const { rows } = await client.query(`SELECT id, name, is_active FROM users WHERE id = ANY($1)`, [added]);
    const missing = added.find((id) => !rows.some((r) => r.id === id));
    if (missing) throw badRequest('A selected member does not exist', [{ field: 'members', message: 'unknown user' }]);
    const inactive = rows.find((r) => !r.is_active);
    if (inactive) throw badRequest(`${inactive.name} is inactive`, [{ field: 'members', message: 'inactive user' }]);
  }

  if (removed.length) {
    await client.query(`DELETE FROM project_members WHERE project_id = $1 AND user_id = ANY($2)`, [project.id, removed.map((m) => m.user_id)]);
  }
  for (const m of list) {
    await client.query(
      `INSERT INTO project_members (project_id, user_id, access_level, cost_per_hour, currency, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       ON CONFLICT (project_id, user_id) DO UPDATE
          SET access_level = EXCLUDED.access_level, cost_per_hour = EXCLUDED.cost_per_hour, currency = EXCLUDED.currency, updated_by = EXCLUDED.updated_by
        WHERE (project_members.access_level, project_members.cost_per_hour) IS DISTINCT FROM (EXCLUDED.access_level, EXCLUDED.cost_per_hour)`,
      [project.id, m.userId, m.accessLevel, m.costPerHour ?? null, m.costPerHour != null ? project.estimated_amount_currency?.trim() || 'INR' : null, auth.userId],
    );
  }

  const { rows: after } = await client.query(
    `SELECT pm.user_id, pm.access_level, pm.cost_per_hour, u.name FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1 ORDER BY u.name`,
    [project.id],
  );
  const sig = (rows) => rows.map((m) => `${m.user_id}:${m.access_level}:${m.cost_per_hour ?? ''}`).join('|');
  return sig(before) === sig(after) ? null : { old: memberLabel(before), new: memberLabel(after) };
}

const estimateLabel = (rows) => rows.map((e) => `${e.name} ${Number(e.effort_percentage)}%`).join(', ') || null;

/** Replaces the effort split. Rows with 0% are dropped; the rest must total 100%. */
export async function saveEstimates(client, auth, projectId, estimates) {
  const list = estimates.filter((e) => e.effortPercentage > 0);
  const ids = list.map((e) => e.taskGroupId);
  if (new Set(ids).size !== ids.length) throw badRequest('A task group is listed twice in the estimate', [{ field: 'estimates', message: 'duplicate task group' }]);
  const total = Math.round(list.reduce((s, e) => s + e.effortPercentage, 0) * 100) / 100;
  if (list.length && total !== 100) {
    throw badRequest(`The effort split must total 100% (now ${total}%)`, [{ field: 'estimates', message: 'must total 100%' }]);
  }
  if (ids.length) {
    const { rows } = await client.query(`SELECT id FROM task_groups WHERE id = ANY($1)`, [ids]);
    if (rows.length !== ids.length) throw badRequest('A task group in the estimate does not exist', [{ field: 'estimates', message: 'unknown task group' }]);
  }

  const read = () =>
    client.query(
      `SELECT e.task_group_id, e.effort_percentage, g.name FROM project_task_group_estimates e JOIN task_groups g ON g.id = e.task_group_id
        WHERE e.project_id = $1 ORDER BY e.effort_percentage DESC, g.name`,
      [projectId],
    );
  const before = (await read()).rows;
  await client.query(`DELETE FROM project_task_group_estimates WHERE project_id = $1 AND NOT (task_group_id = ANY($2))`, [projectId, ids]);
  for (const e of list) {
    await client.query(
      `INSERT INTO project_task_group_estimates (project_id, task_group_id, effort_percentage, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (project_id, task_group_id) DO UPDATE SET effort_percentage = EXCLUDED.effort_percentage, updated_by = EXCLUDED.updated_by
        WHERE project_task_group_estimates.effort_percentage IS DISTINCT FROM EXCLUDED.effort_percentage`,
      [projectId, e.taskGroupId, e.effortPercentage, auth.userId],
    );
  }
  const after = (await read()).rows;
  const a = estimateLabel(before);
  const b = estimateLabel(after);
  return a === b ? null : { old: a, new: b };
}

/** Reviews newest first, with % completed per task group and the effort-weighted overall. */
export async function listReviews(db, projectId) {
  const [reviews, groups, estimates] = await Promise.all([
    db.query(
      `SELECT r.id, r.stage, r.review_date, r.comment, r.created_at, u.name AS reviewer_name
         FROM project_reviews r LEFT JOIN users u ON u.id = r.created_by
        WHERE r.project_id = $1 ORDER BY r.review_date DESC, r.id DESC`,
      [projectId],
    ),
    db.query(
      `SELECT g.project_review_id, g.task_group_id, g.completion_percentage
         FROM project_review_task_groups g JOIN project_reviews r ON r.id = g.project_review_id WHERE r.project_id = $1`,
      [projectId],
    ),
    db.query(`SELECT task_group_id, effort_percentage FROM project_task_group_estimates WHERE project_id = $1`, [projectId]),
  ]);
  const effort = new Map(estimates.rows.map((e) => [e.task_group_id, Number(e.effort_percentage)]));
  return reviews.rows.map((r) => {
    const items = groups.rows
      .filter((g) => g.project_review_id === r.id)
      .map((g) => ({ taskGroupId: g.task_group_id, completionPercentage: Number(g.completion_percentage) }));
    const overall = Math.round(items.reduce((s, g) => s + ((effort.get(g.taskGroupId) ?? 0) * g.completionPercentage) / 100, 0));
    return {
      id: r.id,
      stage: r.stage,
      reviewDate: r.review_date,
      comment: r.comment,
      reviewerName: r.reviewer_name,
      createdAt: r.created_at,
      overall,
      groups: items,
    };
  });
}

/** Adds a review (progress and/or comment); only task groups of the project estimate are kept. */
export async function insertReview(client, auth, projectId, stageName, body) {
  const { rows: est } = await client.query(`SELECT task_group_id FROM project_task_group_estimates WHERE project_id = $1`, [projectId]);
  const allowed = new Set(est.map((e) => e.task_group_id));
  const { rows } = await client.query(
    `INSERT INTO project_reviews (project_id, stage, review_date, comment, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
    [projectId, stageName, body.reviewDate, body.comment, auth.userId],
  );
  for (const g of body.completion ?? []) {
    if (!allowed.has(g.taskGroupId)) continue;
    await client.query(
      `INSERT INTO project_review_task_groups (project_review_id, task_group_id, completion_percentage) VALUES ($1, $2, $3)
       ON CONFLICT (project_review_id, task_group_id) DO UPDATE SET completion_percentage = EXCLUDED.completion_percentage`,
      [rows[0].id, g.taskGroupId, g.completionPercentage],
    );
  }
  return rows[0].id;
}
