import { MedusaError } from "@medusajs/framework/utils"

export const CASH_ON_DELIVERY_FEE_SETTING_KEY =
  "cash_on_delivery_fee_huf" as const
export const SHIPPING_GLS_NORMAL_SETTING_KEY =
  "shipping_gls_normal_huf" as const
export const SHIPPING_GLS_HEAVY_SETTING_KEY = "shipping_gls_heavy_huf" as const
export const SHIPPING_FOXPOST_SETTING_KEY = "shipping_foxpost_huf" as const
/**
 * THE FREE-SHIPPING THRESHOLD IS PER CARRIER (Balázs, 2026-10-28 09:56 UTC,
 * message 1564940831658348567): Foxpost from 30 000 Ft, GLS from 50 000 Ft, as on
 * the old shop's Szállítás page. It used to be one `free_shipping_threshold_huf`
 * (default 50 000) for both. That key is gone from the code: a row stored under
 * it is ignored, and the migration `Migration20261028180000` deletes it
 * (LEGACY_COMMERCE_SETTING_KEYS below).
 */
export const FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY =
  "free_shipping_threshold_gls_huf" as const
export const FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY =
  "free_shipping_threshold_foxpost_huf" as const

/**
 * THE MERCHANT FEED'S RESTOCK LEAD TIME, in days (card 69d18bff; acrobot 56624). Google requires an
 * `availability_date` for a `backorder` item, and today nothing in the OS holds a supplier lead time that
 * is read anywhere (`SupplierProduct.leadTimeDays` exists, unwritten). Unset (no default, on purpose): a
 * product at zero stock that may be backordered goes to the feed as `out_of_stock`. Set: as `backorder`,
 * available that many days from the day the feed is built. A business number, set, not coded.
 */
export const FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY =
  "feed_backorder_lead_time_days" as const

/**
 * THE LEAST PRICE HISTORY, IN DAYS, A REDUCTION NEEDS TO BE ANNOUNCED (card 90c54873; Balázs, 2026-11-24 10:06 UTC, "mehet a 15",
 * and "legyen állítható beállítás, alapérték 15"). The storefront shows a struck-out price and a "lowest price" line only for a
 * reduction whose reference price rests on at least this many days of history; a shorter history shows only the price to pay.
 * 15 is the floor the decree sets for a product on the market for less than 30 days (4/2009. (I. 30.) NFGM-SZMM rendelet 2/A. §
 * (5)); 30 is the general rule, so a larger number would hide a lawful reduction for no reason the decree gives. THE OS APPLIES IT:
 * it writes the Omnibus reference onto a variant only when the history reaches this far (the key being present is the OS's
 * statement that a reduction runs, and the storefront trusts it), so this module only holds and bounds the number.
 */
export const OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY =
  "omnibus_min_history_days" as const
export const OMNIBUS_MIN_HISTORY_DAYS_MIN = 15
export const OMNIBUS_MIN_HISTORY_DAYS_MAX = 30
export const DEFAULT_OMNIBUS_MIN_HISTORY_DAYS = 15

/**
 * KEYS THAT NO LONGER EXIST IN THE CODE. A row under one of them is ignored by
 * the accessor and cannot be removed from the Admin (the settings list shows it
 * as unknown), so a data migration deletes it. EACH KEY NEEDS ITS OWN MIGRATION
 * (with its own literal key): a migration that has run never runs again, so
 * adding a key to this list does not delete anything by itself. NEVER put a
 * live key here (a unit test keeps this list apart from the live keys).
 */
export const LEGACY_COMMERCE_SETTING_KEYS = [
  "free_shipping_threshold_huf",
] as const

export const COMMERCE_SETTING_KEYS = [
  CASH_ON_DELIVERY_FEE_SETTING_KEY,
  SHIPPING_GLS_NORMAL_SETTING_KEY,
  SHIPPING_GLS_HEAVY_SETTING_KEY,
  SHIPPING_FOXPOST_SETTING_KEY,
  FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY,
  FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY,
  FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY,
  OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY,
] as const

export type CommerceSettingKey = (typeof COMMERCE_SETTING_KEYS)[number]

export const DEFAULT_CASH_ON_DELIVERY_FEE_HUF = 450
export const DEFAULT_FREE_SHIPPING_THRESHOLD_GLS_HUF = 50_000
export const DEFAULT_FREE_SHIPPING_THRESHOLD_FOXPOST_HUF = 30_000

export type CommerceSettingDefinition = Readonly<{
  key: CommerceSettingKey
  description: string
  normalize: (raw: unknown) => number
  /** Omitted when the business has not approved a fallback value. */
  defaultValue?: number
}>

/**
 * Normalizes an operational HUF value at the boundary of the settings domain.
 * HUF has no minor unit, and a negative operational price is never valid.
 */
