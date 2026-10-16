import { SCREENS } from '../../config/menus.js';
import { badRequest } from '../../utils/errors.js';
import * as service from './timesheets.service.js';
import * as schemas from './timesheets.schemas.js';

/** Time can't be logged for a future day. "Today" is taken at UTC+14 so every user time zone's today is allowed. */
function notInFuture(req) {
  const d = req.body?.workDate;
  const latestToday = new Date(Date.now() + 14 * 3600 * 1000).toISOString().slice(0, 10);
  if (d && d > latestToday) {
    throw badRequest('You cannot log time for a future date', [{ field: 'workDate', message: 'is in the future' }]);
  }
}

export default async function timesheetsRoutes(fastify) {
  const { db, authorize } = fastify;
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', { schema: schemas.listSchema, preHandler: authorize(SCREENS.TIMESHEET, 'view') }, (req) =>
    service.listTimesheets(db, req.auth, req.query),
  );

  fastify.get('/summary', { schema: schemas.summarySchema, preHandler: authorize(SCREENS.TIMESHEET, 'view') }, (req) =>
    service.timesheetSummary(db, req.auth, req.query),
  );

  fastify.get('/options', { schema: schemas.optionsSchema, preHandler: authorize(SCREENS.TIMESHEET, 'view') }, (req) =>
    service.timesheetOptions(db, req.auth),
  );

  fastify.get('/projects', { schema: schemas.filterProjectsSchema, preHandler: authorize(SCREENS.TIMESHEET, 'view') }, (req) =>
    service.filterProjects(db, req.auth),
  );

  fastify.get('/:id', { schema: schemas.getSchema, preHandler: authorize(SCREENS.TIMESHEET, 'view') }, (req) =>
    service.getTimesheet(db, req.auth, req.params.id),
  );

  fastify.post('/', { schema: schemas.createSchema, preHandler: authorize(SCREENS.TIMESHEET, 'create') }, async (req, reply) => {
    notInFuture(req);
    return reply.status(201).send(await service.createTimesheet(db, req.auth, req.body));
  });

  fastify.put('/:id', { schema: schemas.updateSchema, preHandler: authorize(SCREENS.TIMESHEET, 'edit') }, (req) => {
    notInFuture(req);
    return service.updateTimesheet(db, req.auth, req.params.id, req.body);
  });

  fastify.delete('/:id', { schema: schemas.deleteSchema, preHandler: authorize(SCREENS.TIMESHEET, 'delete') }, async (req, reply) => {
    await service.deleteTimesheet(db, req.auth, req.params.id);
    return reply.status(204).send();
  });
}
