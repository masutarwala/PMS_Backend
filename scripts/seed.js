// Seeds the data needed to sign in and create projects. Safe to run more than once:
// existing rows (matched by their natural key) are left as they are.
import bcrypt from 'bcryptjs';
import pg from 'pg';

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

// ---------------------------------------------------------------- RBAC
const ROLES = [
  // code, name, level, role_type, data_scope, is_system
  ['SUPER_ADMIN', 'Super Admin', 0, 'internal', 'all', true],
  ['ADMIN', 'Admin', 1, 'internal', 'all', true],
  ['PROJECT_MANAGER', 'Project Manager', 2, 'internal', 'team', false],
  ['EMPLOYEE', 'Employee', 5, 'internal', 'own', true],
  ['CUSTOMER', 'Customer', 8, 'external', 'customer', false],
  ['VENDOR', 'Vendor', 9, 'external', 'vendor', false],
];

// Modules (parent menus) and their screens. url = React route = RBAC screen key.
const MENUS = [
  {
    name: 'Administration', icon: 'settings-2', order: 10,
    children: [
      { name: 'Users', url: '/administration/users', order: 1 },
      { name: 'Roles & Permissions', url: '/administration/roles', order: 2 },
      { name: 'Teams', url: '/administration/teams', order: 3 },
      { name: 'Parameters', url: '/administration/parameters', order: 4 },
      { name: 'Site Master', url: '/administration/sites', order: 5 },
      { name: 'Shift Master', url: '/administration/shifts', order: 6 },
      { name: 'Resource Grade & Cost', url: '/administration/resource-grades', order: 8 },
      { name: 'Task Groups', url: '/administration/task-groups', order: 9 },
      { name: 'Task Types', url: '/administration/task-types', order: 10 },
      { name: 'Project Divisions', url: '/administration/project-divisions', order: 11 },
      { name: 'Project Types', url: '/administration/project-types', order: 12 },
      { name: 'Project Stages', url: '/administration/project-stages', order: 13 },
    ],
  },
  {
    name: 'Customers & Vendors', icon: 'building-2', order: 15,
    children: [{ name: 'Customers', url: '/customers', order: 1 }],
  },
  {
    name: 'Projects', icon: 'folder-kanban', order: 20,
    children: [{ name: 'Project List', url: '/projects', order: 1 }],
  },
  {
    name: 'Timesheet', icon: 'clock-3', order: 30,
    children: [{ name: 'Timesheet', url: '/timesheet', order: 1 }],
  },
];

const ALL = { view: true, create: true, edit: true, delete: true, approve: true, export: true };
const CONFIG_SCREENS = [
  '/administration/teams', '/administration/parameters', '/administration/sites', '/administration/shifts', '/administration/resource-grades', '/administration/task-groups',
  '/administration/task-types', '/administration/project-divisions', '/administration/project-types', '/administration/project-stages', '/customers',
];
// role code -> screen url -> actions (Super Admin needs none: level 0 can do everything).
// Rows that already exist are not changed, so edits made on the Roles screen are kept.
const PERMISSIONS = {
  ADMIN: {
    '/administration/users': ALL,
    '/administration/roles': ALL,
    '/projects': ALL,
    '/timesheet': ALL,
    ...Object.fromEntries(CONFIG_SCREENS.map((u) => [u, ALL])),
  },
  PROJECT_MANAGER: {
    '/administration/users': { view: true },
    '/projects': { view: true, create: true, edit: true, export: true },
    '/customers': { view: true, create: true, edit: true, export: true },
    '/administration/project-types': { view: true },
    '/administration/project-stages': { view: true },
    '/timesheet': { view: true, create: true, edit: true, delete: true, export: true },
  },
  // everyone logs their own time
  EMPLOYEE: { '/projects': { view: true }, '/timesheet': { view: true, create: true, edit: true, delete: true } },
  CUSTOMER: { '/projects': { view: true } },
};

