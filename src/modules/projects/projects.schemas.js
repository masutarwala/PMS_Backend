import { paginationQuerySchema, pagedResponseSchema } from '../../utils/query.js';
import { PROJECT_STATUSES } from './projects.service.js';
import { ACCESS_LEVELS } from './projects.tabs.js';

const tags = ['Projects'];
const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } };
const nullableDate = { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] };

const project = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    code: { type: 'string' },
    title: { type: 'string' },
    customerId: { type: ['integer', 'null'] },
    customerName: { type: ['string', 'null'] },
    ownerId: { type: 'integer' },
    ownerName: { type: 'string' },
    ownerEmail: { type: ['string', 'null'] },
    projectDivisionId: { type: 'integer' },
    divisionName: { type: 'string' },
    projectTypeId: { type: 'integer' },
    typeName: { type: 'string' },
    isRetainerProject: { type: 'boolean' },
    startDate: { type: 'string' },
    endDate: { type: ['string', 'null'] },
    estimatedHours: { type: ['number', 'null'] },
    estimatedAmount: { type: ['number', 'null'] },
    estimatedAmountCurrency: { type: ['string', 'null'] },
    sharepointLink: { type: ['string', 'null'] },
    detail: { type: ['string', 'null'] },
    status: { type: 'string' },
    stageId: { type: ['integer', 'null'] },
    stageName: { type: ['string', 'null'] },
    progress: { type: 'integer' },
    loggedHours: { type: 'number' },
    lastComment: { type: ['string', 'null'] },
    lastCommentBy: { type: ['string', 'null'] },
    lastCommentAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    lastReviewDate: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const projectDetail = {
  ...project,
  properties: {
    ...project.properties,
    taskCount: { type: 'integer' },
    createdByName: { type: ['string', 'null'] },
    updatedByName: { type: ['string', 'null'] },
    members: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          accessLevel: { type: 'string' },
          costPerHour: { type: ['number', 'null'] },
          currency: { type: ['string', 'null'] },
          defaultRate: { type: ['number', 'null'] },
          defaultRateCurrency: { type: ['string', 'null'] },
          gradeName: { type: ['string', 'null'] },
          teamName: { type: ['string', 'null'] },
          position: { type: ['string', 'null'] },
          loggedHours: { type: 'number' },
          isOwner: { type: 'boolean' },
        },
      },
    },
    memberHours: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'integer' }, name: { type: 'string' }, hours: { type: 'number' }, rate: { type: ['number', 'null'] }, cost: { type: ['number', 'null'] } },
      },
    },
    estimates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskGroupId: { type: 'integer' },
          taskGroupName: { type: 'string' },
          effortPercentage: { type: 'number' },
          hours: { type: ['number', 'null'] },
          actualHours: { type: 'number' },
        },
      },
    },
  },
};

const projectFields = {
  title: { type: 'string', minLength: 1, maxLength: 200 },
  customerId: { type: ['integer', 'null'], minimum: 1 },
  ownerId: { type: 'integer', minimum: 1 },
  projectDivisionId: { type: 'integer', minimum: 1 },
  projectTypeId: { type: 'integer', minimum: 1 },
  startDate: { type: 'string', format: 'date' },
  endDate: nullableDate,
  estimatedHours: { type: ['number', 'null'], minimum: 0 },
  estimatedAmount: { type: ['number', 'null'], minimum: 0 },
  estimatedAmountCurrency: { anyOf: [{ type: 'string', pattern: '^[A-Z]{3}$' }, { type: 'null' }] },
  sharepointLink: { anyOf: [{ type: 'string', format: 'uri', maxLength: 500 }, { type: 'string', maxLength: 0 }, { type: 'null' }] },
  isRetainerProject: { type: 'boolean' },
  detail: { type: ['string', 'null'], maxLength: 10000 },
  stageId: { type: 'integer', minimum: 1, description: 'project stage (lookups PROJECT_STAGE); defaults to Draft' },
};

export const listProjectsSchema = {
  tags,
  summary: 'List projects visible to the user (role data scope applies)',
  querystring: {
    type: 'object',
    properties: {
      ...paginationQuerySchema,
      sortDir: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
      sortBy: { type: 'string', enum: ['title', 'code', 'endDate', 'startDate', 'createdAt'], default: 'createdAt' },
      tab: { type: 'string', enum: ['all', 'mine', 'owned'], default: 'all' },
      status: { type: 'string', description: `stage category, comma-separated: ${PROJECT_STATUSES.join(',')}` },
      stageId: { type: 'string', description: 'comma-separated stage ids' },
      divisionId: { type: 'string', description: 'comma-separated ids' },
      typeId: { type: 'string', description: 'comma-separated ids' },
      ownerId: { type: 'string', description: 'comma-separated ids' },
      customerId: { type: 'string', description: 'comma-separated ids' },
      isRetainerProject: { type: 'boolean' },
      overdue: { type: 'boolean', description: 'active projects past their end date' },
      startFrom: { type: 'string', format: 'date' },
      startTo: { type: 'string', format: 'date' },
      endFrom: { type: 'string', format: 'date' },
      endTo: { type: 'string', format: 'date' },
    },
  },
  response: { 200: pagedResponseSchema(project) },
};

