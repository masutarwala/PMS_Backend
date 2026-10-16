import { SCREENS } from '../../config/menus.js';
import { getMenuTree } from './menus.service.js';

const menuItem = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    url: { type: ['string', 'null'] },
    icon: { type: ['string', 'null'] },
    displayOrder: { type: 'integer' },
    actions: { type: 'array', items: { type: 'string' } },
  },
};

export default async function menusRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  // Full menu tree – rows of the permission matrix on the Roles screen.
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Roles & Permissions'],
        summary: 'All menus (modules with their screens)',
        response: {
          200: {
            type: 'array',
            items: { ...menuItem, properties: { ...menuItem.properties, children: { type: 'array', items: menuItem } } },
          },
        },
      },
      preHandler: fastify.authorize(SCREENS.ROLES, 'view'),
    },
    () => getMenuTree(fastify.db),
  );
}
