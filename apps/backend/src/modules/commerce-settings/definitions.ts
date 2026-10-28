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
