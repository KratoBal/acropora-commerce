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
/*
  GLS HUNGARY'S OWN ADDRESS (the GLS prompt, point 7). Measured 2026-10-05:
  map.gls-hungary.com and map.gls-croatia.com serve the byte-identical hu.json
  (4084 points), so the Hungarian one is taken.
*/
export const GLS_PICKUP_POINTS_URL =
  "https://map.gls-hungary.com/data/deliveryPoints/hu.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type GlsPointType = "parcel-shop" | "parcel-locker";

/** A parcel locker's load (the GLS prompt, point 6); `outOfOrder` cannot be chosen. */
export type GlsLockerSaturation = "lowVolume" | "highVolume" | "outOfOrder";

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
  /** Opening hours, a row per open day: 1 = Monday ... 7 = Sunday. */
  hours: { day: number; from: string; to: string }[];
  /** GLS's own feature keys: delivery, pickup, acceptsCard, acceptsCash, ... */
  features: string[];
  has_wheelchair_access: boolean;
  /** GLS's load flag: on lockers, and on some parcel shops; null when GLS gives none. */
  locker_saturation: GlsLockerSaturation | null;
  /** The locker's own number on its door, when GLS gives one. */
  external_id: string | null;
};

const SATURATIONS: readonly string[] = ["lowVolume", "highVolume", "outOfOrder"];

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
  const { id, goldId, name, type, features, lockerSaturation, hours, externalId, hasWheelchairAccess } = value;
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
    !features.includes("delivery")
  ) {
    return null;
  }

  /*
    AN OUT-OF-ORDER LOCKER IS KEPT, NOT DROPPED (the GLS prompt, point 6, and
    Figma 508:426): the checkout shows it greyed out, "Jelenleg nem
    választható.", and it can never be chosen (`glsPointSelectable`, checked
    again when the order's shipping is set).
  */
  return {
    id,
    gold_id: goldId,
    name,
    zip: postalCode,
    city,
    address,
    type,
    hours: Array.isArray(hours)
      ? hours.flatMap((row) =>
          Array.isArray(row) && typeof row[0] === "number" && typeof row[1] === "string" && typeof row[2] === "string"
            ? [{ day: row[0], from: row[1], to: row[2] }]
            : []
        )
      : [],
    features: features.filter((feature): feature is string => typeof feature === "string"),
    has_wheelchair_access: hasWheelchairAccess === true,
    /*
      ON ANY KIND OF POINT, not only lockers: measured 2026-10-05, GLS gives it
      on 268 of the 921 parcel shops too, 16 of them `outOfOrder`. Kept as GLS
      says it, so such a shop is not offered either (the old filter dropped it).
    */
    locker_saturation:
      typeof lockerSaturation === "string" && SATURATIONS.includes(lockerSaturation)
        ? (lockerSaturation as GlsLockerSaturation)
        : null,
    external_id: typeof externalId === "string" && externalId ? externalId : null,
  };
};

/** An out-of-order locker is listed but cannot be chosen. */
export const glsPointSelectable = (point: GlsPickupPoint) => point.locker_saturation !== "outOfOrder";

/**
 * WHICH POINTS AN OPTION MAY USE (acrobot, 2026-09-29): heavy goods only to a
 * parcel shop (a locker does not take them); the ordinary GLS pickup point to
 * either. The one place this rule lives.
 */
/** The option's rule (heavy goods only to a parcel shop); the point may still be out of order. */
export const glsPointFitsOption = (point: GlsPickupPoint, heavy: boolean) =>
  !heavy || point.type === "parcel-shop";

/** What an order may be shipped to: fits the option, and can be chosen now. */
export const glsPointAllowed = (point: GlsPickupPoint, heavy: boolean) =>
  glsPointFitsOption(point, heavy) && glsPointSelectable(point);

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
    includeUnavailable = false,
  }: {
    query: string;
    heavy: boolean;
    limit?: number;
    /**
     * Out-of-order lockers too, for a checkout that shows them greyed out.
     * Off by default, so a checkout that would let one be clicked never gets one.
     */
    includeUnavailable?: boolean;
  }): Promise<GlsPickupPointSearch> {
    const availability = await this.getAvailability();
    if (!availability.available) return availability;

    return {
      available: true,
      ...searchPickupPoints(
        availability.pickup_points.filter((point) =>
          includeUnavailable ? glsPointFitsOption(point, heavy) : glsPointAllowed(point, heavy)
        ),
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
