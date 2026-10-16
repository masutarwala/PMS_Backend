import envSchema from 'env-schema';

// All configuration comes from environment variables (.env in development).
// The app refuses to start when a required value is missing or invalid.
const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'COOKIE_SECRET'],
  properties: {
    NODE_ENV: { type: 'string', enum: ['development', 'test', 'production'], default: 'development' },
    HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', default: 4000 },
    LOG_LEVEL: { type: 'string', default: 'info' },

    DATABASE_URL: { type: 'string' },
    DB_POOL_MAX: { type: 'integer', default: 10 },
    DB_SSL: { type: 'boolean', default: false },

    JWT_ACCESS_SECRET: { type: 'string', minLength: 32 },
    JWT_ACCESS_TTL: { type: 'string', default: '15m' },
    REFRESH_TTL_DAYS: { type: 'integer', default: 1 },            // "Keep me signed in" off
    REFRESH_TTL_REMEMBER_DAYS: { type: 'integer', default: 30 },  // "Keep me signed in" on
    COOKIE_SECRET: { type: 'string', minLength: 32 },

    CORS_ORIGINS: { type: 'string', default: 'http://localhost:5173' },
    MAX_FAILED_LOGINS: { type: 'integer', default: 5 },
    BCRYPT_ROUNDS: { type: 'integer', default: 12 },
  },
};

const raw = envSchema({ schema });

export const config = Object.freeze({
  env: raw.NODE_ENV,
  isProd: raw.NODE_ENV === 'production',
  host: raw.HOST,
  port: raw.PORT,
  logLevel: raw.LOG_LEVEL,
  db: {
    connectionString: raw.DATABASE_URL,
    max: raw.DB_POOL_MAX,
    ssl: raw.DB_SSL ? { rejectUnauthorized: false } : undefined,
  },
  auth: {
    accessSecret: raw.JWT_ACCESS_SECRET,
    accessTtl: raw.JWT_ACCESS_TTL,
    refreshTtlDays: raw.REFRESH_TTL_DAYS,
    refreshTtlRememberDays: raw.REFRESH_TTL_REMEMBER_DAYS,
    cookieSecret: raw.COOKIE_SECRET,
    maxFailedLogins: raw.MAX_FAILED_LOGINS,
    bcryptRounds: raw.BCRYPT_ROUNDS,
  },
  corsOrigins: raw.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
});