export const normalizeNonNegativeWholeHuf = (
  raw: unknown,
  key: string
): number => {
  const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${key} must be a number, received ${JSON.stringify(raw)}`
    )
  }

  if (!Number.isInteger(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${key} must be a whole number of forints, received ${value}`
    )
  }

  if (value < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${key} must not be negative, received ${value}`
    )
  }

  return value
}

const hufDefinition = (
  key: CommerceSettingKey,
  description: string,
  defaultValue?: number
): CommerceSettingDefinition => ({
  key,
  description,
  normalize: (raw) => normalizeNonNegativeWholeHuf(raw, key),
  ...(defaultValue === undefined ? {} : { defaultValue }),
})

export const FEED_BACKORDER_LEAD_TIME_DAYS_MAX = 365

/** A lead time: whole days, 1 to 365 (0 would promise delivery today; more than a year is a typo). */
export const normalizeLeadTimeDays = (raw: unknown, key: string): number => {
  const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > FEED_BACKORDER_LEAD_TIME_DAYS_MAX
  )
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${key} must be a whole number of days from 1 to ${FEED_BACKORDER_LEAD_TIME_DAYS_MAX}, received ${JSON.stringify(raw)}`
    )
  return value
}

/** The Omnibus history threshold: whole days from 15 (the decree's floor) to 30 (the general rule). */
export const normalizeOmnibusMinHistoryDays = (
  raw: unknown,
  key: string
): number => {
  const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < OMNIBUS_MIN_HISTORY_DAYS_MIN ||
    value > OMNIBUS_MIN_HISTORY_DAYS_MAX
  )
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${key} must be a whole number of days from ${OMNIBUS_MIN_HISTORY_DAYS_MIN} to ${OMNIBUS_MIN_HISTORY_DAYS_MAX}, received ${JSON.stringify(raw)}`
    )
  return value
}

/** Single source of truth for keys, descriptions, validation and defaults. */
export const COMMERCE_SETTING_DEFINITIONS: Record<
  CommerceSettingKey,
  CommerceSettingDefinition
> = {
  [CASH_ON_DELIVERY_FEE_SETTING_KEY]: hufDefinition(
    CASH_ON_DELIVERY_FEE_SETTING_KEY,
    "Utánvét kezelési díj, forintban. Csak utánvétes fizetésnél számítjuk fel, rendelésenként egyszer.",
    DEFAULT_CASH_ON_DELIVERY_FEE_HUF
  ),
  [SHIPPING_GLS_NORMAL_SETTING_KEY]: hufDefinition(
    SHIPPING_GLS_NORMAL_SETTING_KEY,
    "Normál GLS szállítási díj, forintban."
  ),
  [SHIPPING_GLS_HEAVY_SETTING_KEY]: hufDefinition(
    SHIPPING_GLS_HEAVY_SETTING_KEY,
    "GLS nehézáru szállítási díj, forintban."
  ),
  [SHIPPING_FOXPOST_SETTING_KEY]: hufDefinition(
    SHIPPING_FOXPOST_SETTING_KEY,
    "Foxpost csomagponti szállítási díj, forintban."
  ),
  [FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY]: hufDefinition(
    FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY,
    "Az ingyenes normál GLS szállítás áruérték-küszöbe, forintban. A nehézáru nem ingyenes.",
    DEFAULT_FREE_SHIPPING_THRESHOLD_GLS_HUF
  ),
  [FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY]: hufDefinition(
    FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY,
    "Az ingyenes Foxpost szállítás áruérték-küszöbe, forintban.",
    DEFAULT_FREE_SHIPPING_THRESHOLD_FOXPOST_HUF
  ),
  [FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY]: {
    key: FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY,
    description:
      "Utánrendelhető, nulla készletű termék beszerzési átfutása napokban a termék-feedhez (Google, Meta). Üresen a feed az ilyen terméket nincs készleten-ként adja.",
    normalize: (raw) =>
      normalizeLeadTimeDays(raw, FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY),
  },
  [OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY]: {
    key: OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY,
    description:
      "Hány napos ár-előzmény kell ahhoz, hogy egy árcsökkentést közöljünk (áthúzott ár és legalacsonyabb ár sor). 15 és 30 nap között; a 15 a rendelet alsó határa a 30 napnál rövidebb ideje forgalmazott termékre.",
    normalize: (raw) =>
      normalizeOmnibusMinHistoryDays(raw, OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY),
    defaultValue: DEFAULT_OMNIBUS_MIN_HISTORY_DAYS,
  },
}

export const isCommerceSettingKey = (key: string): key is CommerceSettingKey =>
  COMMERCE_SETTING_KEYS.includes(key as CommerceSettingKey)

export const assertCommerceSettingKey = (key: string): CommerceSettingKey => {
  if (!isCommerceSettingKey(key)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unknown commerce setting key: ${key}`
    )
  }

  return key
}

export const normalizeCommerceSettingValue = (
  key: CommerceSettingKey,
  raw: unknown
): number => COMMERCE_SETTING_DEFINITIONS[key].normalize(raw)
