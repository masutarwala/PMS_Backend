import { SCREENS } from '../../config/menus.js';
import * as service from './roles.service.js';
import * as schemas from './roles.schemas.js';

export default async function rolesRoutes(fastify) {
  const { db, authorize } = fastify;
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', { schema: schemas.listRolesSchema, preHandler: authorize(SCREENS.ROLES, 'view') }, (req) =>
    service.listRoles(db, req.query),
  );

  // Used by the user form; needs user create or edit rights rather than role rights.
  fastify.get(
    '/options',
    {
      schema: schemas.roleOptionsSchema,
      preHandler: fastify.authorizeAny([
        [SCREENS.USERS, 'create'],
        [SCREENS.USERS, 'edit'],
        [SCREENS.USERS, 'view'],
      ]),
    },
    (req) => service.listAssignableRoles(db, req.auth),
  );

  fastify.get('/:id', { schema: schemas.getRoleSchema, preHandler: authorize(SCREENS.ROLES, 'view') }, (req) =>
    service.getRole(db, req.params.id),
  );

  fastify.post(
    '/',
    { schema: schemas.createRoleSchema, preHandler: authorize(SCREENS.ROLES, 'create') },
    async (req, reply) => reply.status(201).send(await service.createRole(db, req.auth, req.body)),
  );

  fastify.put('/:id', { schema: schemas.updateRoleSchema, preHandler: authorize(SCREENS.ROLES, 'edit') }, (req) =>
    service.updateRole(db, req.auth, req.params.id, req.body),
  );

  fastify.delete(
    '/:id',
    { schema: schemas.deleteRoleSchema, preHandler: authorize(SCREENS.ROLES, 'delete') },
    async (req, reply) => {
      await service.deleteRole(db, req.auth, req.params.id);
      return reply.status(204).send();
    },
  );
}
