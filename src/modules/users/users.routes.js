import { config } from '../../config/env.js';
import { SCREENS } from '../../config/menus.js';
import * as service from './users.service.js';
import * as schemas from './users.schemas.js';

export default async function usersRoutes(fastify) {
  const { db, authorize } = fastify;
  const maxFailed = config.auth.maxFailedLogins;
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', { schema: schemas.listUsersSchema, preHandler: authorize(SCREENS.USERS, 'view') }, (req) =>
    service.listUsers(db, req.query, maxFailed),
  );

  fastify.get('/summary', { schema: schemas.userSummarySchema, preHandler: authorize(SCREENS.USERS, 'view') }, () =>
    service.userSummary(db),
  );

  fastify.get('/:id', { schema: schemas.getUserSchema, preHandler: authorize(SCREENS.USERS, 'view') }, (req) =>
    service.getUser(db, req.params.id, maxFailed),
  );

  fastify.post(
    '/',
    { schema: schemas.createUserSchema, preHandler: authorize(SCREENS.USERS, 'create') },
    async (req, reply) => reply.status(201).send(await service.createUser(db, req.auth, req.body, maxFailed)),
  );

  fastify.put('/:id', { schema: schemas.updateUserSchema, preHandler: authorize(SCREENS.USERS, 'edit') }, (req) =>
    service.updateUser(db, req.auth, req.params.id, req.body, maxFailed),
  );

  fastify.post(
    '/:id/unlock',
    { schema: schemas.unlockUserSchema, preHandler: authorize(SCREENS.USERS, 'edit') },
    async (req, reply) => {
      await service.unlockUser(db, req.auth, req.params.id);
      return reply.status(204).send();
    },
  );

  fastify.delete(
    '/:id',
    { schema: schemas.deleteUserSchema, preHandler: authorize(SCREENS.USERS, 'delete') },
    async (req, reply) => {
      await service.deleteUser(db, req.auth, req.params.id);
      return reply.status(204).send();
    },
  );
}
