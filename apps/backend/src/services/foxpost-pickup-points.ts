const FOXPOST_PICKUP_POINTS_URL = "https://cdn.foxpost.hu/foxplus.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type FoxpostSourcePoint = {
  operator_id: string;
  name: string;
  address: string;
  open: Record<string, string>;
  geolat: number;
  geolng: number;
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
  opening_hours: Record<string, string>;
  latitude: number;
  longitude: number;
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
  opening_hours: point.open,
  latitude: point.geolat,
  longitude: point.geolng,
});

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
