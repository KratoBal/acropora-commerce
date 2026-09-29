/**
 * THE PICKUP-POINT SEARCH, shared by the Foxpost and the GLS directory (P4),
 * so the two pickers answer the same way (Balázs, 2026-09-29: the two should
 * look and behave as alike as possible).
 */
export type SearchablePickupPoint = {
  zip: string;
  name: string;
  city: string;
  address: string;
};

export const DEFAULT_PICKUP_POINT_SEARCH_LIMIT = 20;
export const MAX_PICKUP_POINT_SEARCH_LIMIT = 50;

// Case and accents do not matter: "godollo" finds "Gödöllő".
const normalized = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * A pickup point matches a search when:
 * - the search is 1 to 4 digits and the postcode starts with it, or
 * - every word of the search occurs in its name, city or address.
 */
export const matchesPickupPointSearch = (
  point: SearchablePickupPoint,
  query: string,
): boolean => {
  const trimmed = query.trim();

  if (/^\d{1,4}$/.test(trimmed)) {
    return point.zip.startsWith(trimmed);
  }

  const haystack = normalized(`${point.name} ${point.city} ${point.address}`);

  return normalized(trimmed)
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .every((word) => haystack.includes(word));
};

/**
 * At most `limit` matching points (never more than 50), ordered by postcode
 * and name, plus the count of every match.
 */
export const searchPickupPoints = <T extends SearchablePickupPoint>(
  points: readonly T[],
  query: string,
  limit: number = DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
): { pickup_points: T[]; count: number } => {
  const matches = points
    .filter((point) => matchesPickupPointSearch(point, query))
    .sort((a, b) => a.zip.localeCompare(b.zip) || a.name.localeCompare(b.name, "hu"));

  return {
    pickup_points: matches.slice(0, Math.min(Math.max(limit, 1), MAX_PICKUP_POINT_SEARCH_LIMIT)),
    count: matches.length,
  };
};
