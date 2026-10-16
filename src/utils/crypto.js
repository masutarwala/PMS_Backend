import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

export const hashPassword = (plain) => bcrypt.hash(plain, config.auth.bcryptRounds);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Refresh tokens are random opaque strings; only their SHA-256 hash is stored.
export const generateToken = (bytes = 48) => randomBytes(bytes).toString('base64url');
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// No strength rules: any non-empty password up to 128 characters.
export const PASSWORD_PATTERN = '^.{1,128}$';
export const PASSWORD_RULE_TEXT = 'Enter a password (up to 128 characters)';
