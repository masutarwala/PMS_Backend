/**
 * Writes one row to audit_logs. Pass the transaction client when inside db.tx().
 * @param {{query: Function}} db
 */
export function writeAudit(db, { entity, entityId, action, userId, message = null, changes = null }) {
  return db.query(
    `INSERT INTO audit_logs (entity, entity_id, action, message, changes, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entity, entityId, action, message, changes ? JSON.stringify(changes) : null, userId ?? null],
  );
}

/** Returns {field: {old, new}} for the keys whose value changed. */
export function diff(before, after, keys) {
  const out = {};
  for (const k of keys) {
    const a = before?.[k] ?? null;
    const b = after?.[k] ?? null;
    if (String(a) !== String(b)) out[k] = { old: a, new: b };
  }
  return Object.keys(out).length ? out : null;
}
