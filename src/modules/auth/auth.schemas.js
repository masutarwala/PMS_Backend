import { PASSWORD_PATTERN } from '../../utils/crypto.js';

const permissionFlags = {
  type: 'object',
  properties: {
    view: { type: 'boolean' },
    create: { type: 'boolean' },
    edit: { type: 'boolean' },
    delete: { type: 'boolean' },
    approve: { type: 'boolean' },
    export: { type: 'boolean' },
  },
};

const menuItem = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    url: { type: ['string', 'null'] },
    icon: { type: ['string', 'null'] },
    displayOrder: { type: 'integer' },
  },
};

export const sessionInfo = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        username: { type: 'string' },
        email: { type: ['string', 'null'] },
        empCode: { type: ['string', 'null'] },
        isSuperAdmin: { type: 'boolean' },
        role: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            code: { type: 'string' },
            name: { type: 'string' },
            level: { type: 'integer' },
            dataScope: { type: 'string' },
            roleType: { type: 'string' },
          },
        },
      },
    },
    permissions: { type: 'object', additionalProperties: permissionFlags },
    menus: {
      type: 'array',
      items: { ...menuItem, properties: { ...menuItem.properties, children: { type: 'array', items: menuItem } } },
    },
  },
};

export const loginSchema = {
  tags: ['Auth'],
  summary: 'Sign in with username (or email) and password',
  security: [],
  body: {
    type: 'object',
    required: ['username', 'password'],
    additionalProperties: false,
    properties: {
      username: { type: 'string', minLength: 1, maxLength: 150 },
      password: { type: 'string', minLength: 1, maxLength: 128 },
      rememberMe: { type: 'boolean', default: false },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: { accessToken: { type: 'string' }, ...sessionInfo.properties },
    },
  },
};

export const refreshSchema = {
  tags: ['Auth'],
  summary: 'Get a new access token using the refresh-token cookie',
  security: [],
  response: {
    200: {
      type: 'object',
      properties: { accessToken: { type: 'string' }, ...sessionInfo.properties },
    },
  },
};

export const logoutSchema = {
  tags: ['Auth'],
  summary: 'Sign out (revokes the refresh token)',
  security: [],
  response: { 204: { type: 'null' } },
};

export const meSchema = {
  tags: ['Auth'],
  summary: 'Current user, permissions and sidebar menus',
  response: { 200: sessionInfo },
};

export const changePasswordSchema = {
  tags: ['Auth'],
  summary: 'Change own password',
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    additionalProperties: false,
    properties: {
      currentPassword: { type: 'string', minLength: 1, maxLength: 128 },
      newPassword: { type: 'string', pattern: PASSWORD_PATTERN },
    },
  },
  response: { 204: { type: 'null' } },
};
