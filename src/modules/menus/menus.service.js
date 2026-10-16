import { can } from '../auth/auth-context.js';
import { ACTIONS } from '../../config/menus.js';

/** All visible menus as a tree: modules (parent_id null) with their screens. */
export async function getMenuTree(db) {
  const { rows } = await db.query(
    `SELECT id, name, parent_id, url, icon, display_order, actions
       FROM menus
      WHERE is_visible
      ORDER BY display_order, name`,
  );
  const modules = rows.filter((m) => m.parent_id === null).map((m) => ({ ...toDto(m), children: [] }));
  const byId = new Map(modules.map((m) => [m.id, m]));
  for (const m of rows) {
    if (m.parent_id !== null) byId.get(m.parent_id)?.children.push(toDto(m));
  }
  return modules;
}

/** The sidebar for one user: only screens the role can view; empty modules are dropped. */
export async function getUserMenus(db, auth) {
  const tree = await getMenuTree(db);
  return tree
    .map((mod) => ({ ...mod, children: mod.children.filter((c) => c.url && can(auth, c.url, 'view')) }))
    .filter((mod) => mod.children.length > 0);
}

/** Effective permission flags for every screen (Super Admin gets every action the screen supports). */
export async function getUserPermissions(db, auth) {
  const { rows } = await db.query(`SELECT url, actions FROM menus WHERE url IS NOT NULL`);
  const out = {};
  for (const { url, actions } of rows) {
    out[url] = Object.fromEntries(ACTIONS.map((a) => [a, actions.includes(a) && can(auth, url, a)]));
  }
  return out;
}

function toDto(m) {
  return { id: m.id, name: m.name, url: m.url, icon: m.icon, displayOrder: m.display_order, actions: m.actions };
}
