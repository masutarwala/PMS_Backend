import { paginationQuerySchema, pagedResponseSchema } from '../../utils/query.js';

const tags = ['Roles & Permissions'];
const idParams = { type: 'object', required: ['id'], properties: { id: { type: 'integer', minimum: 1 } } };

const permission = {
  type: 'object',
  required: ['menuId'],
  additionalProperties: false,
  properties: {
    menuId: { type: 'integer', minimum: 1 },
    view: { type: 'boolean', default: false },
    create: { type: 'boolean', default: false },
    edit: { type: 'boolean', default: false },
    delete: { type: 'boolean', default: false },
    approve: { type: 'boolean', default: false },
    export: { type: 'boolean', default: false },
  },
};

const role = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    code: { type: 'string' },
    name: { type: 'string' },
    level: { type: 'integer' },
    roleType: { type: 'string' },
    dataScope: { type: 'string' },
    isSystem: { type: 'boolean' },
    isActive: { type: 'boolean' },
    userCount: { type: 'integer' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const roleWithPermissions = {
  ...role,
  properties: { ...role.properties, permissions: { type: 'array', items: permission } },
};

const roleBody = {
  type: 'object',
  required: ['name', 'level'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    code: { type: 'string', maxLength: 50 },
    level: { type: 'integer', minimum: 0, maximum: 99 },
    roleType: { type: 'string', enum: ['internal', 'external'], default: 'internal' },
    dataScope: { type: 'string', enum: ['all', 'team', 'own', 'customer', 'vendor'], default: 'own' },
    isActive: { type: 'boolean', default: true },
    permissions: { type: 'array', items: permission, default: [] },
  },
};

export const listRolesSchema = {
  tags,
  summary: 'List roles',
  querystring: {
    type: 'object',
    properties: {
      ...paginationQuerySchema,
      sortBy: { type: 'string', enum: ['name', 'level', 'code'], default: 'level' },
      roleType: { type: 'string', enum: ['internal', 'external'] },
      dataScope: { type: 'string', description: 'comma-separated: all,team,own,customer,vendor' },
      isActive: { type: 'boolean' },
    },
  },
  response: { 200: pagedResponseSchema(role) },
};

export const roleOptionsSchema = {
  tags,
  summary: 'Roles the current user may assign to users',
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          name: { type: 'string' },
          level: { type: 'integer' },
          roleType: { type: 'string' },
        },
      },
    },
  },
};

export const getRoleSchema = { tags, summary: 'Get a role with its permissions', params: idParams, response: { 200: roleWithPermissions } };
export const createRoleSchema = { tags, summary: 'Create a role', body: roleBody, response: { 201: roleWithPermissions } };
export const updateRoleSchema = { tags, summary: 'Update a role and its permissions', params: idParams, body: roleBody, response: { 200: roleWithPermissions } };
export const deleteRoleSchema = { tags, summary: 'Delete a role (not built-in, no users)', params: idParams, response: { 204: { type: 'null' } } };
