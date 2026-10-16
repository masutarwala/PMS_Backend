# emQube PMS – Backend (API)

Fastify 5 REST API on PostgreSQL. Phase 1 scope: **login + RBAC** (users, roles & permissions) and **project creation**.

## Requirements

- Node.js **22.12+** (tested on 24.15 — `nvm use 24.15.0`)
- PostgreSQL 14+ (tested on 18)

## Setup

```bash
npm install
cp .env.example .env        # then set DATABASE_URL, JWT_ACCESS_SECRET, COOKIE_SECRET
npm run db:setup            # create database → run migrations → seed
npm run dev                 # http://localhost:4000  ·  API docs: http://localhost:4000/docs
```

The seed creates a Super Admin: **admin / Admin@123** (override with `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`). Change the password after the first login.

| Script | What it does |
|---|---|
| `npm run dev` | Start with file watching |
| `npm start` | Start (production) |
| `npm run db:create` | Create the database in `DATABASE_URL` if missing |
| `npm run db:migrate` | Apply new files in `src/db/migrations` (tracked in `schema_migrations`) |
| `npm run db:seed` | Roles, menus, permissions, admin user, masters (idempotent) |

## Structure

```
src/
├── server.js                 entry: listen + graceful shutdown
├── app.js                    builds the Fastify app: plugins → modules under /api/v1
├── config/
│   ├── env.js                validated environment config (env-schema)
│   └── menus.js              RBAC screen keys (= menus.url) and actions
├── plugins/                  cross-cutting middleware
│   ├── db.js                 pg Pool → fastify.db.query() / fastify.db.tx()
│   ├── auth.js               JWT + cookies; fastify.authenticate / authorize / authorizeAny
│   ├── security.js           helmet, CORS, global rate limit
│   ├── error-handler.js      one error format; maps PG constraint errors to 400/409
│   └── swagger.js            OpenAPI docs at /docs
├── modules/<feature>/        one folder per feature
│   ├── *.routes.js           routes + guards (thin)
│   ├── *.schemas.js          JSON-schema validation and response serialisation
│   └── *.service.js          business rules and SQL
├── utils/                    errors, crypto, query builder, audit log
└── db/migrations/001_initial_schema.sql   = git2/PMS_schema.sql (full 67-table ERD)
scripts/                      create-db, migrate, seed
```

## Auth & RBAC

- **Login** `POST /api/v1/auth/login` → short-lived access token (JWT, 15 min, sent as `Authorization: Bearer`) + refresh token in an **httpOnly cookie** (`SameSite=Strict`, path `/api/v1/auth`). “Keep me signed in” → 30-day persistent cookie, otherwise 1 day / browser session.
- **Refresh rotation** `POST /auth/refresh`: every refresh revokes the old token. Re-using a revoked token revokes all of that user's sessions.
- **Lockout**: 5 wrong passwords lock the account (`423`). An admin unlocks it (`POST /users/:id/unlock`) or resets the password.
- **Permissions** come from `role_permissions` per screen (`menus.url`): `view / create / edit / delete / approve / export`. Routes use `preHandler: fastify.authorize(SCREENS.PROJECTS, 'create')`. Role level 0 (Super Admin) can do everything.
- **Level rule**: a user can only create/edit/delete roles — and assign roles to users — whose level is **higher** than their own, and cannot grant an action they don't have.
- **Data scope** (projects): `all` · `team` (shares a team via `user_teams`) · `own` (owner or member) · `customer` (user's customer) · `vendor` (as own).
- `GET /auth/me` returns the user, permission map and the **sidebar menu tree filtered to what the role can view**.

## Endpoints (v1)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/change-password` |
| Users | `GET /users` · `GET /users/:id` · `POST /users` · `PUT /users/:id` (send `password` to reset) · `POST /users/:id/unlock` · `DELETE /users/:id` |
| Roles | `GET /roles` · `GET /roles/options` · `GET /roles/:id` · `POST /roles` · `PUT /roles/:id` · `DELETE /roles/:id` · `GET /menus` |
| Projects | `GET /projects` (search, filters, tabs all/mine/owned, sort, paging) · `GET /projects/summary` · `GET /projects/:id` · `POST /projects` · `PUT /projects/:id` · `DELETE /projects/:id` |
| Masters (dropdowns) | `GET /masters/{customers,users,project-divisions,project-types,sites,shifts,currencies}` · `GET /masters/lookups/:type` |

**Creating a project** generates the code (`PRJ-1001`, …), copies the project type's default effort % into `project_task_group_estimates`, creates the type's template tasks, and adds the owner as a project member — all in one transaction, written to `audit_logs`.

Errors always look like `{ statusCode, code, message, details? }`; `details` lists field errors for `400 VALIDATION_ERROR`.

## Adding a new screen later

1. Add a migration if the schema changes (`src/db/migrations/002_….sql`).
2. Add the menu row (and default permissions) to `scripts/seed.js`, and its key to `src/config/menus.js`.
3. Create `src/modules/<feature>/` (routes, schemas, service) and register it in `src/app.js`.
