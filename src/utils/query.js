// Helpers for building list queries safely (values are always parameterised).

export const paginationQuerySchema = {
  page: { type: 'integer', minimum: 1, default: 1 },
  pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
  search: { type: 'string', maxLength: 200 },
  sortDir: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
};

export function pagedResponseSchema(itemSchema) {
  return {
    type: 'object',
    properties: {
      items: { type: 'array', items: itemSchema },
      total: { type: 'integer' },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
    },
  };
}

/** Collects WHERE conditions and their parameters: where.add('x = $?', value). */
export class WhereBuilder {
  constructor() {
    this.parts = [];
    this.params = [];
  }

  /** `$?` placeholders in `sql` are numbered in order of the values given. */
  add(sql, ...values) {
    let out = sql;
    for (const v of values) {
      this.params.push(v);
      const placeholder = `$${this.params.length}`;
      out = out.replace('$?', () => placeholder);
    }
    this.parts.push(out);
    return this;
  }

  /** Adds the param and returns its placeholder, for use outside WHERE (e.g. LIMIT). */
  param(value) {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  toSql() {
    return this.parts.length ? `WHERE ${this.parts.join(' AND ')}` : '';
  }
}

/** Splits a comma-separated query value into an array of positive integers. */
export function idList(value) {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