// ---------------------------------------------------------------- Masters
const USER_TYPES = ['Employee', 'Contractor', 'Customer user', 'Vendor user'];
const COUNTRIES = [['India', 'IN'], ['United Arab Emirates', 'AE'], ['United Kingdom', 'GB'], ['United States', 'US']];
// teams [name, country code] and grade levels (lookups GRADE); a resource grade = team + level
const TEAMS = [['Web India', 'IN'], ['SW India', 'IN'], ['SW UAE', 'AE']];
const GRADES = ['Level A', 'Level B', 'Level C', 'Level D', 'Level E'];
const TEAM_GRADES = {
  'Web India': ['Level A', 'Level B', 'Level C', 'Level D', 'Level E'],
  'SW India': ['Level A', 'Level B', 'Level C', 'Level D', 'Level E'],
  'SW UAE': ['Level A', 'Level B', 'Level C'],
};
// job roles for task templates (AssignedRoles column of the task-template sheet)
const TASK_ROLES = ['Project Manager', 'Analyst', 'UX/UI Designer', 'Visual Designer', 'Content Writer', 'Developer', 'QA Engineer', 'SEO Specialist'];
const CURRENCIES = [['Indian Rupee', 'INR'], ['US Dollar', 'USD'], ['UAE Dirham', 'AED'], ['Pound Sterling', 'GBP'], ['Euro', 'EUR']];
const SITES = ['Emqube DXB', 'Emqube Mumbai'];
const SHIFTS = [
  ['Dubai Shift 2020', '08:30', '18:00', 15, 240],
  ['DXB Shift', '09:00', '18:00', 15, 240],
  ['Mumbai Shift', '10:00', '19:00', 15, 240],
  ['Shift 2', '14:00', '18:00', 15, 120],
];
const TASK_GROUPS = {
  Analysis: ['Requirement Analysis', 'Scope Document'],
  'UX/UI': ['Wireframes', 'UI Design'],
  Development: ['Front-end Development', 'Back-end Development', 'CMS Integration'],
  'Quality Assurance': ['Functional Testing', 'UAT Support'],
  'Deployment & Training': ['Deployment', 'User Training'],
  'Post Live Support': ['Post Live Support', 'Bug Fixing'],
  'Content Creation': ['Content Writing', 'Image & Video Content'],
  'Project Management': ['Project Management', 'Client Meetings'],
};
const DIVISIONS = [['Web', 'Websites, portals and digital marketing'], ['Software', 'Custom software and apps']];
const PROJECT_TYPES = [
  'Website Development', 'Website Tech Support', 'Website Content Support', 'Website Tech & Content',
  'Digital Marketing Full', 'Social Media Full', 'Search Engine', 'Google Ads', 'SEO & Google Ads',
  'Corporate Video', 'Social Media Content',
];
// project type -> task group -> default effort % (each type totals 100)
const DEFAULT_ESTIMATES = {
  'Website Development': {
    Analysis: 15, 'UX/UI': 20, Development: 35, 'Quality Assurance': 10,
    'Deployment & Training': 5, 'Post Live Support': 5, 'Content Creation': 5, 'Project Management': 5,
  },
  'Website Tech Support': { Development: 50, 'Quality Assurance': 15, 'Post Live Support': 25, 'Project Management': 10 },
  'Website Content Support': { 'Content Creation': 80, 'Quality Assurance': 10, 'Project Management': 10 },
  'Website Tech & Content': { Development: 40, 'Content Creation': 35, 'Quality Assurance': 15, 'Project Management': 10 },
};
// project type -> [task group, task type, task title]
const TASK_TEMPLATES = {
  'Website Development': [
    ['Analysis', 'Requirement Analysis', 'Requirement gathering & sign-off'],
    ['UX/UI', 'Wireframes', 'Wireframes'],
    ['UX/UI', 'UI Design', 'Visual design'],
    ['Development', 'Front-end Development', 'Front-end build'],
    ['Development', 'Back-end Development', 'Back-end & CMS setup'],
    ['Quality Assurance', 'Functional Testing', 'Testing'],
    ['Deployment & Training', 'Deployment', 'Go-live'],
    ['Project Management', 'Project Management', 'Project management'],
  ],
  'Website Tech Support': [
    ['Post Live Support', 'Post Live Support', 'Monthly support'],
    ['Project Management', 'Client Meetings', 'Monthly review call'],
  ],
};
const CUSTOMERS = [
  ['CUS-001', 'Acme Retail Pvt Ltd'], ['CUS-002', 'Zen Foods'], ['CUS-003', 'Swan Solutions'],
  ['CUS-004', 'BlueOcean Logistics'], ['CUS-005', 'Nova Healthcare'], ['CUS-006', 'Metro Builders'],
  ['CUS-007', 'Greenleaf Organics'], ['CUS-008', 'Orbit Telecom'],
];

