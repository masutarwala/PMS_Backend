import { paginationQuerySchema, pagedResponseSchema } from '../../utils/query.js';

const tags = ['Timesheet'];
const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } };
const scope = { type: 'string', enum: ['mine', 'team'], default: 'mine', description: 'mine = own entries; team = per the role data scope' };

const entry = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    userId: { type: 'integer' },
    userName: { type: 'string' },
    workDate: { type: 'string' },
    projectId: { type: 'integer' },
    projectCode: { type: 'string' },
    projectTitle: { type: 'string' },
    taskGroupId: { type: 'integer' },
    taskGroupName: { type: 'string' },
    taskTypeId: { type: 'integer' },
    taskTypeName: { type: 'string' },
    taskId: { type: ['integer', 'null'] },
    taskName: { type: ['string', 'null'] },
    minutes: { type: 'integer' },
    hours: { type: 'number' },
    comment: { type: ['string', 'null'] },
    isBillable: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// time spent in whole minutes; the day total is capped at 24 h (1440 mins) by the service
const fields = {
  workDate: { type: 'string', format: 'date' },
  projectId: { type: 'integer', minimum: 1 },
  taskGroupId: { type: 'integer', minimum: 1, description: 'must be a group of the project estimate' },
  taskTypeId: { type: 'integer', minimum: 1 },
  taskId: { type: ['integer', 'null'], minimum: 1 },
  minutes: { type: 'integer', minimum: 1, maximum: 1440 },
  comment: { type: 'string', minLength: 1, maxLength: 2000, pattern: '\\S' },
  isBillable: { type: 'boolean' },
};

export const listSchema = {
  tags,
  summary: 'Time entries (own, or the team per the role data scope)',
  querystring: {
    type: 'object',
    properties: {
      ...paginationQuerySchema,
      sortDir: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
      sortBy: { type: 'string', enum: ['workDate', 'minutes', 'project', 'createdAt'], default: 'workDate' },
      scope,
      projectId: { type: 'string', description: 'comma-separated ids' },
      userId: { type: 'string', description: 'comma-separated ids (team scope)' },
      taskGroupId: { type: 'string', description: 'comma-separated ids' },
      isBillable: { type: 'boolean' },
      from: { type: 'string', format: 'date' },
      to: { type: 'string', format: 'date' },
    },
  },
  response: { 200: { ...pagedResponseSchema(entry), properties: { ...pagedResponseSchema(entry).properties, totalMinutes: { type: 'integer' }, totalHours: { type: 'number' } } } },
};

export const summarySchema = {
  tags,
  summary: 'This week: hours, billable split, projects',
  querystring: { type: 'object', properties: { scope } },
  response: {
    200: {
      type: 'object',
      properties: {
        weekHours: { type: 'number' },
        billableHours: { type: 'number' },
        nonBillableHours: { type: 'number' },
        todayHours: { type: 'number' },
        projects: { type: 'integer' },
        clientProjects: { type: 'integer' },
        internalProjects: { type: 'integer' },
        daysLogged: { type: 'integer' },
      },
    },
  },
};

export const optionsSchema = {
  tags,
  summary: 'Assigned projects with the task groups of their estimate, task types and tasks',
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          title: { type: 'string' },
          taskGroups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                effortPercentage: { type: 'number' },
                taskTypes: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } },
              },
            },
          },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'integer' }, name: { type: 'string' }, taskGroupId: { type: ['integer', 'null'] }, taskTypeId: { type: ['integer', 'null'] } },
            },
          },
        },
      },
    },
  },
};

export const filterProjectsSchema = {
  tags,
  summary: 'Projects for the list filter (all projects for the Super Admin)',
  response: {
    200: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, code: { type: 'string' }, title: { type: 'string' } } } },
  },
};

export const getSchema = { tags, summary: 'A time entry', params: idParams, response: { 200: entry } };

export const createSchema = {
  tags,
  summary: 'Log time',
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['workDate', 'projectId', 'taskTypeId', 'minutes', 'comment'],
    properties: fields,
  },
  response: { 201: entry },
};

export const updateSchema = {
  tags,
  summary: 'Update an own time entry',
  params: idParams,
  body: { type: 'object', additionalProperties: false, minProperties: 1, properties: fields },
  response: { 200: entry },
};

export const deleteSchema = { tags, summary: 'Delete an own time entry', params: idParams, response: { 204: { type: 'null' } } };
