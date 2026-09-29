import {
  DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
  searchPickupPoints,
} from "./pickup-point-search";

/**
 * THE GLS PICKUP-POINT DIRECTORY (P4). GLS's own map widget reads it from here
 * (measured in the widget's code, 2026-09-29: `${origin}/data/deliveryPoints/
 * {country}.json`, the widget served from map.gls-croatia.com). We read the
 * same public list on the server and build our own picker from it, with no
 * third-party script in the checkout (acrobot, 2026-09-29).
 *
 * The shape is measured on the downloaded file (4081 points: 926 parcel-shop,
 * 3155 parcel-locker; `{"items": [...]}`), not taken from the widget.
 */
const GLS_PICKUP_POINTS_URL =
  "https://map.gls-croatia.com/data/deliveryPoints/hu.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type GlsPointType = "parcel-shop" | "parcel-locker";

export type GlsPickupPoint = {
  id: string;
  /** GLS's numeric id; kept with `id`, because label printing (MyGLS) needs one of them. */
  gold_id: number;
  name: string;
  zip: string;
  city: string;
  /** Street address, as the list gives it. */
  address: string;
  type: GlsPointType;
};

export type GlsAvailability =
  | { available: true; pickup_points: GlsPickupPoint[] }
  | { available: false; reason: "service_unavailable" };

export type GlsPickupPointSearch =
  | { available: true; pickup_points: GlsPickupPoint[]; count: number }
  | { available: false; reason: "service_unavailable" };

type GlsFetch = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * A point we can offer. Out-of-order lockers are left out, as GLS's own widget
 * disables them (`lockerSaturation === "outOfOrder"`, 369 on 2026-09-29), and
 * so is anything without the `delivery` feature or with an unknown type.
 */
const toPickupPoint = (value: unknown): GlsPickupPoint | null => {
  if (!isRecord(value) || !isRecord(value.contact)) return null;
  const { id, goldId, name, type, features, lockerSaturation } = value;
  const { postalCode, city, address } = value.contact;

  if (
    typeof id !== "string" ||
    typeof goldId !== "number" ||
    typeof name !== "string" ||
    typeof postalCode !== "string" ||
    typeof city !== "string" ||
    typeof address !== "string" ||
    (type !== "parcel-shop" && type !== "parcel-locker") ||
    !Array.isArray(features) ||
    !features.includes("delivery") ||
    lockerSaturation === "outOfOrder"
  ) {
    return null;
  }

  return { id, gold_id: goldId, name, zip: postalCode, city, address, type };
};

/**
 * WHICH POINTS AN OPTION MAY USE (acrobot, 2026-09-29): heavy goods only to a
 * parcel shop (a locker does not take them); the ordinary GLS pickup point to
 * either. The one place this rule lives.
 */
export const glsPointAllowed = (point: GlsPickupPoint, heavy: boolean) =>
  !heavy || point.type === "parcel-shop";

/** "1011 BUDAPEST I. KERÜLET, Batthyány tér 5 -6": the address as shown and stored. */
export const glsPointAddress = (point: GlsPickupPoint) =>
  `${point.zip} ${point.city}, ${point.address}`;

export class GlsPickupPointsService {
  private readonly fetcher: GlsFetch;
  private readonly now: () => number;
  private cache: { expiresAt: number; pickupPoints: GlsPickupPoint[] } | null = null;

  constructor({
    fetcher = fetch as unknown as GlsFetch,
    now = Date.now,
  }: { fetcher?: GlsFetch; now?: () => number } = {}) {
    this.fetcher = fetcher;
    this.now = now;
  }

  async getAvailability(): Promise<GlsAvailability> {
    if (this.cache && this.cache.expiresAt > this.now()) {
      return { available: true, pickup_points: this.cache.pickupPoints };
    }

    try {
      const response = await this.fetcher(GLS_PICKUP_POINTS_URL);
      if (!response.ok) return { available: false, reason: "service_unavailable" };

      const payload: unknown = await response.json();
      const items = isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
      const pickupPoints = items
        .map(toPickupPoint)
        .filter((point): point is GlsPickupPoint => point !== null);

      if (!pickupPoints.length) return { available: false, reason: "service_unavailable" };

      this.cache = { expiresAt: this.now() + CACHE_TTL_MS, pickupPoints };
      return { available: true, pickup_points: pickupPoints };
    } catch {
      return { available: false, reason: "service_unavailable" };
    }
  }

  async searchPickupPoints({
    query,
    heavy,
    limit = DEFAULT_PICKUP_POINT_SEARCH_LIMIT,
  }: {
    query: string;
    heavy: boolean;
    limit?: number;
  }): Promise<GlsPickupPointSearch> {
    const availability = await this.getAvailability();
    if (!availability.available) return availability;

    return {
      available: true,
      ...searchPickupPoints(
        availability.pickup_points.filter((point) => glsPointAllowed(point, heavy)),
        query,
        limit,
      ),
    };
  }

  async findPickupPoint(id: string): Promise<GlsPickupPoint | null> {
    const availability = await this.getAvailability();
    if (!availability.available) return null;
    return availability.pickup_points.find((point) => point.id === id) ?? null;
  }
}