export const summarySchema = {
  tags,
  summary: 'Project counts for the summary cards and tabs',
  response: {
    200: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        active: { type: 'integer' },
        overdue: { type: 'integer' },
        createdThisMonth: { type: 'integer' },
        mine: { type: 'integer' },
        owned: { type: 'integer' },
        byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
        byStage: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, status: { type: ['string', 'null'] }, count: { type: 'integer' } } },
        },
        activeHealth: {
          type: 'object',
          properties: { onTrack: { type: 'integer' }, atRisk: { type: 'integer' }, late: { type: 'integer' } },
        },
        onHold: {
          type: 'object',
          properties: { total: { type: 'integer' }, client: { type: 'integer' }, internal: { type: 'integer' } },
        },
        createdByMonth: { type: 'array', items: { type: 'integer' } },
        overAllocation: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: { id: { type: 'integer' }, title: { type: 'string' }, ownerName: { type: 'string' }, percent: { type: 'integer' } },
              },
            },
          },
        },
        hoursThisMonth: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            billable: { type: 'number' },
            internal: { type: 'number' },
            week: { type: 'array', items: { type: 'number' } },
          },
        },
      },
    },
  },
};

export const activitySchema = {
  tags,
  summary: 'Recent changes to a project (audit log)',
  params: idParams,
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          action: { type: 'string' },
          message: { type: ['string', 'null'] },
          changes: { type: ['object', 'null'], additionalProperties: true },
          userName: { type: ['string', 'null'] },
          loggedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

export const getProjectSchema = { tags, summary: 'Get a project', params: idParams, response: { 200: projectDetail } };

export const createProjectSchema = {
  tags,
  summary: 'Create a project (estimate and tasks are created from the project type)',
  body: {
    type: 'object',
    required: ['title', 'ownerId', 'projectDivisionId', 'projectTypeId', 'startDate'],
    additionalProperties: false,
    properties: {
      ...projectFields,
      isRetainerProject: { type: 'boolean', default: false },
      estimatedAmountCurrency: { ...projectFields.estimatedAmountCurrency, default: 'INR' },
    },
  },
  response: { 201: projectDetail },
};

export const updateProjectSchema = {
  tags,
  summary: 'Update a project',
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      ...projectFields,
      members: {
        type: 'array',
        description: 'Users tab – replaces the members; the owner always stays with edit access',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['userId', 'accessLevel'],
          properties: {
            userId: { type: 'integer', minimum: 1 },
            accessLevel: { type: 'string', enum: ACCESS_LEVELS },
            costPerHour: { type: ['number', 'null'], minimum: 0 },
          },
        },
      },
      estimates: {
        type: 'array',
        description: 'Estimate tab – % of effort per task group; rows above 0% must total 100',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['taskGroupId', 'effortPercentage'],
          properties: { taskGroupId: { type: 'integer', minimum: 1 }, effortPercentage: { type: 'number', minimum: 0, maximum: 100 } },
        },
      },
    },
  },
  response: { 200: projectDetail },
};

export const deleteProjectSchema = { tags, summary: 'Delete a project', params: idParams, response: { 204: { type: 'null' } } };

const review = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    stage: { type: ['string', 'null'] },
    reviewDate: { type: 'string' },
    comment: { type: 'string' },
    reviewerName: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    overall: { type: 'integer' },
    groups: {
      type: 'array',
      items: { type: 'object', properties: { taskGroupId: { type: 'integer' }, completionPercentage: { type: 'number' } } },
    },
  },
};

export const reviewsSchema = {
  tags,
  summary: 'Project reviews (Update tab), newest first',
  params: idParams,
  response: { 200: { type: 'array', items: review } },
};

export const addReviewSchema = {
  tags,
  summary: 'Add progress (stage, review date, % completed per task group) and/or a comment',
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    description: 'send the progress, a comment, or both; reviewDate defaults to today',
    properties: {
      stageId: { type: 'integer', minimum: 1 },
      reviewDate: { type: 'string', format: 'date' },
      comment: { type: 'string', maxLength: 5000 },
      completion: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['taskGroupId', 'completionPercentage'],
          properties: { taskGroupId: { type: 'integer', minimum: 1 }, completionPercentage: { type: 'number', minimum: 0, maximum: 100 } },
        },
      },
    },
  },
  response: { 201: { type: 'array', items: review } },
};