// ---------------------------------------------------------------- helpers
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const q = (sql, params) => client.query(sql, params);
const one = async (sql, params) => (await q(sql, params)).rows[0];

/** Inserts when no row matches `where`; returns the id either way. */
async function ensure(table, where, values) {
  const wKeys = Object.keys(where);
  const found = await one(
    `SELECT id FROM ${table} WHERE ${wKeys.map((k, i) => `${k} IS NOT DISTINCT FROM $${i + 1}`).join(' AND ')}`,
    Object.values(where),
  );
  if (found) return found.id;
  const all = { ...where, ...values };
  const keys = Object.keys(all);
  const row = await one(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    Object.values(all),
  );
  return row.id;
}

// ---------------------------------------------------------------- run
try {
  await client.connect();
  await q('BEGIN');

  const roleIds = {};
  for (const [code, name, level, roleType, dataScope, isSystem] of ROLES) {
    roleIds[code] = await ensure('roles', { code }, { name, level, role_type: roleType, data_scope: dataScope, is_system: isSystem });
  }

  const menuIds = {};
  for (const mod of MENUS) {
    const parentId = await ensure('menus', { name: mod.name, parent_id: null }, { icon: mod.icon, display_order: mod.order });
    for (const s of mod.children) {
      // actions: only list 'approve' for screens with an approval step; the column default covers the rest
      menuIds[s.url] = await ensure('menus', { url: s.url }, { name: s.name, parent_id: parentId, display_order: s.order, ...(s.actions ? { actions: s.actions } : {}) });
    }
  }

  for (const [roleCode, screens] of Object.entries(PERMISSIONS)) {
    for (const [url, a] of Object.entries(screens)) {
      // only actions the screen supports (menus.actions) are stored
      await q(
        `INSERT INTO role_permissions (role_id, menu_id, can_view, can_create, can_edit, can_delete, can_approve, can_export)
         SELECT $1, m.id, $3 AND 'view' = ANY (m.actions), $4 AND 'create' = ANY (m.actions), $5 AND 'edit' = ANY (m.actions),
                $6 AND 'delete' = ANY (m.actions), $7 AND 'approve' = ANY (m.actions), $8 AND 'export' = ANY (m.actions)
           FROM menus m WHERE m.id = $2
         ON CONFLICT (role_id, menu_id) DO NOTHING`,
        [roleIds[roleCode], menuIds[url], !!a.view, !!a.create, !!a.edit, !!a.delete, !!a.approve, !!a.export],
      );
    }
  }

  for (const [i, name] of USER_TYPES.entries()) {
    await q(`INSERT INTO lookups (type, name, display_order) VALUES ('USER_TYPE', $1, $2) ON CONFLICT (type, name) DO NOTHING`, [name, i + 1]);
  }
  const gradeIds = {};
  for (const [i, name] of GRADES.entries()) {
    ({ id: gradeIds[name] } = await one(
      `INSERT INTO lookups (type, name, display_order) VALUES ('GRADE', $1, $2)
       ON CONFLICT (type, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [name, i + 1],
    ));
  }
  for (const [i, name] of TASK_ROLES.entries()) {
    await q(`INSERT INTO lookups (type, name, display_order) VALUES ('TASK_ROLE', $1, $2) ON CONFLICT (type, name) DO NOTHING`, [name, i + 1]);
  }
  for (const [type, list] of [['COUNTRY', COUNTRIES], ['CURRENCY', CURRENCIES]]) {
    for (const [i, [name, value]] of list.entries()) {
      await q(`INSERT INTO lookups (type, name, value, display_order) VALUES ($1, $2, $3, $4) ON CONFLICT (type, name) DO NOTHING`, [type, name, value, i + 1]);
    }
  }
  const siteIds = {};
  for (const name of SITES) siteIds[name] = await ensure('sites', { name }, {});
  const shiftIds = {};
  for (const [name, start, end, late, half] of SHIFTS) {
    shiftIds[name] = await ensure('shifts', { name }, { start_time: start, end_time: end, late_after_minutes: late, half_day_minutes: half });
  }

  const groupIds = {};
  const typeIds = {};
  for (const [group, types] of Object.entries(TASK_GROUPS)) {
    groupIds[group] = await ensure('task_groups', { name: group }, {});
    for (const t of types) typeIds[`${group}/${t}`] = await ensure('task_types', { task_group_id: groupIds[group], name: t }, {});
  }

  for (const [name, description] of DIVISIONS) await ensure('project_divisions', { name }, { description });
  const projectTypeIds = {};
  for (const name of PROJECT_TYPES) projectTypeIds[name] = await ensure('project_types', { name }, {});

  for (const [type, groups] of Object.entries(DEFAULT_ESTIMATES)) {
    for (const [group, pct] of Object.entries(groups)) {
      await ensure('project_type_default_estimates', { project_type_id: projectTypeIds[type], task_group_id: groupIds[group] }, { effort_percentage: pct });
    }
  }
  for (const [type, tasks] of Object.entries(TASK_TEMPLATES)) {
    for (const [i, [group, taskType, title]] of tasks.entries()) {
      await ensure(
        'project_type_task_templates',
        { project_type_id: projectTypeIds[type], task_title: title },
        { task_group_id: groupIds[group], task_type_id: typeIds[`${group}/${taskType}`], sort_order: i + 1 },
      );
    }
  }

  for (const [code, name] of CUSTOMERS) {
    await q(`INSERT INTO customers (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`, [code, name]);
  }

  for (const [name, country] of TEAMS) {
    const c = await one(`SELECT id FROM lookups WHERE type = 'COUNTRY' AND value = $1`, [country]);
    const teamId = await ensure('teams', { name }, { country_id: c?.id ?? null });
    for (const level of TEAM_GRADES[name]) await ensure('resource_grades', { grade_id: gradeIds[level], team_id: teamId }, {});
  }

  const existingAdmin = await one(`SELECT id FROM users WHERE username = $1`, [ADMIN_USERNAME]);
  if (!existingAdmin) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await q(
      `INSERT INTO users (emp_code, username, password_hash, name, email, role_id, site_id, shift_id)
       VALUES ('EMP-1001', $1, $2, 'System Administrator', 'admin@emqube.com', $3, $4, $5)`,
      [ADMIN_USERNAME, hash, roleIds.SUPER_ADMIN, siteIds['Emqube Mumbai'], shiftIds['Mumbai Shift']],
    );
    console.log(`Super Admin created → username: ${ADMIN_USERNAME}  password: ${ADMIN_PASSWORD}  (change it after first login)`);
  } else {
    console.log(`Super Admin "${ADMIN_USERNAME}" already exists (password unchanged)`);
  }

  await q('COMMIT');
  console.log('Seed completed');
} catch (err) {
  await q('ROLLBACK').catch(() => {});
  console.error(`Seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
