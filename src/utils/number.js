/**
 * Exact decimal for calculations: only trims floating-point noise (0.1 + 0.2 → 0.3),
 * it does not round values to whole numbers or to one decimal.
 */
export const exact = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? n : Math.round(Number(n) * 1e6) / 1e6);
