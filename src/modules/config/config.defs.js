import { SCREENS } from '../../config/menus.js';
import { badRequest } from '../../utils/errors.js';

// Field schemas reused below
const name = (max = 100) => ({ col: 'name', schema: { type: 'string', minLength: 1, maxLength: max } });
const description = { col: 'description', schema: { type: ['string', 'null'], maxLength: 2000 } };
const isActive = { col: 'is_active', schema: { type: 'boolean' } };
const time = (col) => ({ col, schema: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$' } });
const minutes = (col) => ({ col, schema: { type: ['integer', 'null'], minimum: 0, maximum: 1440 } });

const activeFilter = {
  isActive: { schema: { type: 'boolean' }, sql: (w, v) => w.add('s.is_active = $?', v) },
};

/** Lookup types managed on the Parameters screen (lookups.type). */
export const LOOKUP_TYPES = ['USER_TYPE', 'COUNTRY', 'CURRENCY', 'TASK_ROLE', 'GRADE'];

export const CONFIG_DEFS = [
  {
    name: 'parameters',
    label: 'Parameters',
    table: 'lookups',
    screen: SCREENS.PARAMETERS,
    fields: {
      type: { col: 'type', schema: { type: 'string', minLength: 1, maxLength: 50, pattern: '^[A-Z][A-Z0-9_]*$' } },
      name: name(150),
      value: { col: 'value', schema: { type: ['string', 'null'], maxLength: 150 } },
      displayOrder: { col: 'display_order', schema: { type: 'integer', minimum: 0, maximum: 9999 } },
      isVisible: { col: 'is_visible', schema: { type: 'boolean' } },
    },
    required: ['type', 'name'],
    // project stages have their own screen
    select: `SELECT x.id, x.type, x.name, x.value, x.display_order, x.is_visible, x.created_at, x.updated_at FROM lookups x WHERE x.type <> 'PROJECT_STAGE'`,
    search: ['name', 'value', 'type'],
    filters: {
      type: { schema: { type: 'string' }, sql: (w, v) => w.add('s.type = ANY($?)', String(v).split(',')) },
      isVisible: { schema: { type: 'boolean' }, sql: (w, v) => w.add('s.is_visible = $?', v) },
    },
    sort: { name: 's.name', type: 's.type', displayOrder: 's.display_order' },
    defaultSort: 's.type, s.display_order, s.name',
    uniqueMessage: 'This parameter already exists for the selected type',
  },
  {
    name: 'teams',
    label: 'Teams',
    table: 'teams',
    screen: SCREENS.TEAMS,
    fields: {
      name: name(),
      countryId: { col: 'country_id', schema: { type: ['integer', 'null'], minimum: 1 } },
    },
    required: ['name'],
    computed: { countryName: { type: ['string', 'null'] }, userCount: { type: 'integer' }, gradeCount: { type: 'integer' } },
    select: `SELECT x.id, x.name, x.country_id, c.name AS country_name, x.created_at, x.updated_at,
                    (SELECT count(*)::int FROM user_teams ut WHERE ut.team_id = x.id) AS user_count,
                    (SELECT count(*)::int FROM resource_grades rg WHERE rg.team_id = x.id) AS grade_count
               FROM teams x LEFT JOIN lookups c ON c.id = x.country_id`,
    search: ['name', 'country_name'],
    filters: { countryId: { schema: { type: 'string' }, sql: (w, v, ids) => w.add('s.country_id = ANY($?)', ids(v)) } },
    sort: { name: 's.name' },
    uniqueMessage: 'A team with this name already exists',
    inUseMessage: 'This team has users or resource grades – remove those first',
  },
  {
    name: 'sites',
    label: 'Sites',
    table: 'sites',
    screen: SCREENS.SITES,
    fields: { name: name(), isActive },
    required: ['name'],
    computed: { userCount: { type: 'integer' } },
    select: `SELECT x.id, x.name, x.is_active, x.created_at, x.updated_at,
                    (SELECT count(*)::int FROM users u WHERE u.site_id = x.id) AS user_count
               FROM sites x`,
    search: ['name'],
    filters: activeFilter,
    sort: { name: 's.name', userCount: 's.user_count' },
    // sites.name has no unique key in the schema – keep names unique here
    beforeSave: async (db, body, id) => {
      if (!body.name) return;
      const { rowCount } = await db.query(`SELECT 1 FROM sites WHERE lower(name) = lower($1) AND id IS DISTINCT FROM $2`, [body.name.trim(), id]);
      if (rowCount) throw badRequest('A site with this name already exists', [{ field: 'name', message: 'already exists' }]);
    },
  },
  {
    name: 'shifts',
    label: 'Shifts',
    table: 'shifts',
    screen: SCREENS.SHIFTS,
    fields: {
      name: name(),
      startTime: time('start_time'),
      endTime: time('end_time'),
      lateAfterMinutes: minutes('late_after_minutes'),
      halfDayMinutes: minutes('half_day_minutes'),
    },
    required: ['name', 'startTime', 'endTime'],
    computed: { userCount: { type: 'integer' } },
    select: `SELECT x.id, x.name, to_char(x.start_time, 'HH24:MI') AS start_time, to_char(x.end_time, 'HH24:MI') AS end_time,
                    x.late_after_minutes, x.half_day_minutes, x.created_at, x.updated_at,
                    (SELECT count(*)::int FROM users u WHERE u.shift_id = x.id) AS user_count
               FROM shifts x`,
    search: ['name'],
    sort: { name: 's.name', startTime: 's.start_time', userCount: 's.user_count' },
    defaultSort: 's.start_time',
    beforeSave: async (db, body, id) => {
      if (!body.name) return;
      const { rowCount } = await db.query(`SELECT 1 FROM shifts WHERE lower(name) = lower($1) AND id IS DISTINCT FROM $2`, [body.name.trim(), id]);
      if (rowCount) throw badRequest('A shift with this name already exists', [{ field: 'name', message: 'already exists' }]);
    },
  },
  {
    name: 'task-groups',
    label: 'Task Groups',
    table: 'task_groups',
    screen: SCREENS.TASK_GROUPS,
    fields: { name: name() },
    required: ['name'],
    computed: { taskTypeCount: { type: 'integer' } },
    select: `SELECT x.id, x.name, x.created_at, x.updated_at,
                    (SELECT count(*)::int FROM task_types t WHERE t.task_group_id = x.id) AS task_type_count
               FROM task_groups x`,
    search: ['name'],
    sort: { name: 's.name', taskTypeCount: 's.task_type_count' },
    uniqueMessage: 'A task group with this name already exists',
    inUseMessage: 'This task group has task types or is used by projects – remove those first',
  },
  {
    name: 'task-types',
    label: 'Task Types',
    table: 'task_types',
    screen: SCREENS.TASK_TYPES,
    fields: {
      name: name(),
      taskGroupId: { col: 'task_group_id', schema: { type: 'integer', minimum: 1 } },
      description,
      procedureText: { col: 'procedure_text', schema: { type: ['string', 'null'], maxLength: 10000 } },
      completionCertificate: { col: 'completion_certificate', schema: { type: ['string', 'null'], maxLength: 500 } },
      isActive,
    },
    required: ['name', 'taskGroupId'],
    computed: { taskGroupName: { type: 'string' } },
    select: `SELECT x.id, x.name, x.task_group_id, g.name AS task_group_name, x.description, x.procedure_text,
                    x.completion_certificate, x.is_active, x.created_at, x.updated_at
               FROM task_types x JOIN task_groups g ON g.id = x.task_group_id`,
    search: ['name', 'task_group_name'],
    filters: {
      ...activeFilter,
      taskGroupId: { schema: { type: 'string' }, sql: (w, v, ids) => w.add('s.task_group_id = ANY($?)', ids(v)) },
    },
    sort: { name: 's.name', taskGroupName: 's.task_group_name' },
    defaultSort: 's.task_group_name, s.name',
    uniqueMessage: 'This task group already has a task type with this name',
  },
  {
    name: 'project-divisions',
    label: 'Project Divisions',
    table: 'project_divisions',
    screen: SCREENS.PROJECT_DIVISIONS,
    fields: { name: name(), description, isActive },
    required: ['name'],
    computed: { projectCount: { type: 'integer' } },
    select: `SELECT x.id, x.name, x.description, x.is_active, x.created_at, x.updated_at,
                    (SELECT count(*)::int FROM projects p WHERE p.project_division_id = x.id) AS project_count
               FROM project_divisions x`,
    search: ['name', 'description'],
    filters: activeFilter,
    sort: { name: 's.name', projectCount: 's.project_count' },
    uniqueMessage: 'A project division with this name already exists',
  },
  {
    name: 'project-stages',
    label: 'Project Stages',
    table: 'lookups',
    screen: SCREENS.PROJECT_STAGES,
    fixed: { type: 'PROJECT_STAGE' },
    fields: {
      name: name(150),
      value: { col: 'value', schema: { type: 'string', enum: ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'] } },
      displayOrder: { col: 'display_order', schema: { type: 'integer', minimum: 0, maximum: 9999 } },
      isVisible: { col: 'is_visible', schema: { type: 'boolean' } },
    },
    required: ['name', 'value'],
    computed: { projectCount: { type: 'integer' } },
    select: `SELECT x.id, x.name, x.value, x.display_order, x.is_visible, x.created_at, x.updated_at,
                    (SELECT count(*)::int FROM projects p WHERE p.stage_id = x.id) AS project_count
               FROM lookups x WHERE x.type = 'PROJECT_STAGE'`,
    search: ['name'],
    filters: { value: { schema: { type: 'string' }, sql: (w, v) => w.add('s.value = ANY($?)', String(v).split(',')) } },
    sort: { name: 's.name', displayOrder: 's.display_order' },
    defaultSort: 's.display_order, s.name',
    uniqueMessage: 'A stage with this name already exists',
    inUseMessage: 'Projects are in this stage – move them or hide the stage instead',
  },
  {
    name: 'customers',
    label: 'Customers',
    table: 'customers',
    screen: SCREENS.CUSTOMERS,
    fields: {
      code: { col: 'code', schema: { type: 'string', minLength: 1, maxLength: 30 } },
      name: name(200),
      countryId: { col: 'country_id', schema: { type: ['integer', 'null'], minimum: 1 } },
      contactPerson: { col: 'contact_person', schema: { type: ['string', 'null'], maxLength: 150 } },
      // optional "+", digits with spaces / dashes / brackets; max 15 characters, at least 7 digits
      contactNumber: {
        col: 'contact_number',
        schema: { anyOf: [{ type: 'string', maxLength: 15, pattern: '^(?=(?:\\D*\\d){7,15}\\D*$)\\+?[0-9 ()-]+$' }, { type: 'string', maxLength: 0 }, { type: 'null' }] },
      },
      email: { col: 'email', schema: { anyOf: [{ type: 'string', format: 'email', maxLength: 150 }, { type: 'string', maxLength: 0 }, { type: 'null' }] } },
      isActive,
    },
    required: ['code', 'name'],
    computed: { countryName: { type: ['string', 'null'] }, projectCount: { type: 'integer' }, email: { type: ['string', 'null'] } },
    select: `SELECT x.id, x.code, x.name, x.country_id, c.name AS country_name, x.contact_person, x.contact_number, x.email,
                    x.is_active, x.created_at, x.updated_at,
                    (SELECT count(*)::int FROM projects p WHERE p.customer_id = x.id) AS project_count
               FROM customers x LEFT JOIN lookups c ON c.id = x.country_id`,
    search: ['name', 'code', 'contact_person', 'email'],
    filters: {
      ...activeFilter,
      countryId: { schema: { type: 'string' }, sql: (w, v, ids) => w.add('s.country_id = ANY($?)', ids(v)) },
    },
    sort: { name: 's.name', code: 's.code', projectCount: 's.project_count' },
    uniqueMessage: 'A customer with this code already exists',
  },
];
