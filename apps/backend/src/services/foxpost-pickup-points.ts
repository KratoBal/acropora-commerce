const FOXPOST_PICKUP_POINTS_URL = "https://cdn.foxpost.hu/foxplus.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type FoxpostSourcePoint = {
  operator_id: string;
  name: string;
  address: string;
  open: Record<string, string>;
  geolat: number;
  geolng: number;
  // Every point carried both on 2026-09-29 (5006 of 5006); they are read when
  // present and never required, so a point without them is not dropped.
  zip?: unknown;
  city?: unknown;
};

type FoxpostFetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

export type FoxpostFetch = (url: string) => Promise<FoxpostFetchResponse>;

export type FoxpostPickupPoint = {
  id: string;
  name: string;
  address: string;
  zip: string;
  city: string;
  opening_hours: Record<string, string>;
  latitude: number;
  longitude: number;
};

export const DEFAULT_PICKUP_POINT_SEARCH_LIMIT = 20;
export const MAX_PICKUP_POINT_SEARCH_LIMIT = 50;

export type FoxpostPickupPointSearch =
  | {
      available: true;
      pickup_points: FoxpostPickupPoint[];
      count: number;
    }
  | {
      available: false;
      reason: "missing_configuration" | "service_unavailable";
    };

export type FoxpostAvailability =
  | {
      available: true;
      pickup_points: FoxpostPickupPoint[];
    }
  | {
      available: false;
      reason: "missing_configuration" | "service_unavailable";
    };

type FoxpostPickupPointsDependencies = {
  env?: NodeJS.ProcessEnv;
  fetcher?: FoxpostFetch;
  now?: () => number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === "string");
};

const isFoxpostSourcePoint = (value: unknown): value is FoxpostSourcePoint => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.operator_id === "string" &&
    typeof value.name === "string" &&
    typeof value.address === "string" &&
    isStringRecord(value.open) &&
    typeof value.geolat === "number" &&
    Number.isFinite(value.geolat) &&
    typeof value.geolng === "number" &&
    Number.isFinite(value.geolng)
  );
};

const toPickupPoint = (point: FoxpostSourcePoint): FoxpostPickupPoint => ({
  id: point.operator_id,
  name: point.name,
  address: point.address,
  zip: typeof point.zip === "string" ? point.zip.trim() : "",
  city: typeof point.city === "string" ? point.city.trim() : "",
  opening_hours: point.open,
  latitude: point.geolat,
  longitude: point.geolng,
});

// Case and accents do not matter: "godollo" finds "Gödöllő".
const normalized = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * A pickup point matches a search when:
 * - the search is 1 to 4 digits and the postcode starts with it, or
 * - every word of the search occurs in its name, city or address.
 */
export const matchesPickupPointSearch = (
  point: FoxpostPickupPoint,
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
 * Foxpost publishes its locker directory at a CDN endpoint. The Web API
 * credentials are still required: an unconfigured carrier must never appear
 * as a selectable delivery method, even though the directory itself is public.
 */
export class FoxpostPickupPointsService {
  private readonly env: NodeJS.ProcessEnv;
  private readonly fetcher: FoxpostFetch;
  private readonly now: () => number;
  private cache: {
    expiresAt: number;
    pickupPoints: FoxpostPickupPoint[];
  } | null = null;

  constructor({
    env = process.env,
    fetcher = fetch,
    now = Date.now,
  }: FoxpostPickupPointsDependencies = {}) {
    this.env = env;
    this.fetcher = fetcher;
    this.now = now;
  }

  async getAvailability(): Promise<FoxpostAvailability> {
    if (!this.isConfigured()) {
      return { available: false, reason: "missing_configuration" };
    }

    const cached = this.getCachedPickupPoints();

    if (cached) {
      return { available: true, pickup_points: cached };
    }

    try {
      const response = await this.fetcher(FOXPOST_PICKUP_POINTS_URL);

      if (!response.ok) {
        return { available: false, reason: "service_unavailable" };
      }

      const payload: unknown = await response.json();

      if (!Array.isArray(payload)) {
        return { available: false, reason: "service_unavailable" };
      }

      const pickupPoints = payload
        .filter(isFoxpostSourcePoint)
        .map(toPickupPoint);

      if (pickupPoints.length === 0) {
        return { available: false, reason: "service_unavailable" };
      }

      this.cache = {
        expiresAt: this.now() + CACHE_TTL_MS,
        pickupPoints,
      };

      return { available: true, pickup_points: pickupPoints };
    } catch {
      return { available: false, reason: "service_unavailable" };
    }
  }

  /**
   * The directory has about 5000 points (1.6 MB as JSON on 2026-09-29), too
   * much to send to a browser for a picker. A search answers with at most
   * `limit` points, ordered by postcode and name, plus the full match count.
   */
  async searchPickupPoints({
    query,
    limit = DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
  }: {
    query: string;
    limit?: number;
  }): Promise<FoxpostPickupPointSearch> {
    const availability = await this.getAvailability();

    if (!availability.available) {
      return availability;
    }

    const matches = availability.pickup_points
      .filter((point) => matchesPickupPointSearch(point, query))
      .sort(
        (a, b) =>
          a.zip.localeCompare(b.zip) || a.name.localeCompare(b.name, "hu"),
      );

    return {
      available: true,
      pickup_points: matches.slice(
        0,
        Math.min(Math.max(limit, 1), MAX_PICKUP_POINT_SEARCH_LIMIT),
      ),
      count: matches.length,
    };
  }

  async findPickupPoint(id: string): Promise<FoxpostPickupPoint | null> {
    const availability = await this.getAvailability();

    if (!availability.available) {
      return null;
    }

    return (
      availability.pickup_points.find((pickupPoint) => pickupPoint.id === id) ??
      null
    );
  }

  private getCachedPickupPoints(): FoxpostPickupPoint[] | null {
    if (!this.cache || this.cache.expiresAt <= this.now()) {
      return null;
    }

    return this.cache.pickupPoints;
  }

  private isConfigured(): boolean {
    return [
      this.env.FOXPOST_API_USER,
      this.env.FOXPOST_API_PASSWORD,
      this.env.FOXPOST_API_KEY,
    ].every((value) => typeof value === "string" && value.trim().length > 0);
  }
}
