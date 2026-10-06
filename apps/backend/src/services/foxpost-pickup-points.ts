import {
  DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
  searchPickupPoints,
} from "./pickup-point-search";

const FOXPOST_PICKUP_POINTS_URL = "https://cdn.foxpost.hu/foxplus.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * A FORCED REFRESH AT MOST THIS OFTEN (the Foxpost prompt, point 6: no old copy
 * as the source of truth). A point chosen in the official finder but missing
 * from our copy may simply be newer than it, so the list is fetched again once
 * before the point is refused; an unknown id sent again and again does not
 * make us fetch the whole directory every time.
 */
const FORCED_REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;

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
  // The extended directory's fields (Foxpost's foxplus.json, measured
  // 2026-10-05: all 5008 points carry them). Read when present, never required.
  variant?: unknown;
  paymentOptions?: unknown;
  service?: unknown;
  iconUrl?: unknown;
  findme?: unknown;
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
  /**
   * The point's type in Foxpost's own words: "FOXPOST A-BOX", "FOXPOST Z-BOX"
   * or "Packeta Z-Pont" (the three values on 2026-10-05). Shown as it is, so a
   * Z-Pont is never called a Foxpost locker. Empty when the source has none.
   */
  variant: string;
  /** "card", "cash", "link", "app": what the point accepts (Foxpost's codes). */
  payment_options: string[];
  /** "pick up", "dispatch": what the point does (Foxpost's codes). */
  services: string[];
  /** Foxpost's own icon for the point's type; only an https address on cdn.foxpost.hu. */
  icon_url: string | null;
  /** Foxpost's "find me" note as plain text (their HTML, tags removed). */
  findme: string;
};

export {
  DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
  MAX_PICKUP_POINT_SEARCH_LIMIT,
} from "./pickup-point-search";

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

const stringsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

/**
 * THE ICON IS FOXPOST'S, OR NONE. The address goes into an <img> on the
 * checkout; anything but Foxpost's own CDN over https is dropped rather than
 * shown.
 */
const foxpostIconUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cdn.foxpost.hu"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

/**
 * Foxpost writes "find me" as HTML (`<br/>`, `<b>`). The checkout shows text:
 * line breaks stay, every tag goes, the few entities become characters.
 */
export const findmeText = (value: unknown): string =>
  typeof value !== "string"
    ? ""
    : value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

const toPickupPoint = (point: FoxpostSourcePoint): FoxpostPickupPoint => ({
  id: point.operator_id,
  name: point.name,
  address: point.address,
  zip: typeof point.zip === "string" ? point.zip.trim() : "",
  city: typeof point.city === "string" ? point.city.trim() : "",
  opening_hours: point.open,
  latitude: point.geolat,
  longitude: point.geolng,
  variant: typeof point.variant === "string" ? point.variant.trim() : "",
  payment_options: stringsOf(point.paymentOptions),
  services: stringsOf(point.service),
  icon_url: foxpostIconUrl(point.iconUrl),
  findme: findmeText(point.findme),
});

// The search is shared with the GLS directory (P4), so both pickers answer
// the same way; it lives in `pickup-point-search.ts`.
export { matchesPickupPointSearch } from "./pickup-point-search";

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
  private lastForcedRefreshAt: number | null = null;

  constructor({
    env = process.env,
    fetcher = fetch,
    now = Date.now,
  }: FoxpostPickupPointsDependencies = {}) {
    this.env = env;
    this.fetcher = fetcher;
    this.now = now;
  }

  /**
   * `refresh: true` reads the directory again even if our copy is fresh, but
   * not more often than `FORCED_REFRESH_MIN_INTERVAL_MS`; inside that window
   * it answers from the copy.
   */
  async getAvailability({ refresh = false }: { refresh?: boolean } = {}): Promise<FoxpostAvailability> {
    if (!this.isConfigured()) {
      return { available: false, reason: "missing_configuration" };
    }

    const forced =
      refresh &&
      (this.lastForcedRefreshAt === null ||
        this.now() - this.lastForcedRefreshAt >= FORCED_REFRESH_MIN_INTERVAL_MS);
    const cached = this.getCachedPickupPoints();

    if (cached && !forced) {
      return { available: true, pickup_points: cached };
    }
    if (forced) {
      this.lastForcedRefreshAt = this.now();
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

    return {
      available: true,
      ...searchPickupPoints(availability.pickup_points, query, limit),
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
