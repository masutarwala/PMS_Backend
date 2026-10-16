import { ACTIONS } from '../../config/menus.js';
import { writeAudit, diff } from '../../utils/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import { escapeLike, WhereBuilder } from '../../utils/query.js';
import { can, clearPermissionCache } from '../auth/auth-context.js';

const SORT_COLUMNS = { name: 'r.name', level: 'r.level', code: 'r.code' };
const AUDIT_KEYS = ['name', 'code', 'level', 'role_type', 'data_scope', 'is_active'];

const toDto = (r) => ({
  id: r.id,
  code: r.code,
  name: r.name,
  level: r.level,
  roleType: r.role_type,
  dataScope: r.data_scope,
  isSystem: r.is_system,
  isActive: r.is_active,
  userCount: r.user_count ?? undefined,
  updatedAt: r.updated_at,
});

/** "Project Manager" -> "PROJECT_MANAGER" */
export const codeFromName = (name) =>
  name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);

/**
 * Role-level rule: lower level = more authority, 0 = Super Admin.
 * A user may only manage roles with a level strictly higher than their own.
 */
export function assertCanManageLevel(auth, level) {
  if (auth.isSuperAdmin) return;
  if (level <= auth.role.level) {
    throw forbidden(`You can only manage roles with a level higher than ${auth.role.level}`);
  }
}

export async function listRoles(db, q) {
  const where = new WhereBuilder();
  if (q.search) where.add(`(r.name ILIKE $? OR r.code ILIKE $?)`, `%${escapeLike(q.search)}%`, `%${escapeLike(q.search)}%`);
  if (q.roleType) where.add(`r.role_type = $?`, q.roleType);
  if (q.dataScope) where.add(`r.data_scope = ANY($?)`, q.dataScope.split(','));
  if (q.isActive !== undefined) where.add(`r.is_active = $?`, q.isActive);

  const sort = SORT_COLUMNS[q.sortBy] || 'r.level';
  const limit = where.param(q.pageSize);
  const offset = where.param((q.page - 1) * q.pageSize);
  const { rows } = await db.query(
    `SELECT r.*, (SELECT count(*)::int FROM users u WHERE u.role_id = r.id) AS user_count,
            count(*) OVER()::int AS total
       FROM roles r
       ${where.toSql()}
      ORDER BY ${sort} ${q.sortDir === 'desc' ? 'DESC' : 'ASC'}, r.id
      LIMIT ${limit} OFFSET ${offset}`,
    where.params,
  );
  return { items: rows.map(toDto), total: rows[0]?.total ?? 0, page: q.page, pageSize: q.pageSize };
}

/** Active roles the current user is allowed to assign to a user. */
export async function listAssignableRoles(db, auth) {
  const { rows } = await db.query(
    `SELECT id, code, name, level, role_type FROM roles
      WHERE is_active AND ($1::boolean OR level > $2)
      ORDER BY level, name`,
    [auth.isSuperAdmin, auth.role.level],
  );
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, level: r.level, roleType: r.role_type }));
}

