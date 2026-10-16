import { PASSWORD_PATTERN } from '../../utils/crypto.js';
import { paginationQuerySchema, pagedResponseSchema } from '../../utils/query.js';

const tags = ['Users'];
const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } };
const optId = { type: ['integer', 'null'], minimum: 1 };
const optStr = (max) => ({ type: ['string', 'null'], maxLength: max });

const user = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    empCode: { type: ['string', 'null'] },
    username: { type: 'string' },
    name: { type: 'string' },
    email: { type: ['string', 'null'] },
    dob: { type: ['string', 'null'] },
    roleId: { type: 'integer' },
    roleName: { type: 'string' },
    roleLevel: { type: 'integer' },
    userTypeId: { type: ['integer', 'null'] },
    userTypeName: { type: ['string', 'null'] },
    reportsTo: { type: ['integer', 'null'] },
    reportsToName: { type: ['string', 'null'] },
    reviewedBy: { type: ['integer', 'null'] },
    reviewedByName: { type: ['string', 'null'] },
    siteId: { type: ['integer', 'null'] },
    siteName: { type: ['string', 'null'] },
    shiftId: { type: ['integer', 'null'] },
    shiftName: { type: ['string', 'null'] },
    resourceGradeId: { type: ['integer', 'null'] },
    timeZone: { type: 'string' },
    hourlyRate: { type: ['number', 'null'] },
    hourlyRateCurrency: { type: ['string', 'null'] },
    customerId: { type: ['integer', 'null'] },
    customerName: { type: ['string', 'null'] },
    vendorId: { type: ['integer', 'null'] },
    isActive: { type: 'boolean' },
    isOnLeave: { type: 'boolean' },
    isLocked: { type: 'boolean' },
    failedLoginAttempts: { type: 'integer' },
    lastLoginAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const userFields = {
  name: { type: 'string', minLength: 1, maxLength: 150 },
  empCode: optStr(30),
  email: { anyOf: [{ type: 'string', format: 'email', maxLength: 150 }, { type: 'string', maxLength: 0 }, { type: 'null' }] },
  dob: { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] },
  username: { type: 'string', minLength: 3, maxLength: 100, pattern: '^[A-Za-z0-9._@-]+$' },
  roleId: { type: 'integer', minimum: 1 },
  userTypeId: optId,
  isActive: { type: 'boolean' },
  reportsTo: optId,
  reviewedBy: optId,
  siteId: optId,
  shiftId: optId,
  resourceGradeId: optId,
  timeZone: { type: 'string', minLength: 1, maxLength: 50 },
  isOnLeave: { type: 'boolean' },
  hourlyRate: { type: ['number', 'null'], minimum: 0 },
  hourlyRateCurrency: { anyOf: [{ type: 'string', pattern: '^[A-Z]{3}$' }, { type: 'null' }] },
  customerId: optId,
  vendorId: optId,
};

export const listUsersSchema = {
  tags,
  summary: 'List users',
  querystring: {
    type: 'object',
    properties: {
      ...paginationQuerySchema,
      sortBy: { type: 'string', enum: ['name', 'empCode', 'username', 'lastLoginAt'], default: 'name' },
      roleId: { type: 'string', description: 'comma-separated role ids' },
      siteId: { type: 'string', description: 'comma-separated site ids' },
      shiftId: { type: 'string', description: 'comma-separated shift ids' },
      reportsTo: { type: 'string', description: 'comma-separated user ids' },
      userTypeId: { type: 'string', description: 'comma-separated lookup ids' },
      isActive: { type: 'boolean' },
      isOnLeave: { type: 'boolean' },
    },
  },
  response: { 200: pagedResponseSchema(user) },
};

export const getUserSchema = { tags, summary: 'Get a user', params: idParams, response: { 200: user } };

export const createUserSchema = {
  tags,
  summary: 'Create a user',
  body: {
    type: 'object',
    required: ['name', 'username', 'roleId', 'password'],
    additionalProperties: false,
    properties: {
      ...userFields,
      isActive: { type: 'boolean', default: true },
      timeZone: { ...userFields.timeZone, default: 'Asia/Kolkata' },
      password: { type: 'string', pattern: PASSWORD_PATTERN },
    },
  },
  response: { 201: user },
};

export const updateUserSchema = {
  tags,
  summary: 'Update a user (send password to reset it)',
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: { ...userFields, password: { type: 'string', pattern: PASSWORD_PATTERN } },
  },
  response: { 200: user },
};

export const unlockUserSchema = { tags, summary: 'Unlock a user locked by failed logins', params: idParams, response: { 204: { type: 'null' } } };
export const deleteUserSchema = { tags, summary: 'Delete a user (only when not linked to other records)', params: idParams, response: { 204: { type: 'null' } } };

export const userSummarySchema = {
  tags,
  summary: 'Users list summary cards',
  response: {
    200: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        createdThisMonth: { type: 'integer' },
        internal: { type: 'integer' },
        external: { type: 'integer' },
        active: { type: 'integer' },
        inactive: { type: 'integer' },
        totalByMonth: { type: 'array', items: { type: 'integer' } },
        onLeave: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            people: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } },
          },
        },
        externalLogins: { type: 'object', properties: { customer: { type: 'integer' }, vendor: { type: 'integer' } } },
      },
    },
  },
};
