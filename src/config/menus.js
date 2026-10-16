// Screen keys used by the RBAC checks. They are the `menus.url` values (React routes),
// so the same key drives the API permission check and the frontend route guard.
export const SCREENS = Object.freeze({
  USERS: '/administration/users',
  ROLES: '/administration/roles',
  TEAMS: '/administration/teams',
  PARAMETERS: '/administration/parameters',
  SITES: '/administration/sites',
  SHIFTS: '/administration/shifts',
  RESOURCE_GRADES: '/administration/resource-grades',
  TASK_GROUPS: '/administration/task-groups',
  TASK_TYPES: '/administration/task-types',
  PROJECT_DIVISIONS: '/administration/project-divisions',
  PROJECT_TYPES: '/administration/project-types',
  PROJECT_STAGES: '/administration/project-stages',
  CUSTOMERS: '/customers',
  PROJECTS: '/projects',
  TIMESHEET: '/timesheet',
});

export const ACTIONS = Object.freeze(['view', 'create', 'edit', 'delete', 'approve', 'export']);
