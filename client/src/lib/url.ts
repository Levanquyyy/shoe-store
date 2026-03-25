/**
 * URL utility functions for parsing query parameters.
 */

/**
 * Parse the `category` query parameter from a URL search string.
 *
 * Returns a positive integer category ID, or `undefined` if:
 *  - the parameter is absent
 *  - the value is not a valid integer
 *  - the value is zero or negative (not a valid DB primary key)
 *
 * @param search - The query string portion of a URL (e.g. window.location.search).
 *                 May include or omit the leading "?".
 */
export function parseCategoryIdFromSearch(search: string): number | undefined {
  const normalized = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(normalized);
  const raw = params.get("category");
  if (!raw) return undefined;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
}