export async function getRole(db, id) {
  const { rows } = await db.query(
    `SELECT r.*, (SELECT count(*)::int FROM users u WHERE u.role_id = r.id) AS user_count FROM roles r WHERE r.id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('Role');
  const perms = await db.query(
    `SELECT menu_id, can_view, can_create, can_edit, can_delete, can_approve, can_export
       FROM role_permissions WHERE role_id = $1`,
    [id],
  );
  return {
    ...toDto(rows[0]),
    permissions: perms.rows.map((p) => ({
      menuId: p.menu_id,
      view: p.can_view,
      create: p.can_create,
      edit: p.can_edit,
      delete: p.can_delete,
      approve: p.can_approve,
      export: p.can_export,
    })),
  };
}

/** Turns off any action the screen does not support (menus.actions), e.g. approve on Users. */
async function onlySupportedActions(db, permissions) {
  if (!permissions.length) return permissions;
  const { rows } = await db.query(`SELECT id, actions FROM menus WHERE id = ANY($1)`, [permissions.map((p) => p.menuId)]);
  const supported = new Map(rows.map((m) => [m.id, m.actions]));
  return permissions.map((p) => ({
    ...p,
    ...Object.fromEntries(ACTIONS.map((a) => [a, !!p[a] && (supported.get(p.menuId) ?? []).includes(a)])),
  }));
}

/** A non-Super Admin cannot grant an action they do not have themselves. */
async function assertCanGrant(db, auth, permissions) {
  if (auth.isSuperAdmin || !permissions.length) return;
  const { rows } = await db.query(`SELECT id, url, name FROM menus WHERE id = ANY($1)`, [permissions.map((p) => p.menuId)]);
  const menus = new Map(rows.map((m) => [m.id, m]));
  for (const p of permissions) {
    const menu = menus.get(p.menuId);
    if (!menu) throw badRequest(`Menu ${p.menuId} does not exist`);
    for (const a of ACTIONS) {
      if (p[a] && !can(auth, menu.url, a)) {
        throw forbidden(`You cannot grant "${a}" on ${menu.name} because you do not have it yourself`);
      }
    }
  }
}

async function savePermissions(client, roleId, permissions, userId) {
  await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
  const rows = permissions.filter((p) => ACTIONS.some((a) => p[a]));
  if (!rows.length) return;
  // One multi-row insert; menu ids and flags come in as parallel arrays.
  await client.query(
    `INSERT INTO role_permissions (role_id, menu_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, created_by, updated_by)
     SELECT $1, m, v, c, e, d, a, x, $9, $9
       FROM unnest($2::bigint[], $3::bool[], $4::bool[], $5::bool[], $6::bool[], $7::bool[], $8::bool[]) AS t(m, v, c, e, d, a, x)`,
    [
      roleId,
      rows.map((p) => p.menuId),
      // any action on a screen implies it can be viewed
      rows.map(() => true),
      rows.map((p) => !!p.create),
      rows.map((p) => !!p.edit),
      rows.map((p) => !!p.delete),
      rows.map((p) => !!p.approve),
      rows.map((p) => !!p.export),
      userId,
    ],
  );
}

export async function createRole(db, auth, body) {
  assertCanManageLevel(auth, body.level);
  body = { ...body, permissions: await onlySupportedActions(db, body.permissions ?? []) };
  await assertCanGrant(db, auth, body.permissions);
  const code = body.code?.trim() ? codeFromName(body.code) : codeFromName(body.name);
  if (!code) throw badRequest('Code could not be generated from the name; enter a code');

  const id = await db.tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO roles (code, name, level, role_type, data_scope, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [code, body.name.trim(), body.level, body.roleType, body.dataScope, body.isActive, auth.userId],
    );
    await savePermissions(client, rows[0].id, body.permissions ?? [], auth.userId);
    await writeAudit(client, { entity: 'roles', entityId: rows[0].id, action: 'create', userId: auth.userId, message: `Role ${code} created` });
    return rows[0].id;
  });
  return getRole(db, id);
}

export async function updateRole(db, auth, id, body) {
  const { rows } = await db.query(`SELECT * FROM roles WHERE id = $1`, [id]);
  const before = rows[0];
  if (!before) throw notFound('Role');
  assertCanManageLevel(auth, before.level);
  assertCanManageLevel(auth, body.level);
  if (before.id === auth.role.id && !auth.isSuperAdmin) throw forbidden('You cannot change your own role');
  body = { ...body, permissions: await onlySupportedActions(db, body.permissions ?? []) };
  await assertCanGrant(db, auth, body.permissions);

  // Built-in roles keep their code; their level and active flag are fixed so the system cannot lock itself out.
  const code = before.is_system ? before.code : body.code?.trim() ? codeFromName(body.code) : before.code;
  const level = before.is_system ? before.level : body.level;
  const isActive = before.is_system ? true : body.isActive;

  await db.tx(async (client) => {
    const { rows: after } = await client.query(
      `UPDATE roles SET code = $2, name = $3, level = $4, role_type = $5, data_scope = $6, is_active = $7, updated_by = $8
        WHERE id = $1 RETURNING *`,
      [id, code, body.name.trim(), level, body.roleType, body.dataScope, isActive, auth.userId],
    );
    // Super Admin needs no permission rows; for everyone else they are replaced.
    if (level !== 0) await savePermissions(client, id, body.permissions ?? [], auth.userId);
    await writeAudit(client, {
      entity: 'roles',
      entityId: id,
      action: 'update',
      userId: auth.userId,
      changes: diff(before, after[0], AUDIT_KEYS),
    });
  });
  clearPermissionCache(id);
  return getRole(db, id);
}

export async function deleteRole(db, auth, id) {
  const { rows } = await db.query(
    `SELECT r.*, (SELECT count(*)::int FROM users u WHERE u.role_id = r.id) AS user_count FROM roles r WHERE r.id = $1`,
    [id],
  );
  const role = rows[0];
  if (!role) throw notFound('Role');
  if (role.is_system) throw conflict('Built-in roles cannot be deleted');
  if (role.user_count > 0) throw conflict(`This role is assigned to ${role.user_count} user(s); move them to another role first`);
  assertCanManageLevel(auth, role.level);

  await db.tx(async (client) => {
    await client.query(`DELETE FROM roles WHERE id = $1`, [id]);
    await writeAudit(client, { entity: 'roles', entityId: id, action: 'delete', userId: auth.userId, message: `Role ${role.code} deleted` });
  });
  clearPermissionCache(id);
}
