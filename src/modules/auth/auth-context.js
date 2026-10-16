// Builds the per-request auth context (user + role + permissions).
// Permissions are cached per role for a short time; role updates clear the cache.

const CACHE_TTL_MS = 60_000;
const permissionCache = new Map(); // roleId -> { at, permissions }

export function clearPermissionCache(roleId) {
  if (roleId === undefined) permissionCache.clear();
  else permissionCache.delete(Number(roleId));
}

async function loadRolePermissions(db, roleId) {
  const hit = permissionCache.get(roleId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.permissions;

  const { rows } = await db.query(
    `SELECT m.url, m.actions, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.can_approve, rp.can_export
       FROM role_permissions rp
       JOIN menus m ON m.id = rp.menu_id
      WHERE rp.role_id = $1 AND m.url IS NOT NULL`,
    [roleId],
  );
  const permissions = {};
  for (const r of rows) {
    const ok = (action, flag) => flag && r.actions.includes(action); // screen must support the action
    permissions[r.url] = {
      view: ok('view', r.can_view),
      create: ok('create', r.can_create),
      edit: ok('edit', r.can_edit),
      delete: ok('delete', r.can_delete),
      approve: ok('approve', r.can_approve),
      export: ok('export', r.can_export),
    };
  }
  permissionCache.set(roleId, { at: Date.now(), permissions });
  return permissions;
}

export async function loadAuthContext(db, userId) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.username, u.email, u.emp_code, u.is_active, u.customer_id, u.vendor_id,
            r.id AS role_id, r.code AS role_code, r.name AS role_name, r.level AS role_level,
            r.data_scope, r.role_type, r.is_active AS role_active
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [userId],
  );
  const u = rows[0];
  if (!u) return null;

  const isSuperAdmin = u.role_level === 0;
  return {
    userId: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    empCode: u.emp_code,
    isActive: u.is_active && u.role_active,
    customerId: u.customer_id,
    vendorId: u.vendor_id,
    role: {
      id: u.role_id,
      code: u.role_code,
      name: u.role_name,
      level: u.role_level,
      dataScope: u.data_scope,
      roleType: u.role_type,
    },
    isSuperAdmin,
    permissions: isSuperAdmin ? {} : await loadRolePermissions(db, u.role_id),
  };
}

/** Super Admin (level 0) can do everything; everyone else needs the flag on the screen. */
export function can(auth, screen, action = 'view') {
  if (!auth) return false;
  if (auth.isSuperAdmin) return true;
  return Boolean(auth.permissions[screen]?.[action]);
}
