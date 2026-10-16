import { config } from '../../config/env.js';
import { generateToken, hashPassword, sha256, verifyPassword } from '../../utils/crypto.js';
import { AppError, badRequest, unauthorized } from '../../utils/errors.js';
import { getUserMenus, getUserPermissions } from '../menus/menus.service.js';
import { loadAuthContext } from './auth-context.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Compared against when the username does not exist, so response time does not reveal it.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await hashPassword(generateToken(16)));

// The refresh token carries its "keep me signed in" choice in a prefix ("r." / "s.").
// The prefix is part of the hashed value, so it cannot be changed by the client.
function newRefreshToken(remember) {
  return `${remember ? 'r' : 's'}.${generateToken()}`;
}
export const isRememberToken = (token) => token.startsWith('r.');

async function storeRefreshToken(db, userId, token, expiresAt) {
  await db.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`, [
    userId,
    sha256(token),
    expiresAt,
  ]);
}

/**
 * Checks the credentials and returns the user id. Locks the account after
 * MAX_FAILED_LOGINS wrong passwords (an admin unlocks it by resetting the password).
 */
export async function verifyCredentials(db, login, password) {
  const { rows } = await db.query(
    `SELECT u.id, u.password_hash, u.is_active, u.failed_login_attempts, r.is_active AS role_active
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE lower(u.username) = lower($1) OR lower(u.email) = lower($1)
      ORDER BY (lower(u.username) = lower($1)) DESC
      LIMIT 1`,
    [login],
  );
  const user = rows[0];
  if (!user) {
    await verifyPassword(password, await getDummyHash());
    throw unauthorized('Invalid username or password');
  }
  if (user.failed_login_attempts >= config.auth.maxFailedLogins) {
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Your account is locked after too many failed attempts. Contact your administrator.');
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await db.query(`UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1`, [user.id]);
    throw unauthorized('Invalid username or password');
  }
  if (!user.is_active || !user.role_active) {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'Your account is inactive. Contact your administrator.');
  }

  await db.query(`UPDATE users SET failed_login_attempts = 0, last_login_at = now() WHERE id = $1`, [user.id]);
  return user.id;
}

/** Issues a new refresh token for a fresh login. */
export async function createSession(db, userId, remember) {
  const days = remember ? config.auth.refreshTtlRememberDays : config.auth.refreshTtlDays;
  const expiresAt = new Date(Date.now() + days * DAY_MS);
  const refreshToken = newRefreshToken(remember);
  await storeRefreshToken(db, userId, refreshToken, expiresAt);
  return { refreshToken, expiresAt };
}

/**
 * Refresh-token rotation: the presented token is revoked and replaced by a new one
 * with the same absolute expiry. Presenting an already revoked token revokes every
 * session of that user (the token was probably stolen).
 */
export async function rotateSession(db, presentedToken) {
  const expired = () => unauthorized('Your session has expired. Please sign in again.');
  const result = await db.tx(async (client) => {
    const { rows } = await client.query(
      `SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
      [sha256(presentedToken)],
    );
    const row = rows[0];
    if (!row || row.expires_at <= new Date()) throw expired();
    if (row.revoked_at) return { reusedBy: row.user_id };

    await client.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [row.id]);
    const refreshToken = newRefreshToken(isRememberToken(presentedToken));
    await storeRefreshToken(client, row.user_id, refreshToken, row.expires_at);
    return { userId: row.user_id, refreshToken, expiresAt: row.expires_at };
  });

  if (result.reusedBy) {
    // Revoked outside the transaction above so the revocation is not rolled back with the error.
    await db.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [
      result.reusedBy,
    ]);
    throw expired();
  }
  return result;
}

export async function revokeSession(db, token) {
  await db.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, [
    sha256(token),
  ]);
}

/** Profile + role + permissions + sidebar menus for the signed-in user. */
export async function getSessionInfo(db, userIdOrAuth) {
  const auth = typeof userIdOrAuth === 'object' ? userIdOrAuth : await loadAuthContext(db, userIdOrAuth);
  if (!auth || !auth.isActive) throw unauthorized('Your account is inactive');
  const [menus, permissions] = await Promise.all([getUserMenus(db, auth), getUserPermissions(db, auth)]);
  return {
    user: {
      id: auth.userId,
      name: auth.name,
      username: auth.username,
      email: auth.email,
      empCode: auth.empCode,
      role: auth.role,
      isSuperAdmin: auth.isSuperAdmin,
    },
    permissions,
    menus,
  };
}

/** Changes the password and signs out every other session of the user. */
export async function changePassword(db, userId, currentPassword, newPassword, keepToken) {
  const { rows } = await db.query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
    throw badRequest('Current password is incorrect', [{ field: 'currentPassword', message: 'is incorrect' }]);
  }
  if (currentPassword === newPassword) {
    throw badRequest('New password must be different from the current password', [
      { field: 'newPassword', message: 'must be different from the current password' },
    ]);
  }
  const hash = await hashPassword(newPassword);
  await db.tx(async (client) => {
    await client.query(`UPDATE users SET password_hash = $1, updated_by = $2 WHERE id = $2`, [hash, userId]);
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL AND token_hash IS DISTINCT FROM $2`,
      [userId, keepToken ? sha256(keepToken) : null],
    );
  });
}
