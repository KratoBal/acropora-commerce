import { COMMERCE_SETTINGS_MODULE } from "../../../modules/commerce-settings"
import {
  COMMERCE_SETTING_DEFINITIONS,
  LOYALTY_ACCRUAL_ENABLED_SETTING_KEY,
  LOYALTY_ACCRUAL_ON_SALE_ITEMS_SETTING_KEY,
  LOYALTY_ACCRUAL_PERCENT_SETTING_KEY,
  type CommerceSettingKey,
} from "../../../modules/commerce-settings/definitions"
import { amountOf } from "../gift-card-credit"

/**
 * THE LOYALTY ACCRUAL: WHAT AN ORDER EARNS, AND THE SETTINGS THAT SAY SO (card dfb79916; Balázs 2026-11-24: every number and
 * switch settable, the old shop's picture the defaults; emlék 2935: 1 point = 1 Ft, 3 percent of the gross price, nothing on a
 * product that was on sale, credited when the order reaches "Megrendelés lezárva").
 *
 * THE BASE IS WHAT THE CUSTOMER PAID IN MONEY FOR THE LINES, GROSS: each line's `total` (tax in, its discount out), only the lines
 * that were not bought at a sale price (unless the setting lets them in), times the share of the order that money paid. The
 * share matters when points or a gift card covered part of the order: points are not earned on points. `compare_at_unit_price`
 * on the line is Medusa's own mark that the price was a reduced one WHEN IT WAS BOUGHT, so a later price change does not move
 * an order that is already placed.
 */
export type LoyaltyAccrualSettings = {
  enabled: boolean
  /** whole percent of the base, 0 to 100 */
  percent: number
  /** a line bought at a sale price earns too */
  onSaleItems: boolean
}

export const LOYALTY_ACCRUAL_DEFAULTS: LoyaltyAccrualSettings = { enabled: false, percent: 3, onSaleItems: false }

export type LoyaltyAccrualSource = "row" | "default" | "row_invalid" | "read_failed"
export type ResolvedLoyaltyAccrualSettings = {
  settings: LoyaltyAccrualSettings
  sources: Record<keyof LoyaltyAccrualSettings, LoyaltyAccrualSource>
}

export const LOYALTY_ACCRUAL_SETTING_KEYS = [
  LOYALTY_ACCRUAL_ENABLED_SETTING_KEY,
  LOYALTY_ACCRUAL_PERCENT_SETTING_KEY,
  LOYALTY_ACCRUAL_ON_SALE_ITEMS_SETTING_KEY,
] as const satisfies readonly CommerceSettingKey[]

type SettingRow = { key: string; value: unknown }

/** A stored row's value: a number, `undefined` when there is no row, `"invalid"` when the row fails its bounds. */
const rowNumber = (rows: SettingRow[], key: CommerceSettingKey): number | undefined | "invalid" => {
  const row = rows.find((candidate) => candidate.key === key)
  if (!row) return undefined
  try {
    return COMMERCE_SETTING_DEFINITIONS[key].normalize(row.value)
  } catch {
    return "invalid"
  }
}

/**
 * NO ENVIRONMENT SOURCE: the accrual is new, nothing was switched on through the environment before the admin could. A row, or
 * the default. A broken stored row reads as the default for the numbers, and as OFF for the switch (the safe direction for money:
 * barracuda, #881), a failed read as OFF too; `sources` says which, so the OS shows a value that is not a stored one.
 */
export function resolveLoyaltyAccrualSettings(rows: SettingRow[], readFailed = false): ResolvedLoyaltyAccrualSettings {
  const stored = (key: CommerceSettingKey) => rowNumber(rows, key)
  const sw = stored(LOYALTY_ACCRUAL_ENABLED_SETTING_KEY)
  const percent = stored(LOYALTY_ACCRUAL_PERCENT_SETTING_KEY)
  const onSale = stored(LOYALTY_ACCRUAL_ON_SALE_ITEMS_SETTING_KEY)

  const enabled: { value: boolean; source: LoyaltyAccrualSource } = readFailed
    ? { value: false, source: "read_failed" }
    : sw === "invalid"
      ? { value: false, source: "row_invalid" }
      : typeof sw === "number"
        ? { value: sw === 1, source: "row" }
        : { value: LOYALTY_ACCRUAL_DEFAULTS.enabled, source: "default" }
  const pick = (value: number | undefined | "invalid", fallback: number) =>
    typeof value === "number"
      ? { value, source: "row" as LoyaltyAccrualSource }
      : { value: fallback, source: (value === "invalid" ? "row_invalid" : "default") as LoyaltyAccrualSource }
  const percentPick = pick(percent, LOYALTY_ACCRUAL_DEFAULTS.percent)
  const onSalePick = pick(onSale, LOYALTY_ACCRUAL_DEFAULTS.onSaleItems ? 1 : 0)
  return {
    settings: { enabled: enabled.value, percent: percentPick.value, onSaleItems: onSalePick.value === 1 },
    sources: { enabled: enabled.source, percent: percentPick.source, onSaleItems: onSalePick.source },
  }
}

type Container = { resolve: <T = unknown>(key: string) => T }
type SettingsReader = {
  listCommerceSettings: (filters: { key: string[] }, config: { take: null }) => Promise<SettingRow[]>
}

/** The accrual settings for one order. NEVER THROWS; a failed read turns the accrual OFF, a missing module reads the defaults (OFF). */
export async function loadLoyaltyAccrualSettings(container: Container): Promise<ResolvedLoyaltyAccrualSettings> {
  let rows: SettingRow[] = []
  let readFailed = false
  let service: SettingsReader | undefined
  try {
    service = container.resolve<SettingsReader>(COMMERCE_SETTINGS_MODULE)
  } catch {
    service = undefined
  }
  if (service && typeof service.listCommerceSettings === "function") {
    try {
      rows = await service.listCommerceSettings({ key: [...LOYALTY_ACCRUAL_SETTING_KEYS] }, { take: null })
    } catch {
      readFailed = true
    }
  }
  return resolveLoyaltyAccrualSettings(rows, readFailed)
}

export type AccrualOrderLine = {
  /** gross, after the line's own discount */
  total?: unknown
  unit_price?: unknown
  compare_at_unit_price?: unknown
}

export type AccrualOrder = {
  customer_id?: string | null
  total?: unknown
  credit_line_total?: unknown
  items?: (AccrualOrderLine | null | undefined)[] | null
}

/** A line bought at a reduced price: Medusa's compare-at price is set and is above the price paid. */
export const wasOnSale = (line: AccrualOrderLine): boolean => {
  if (line.compare_at_unit_price === null || line.compare_at_unit_price === undefined) return false
  return amountOf(line.compare_at_unit_price) > amountOf(line.unit_price)
}

/**
 * THE POINTS AN ORDER EARNS, whole points, rounded DOWN (a part of a point is not a point). `pointValueHuf` is the redemption's
 * forint-per-point value, so a point earned is worth what a point spent is. 0 means "none": switched off, a guest order (no
 * customer to credit), no eligible line, or an amount that rounds below one point.
 */
export function accrualPoints(order: AccrualOrder, settings: LoyaltyAccrualSettings, pointValueHuf: number): number {
  if (!settings.enabled || !order.customer_id) return 0
  const eligible = (order.items ?? []).reduce((sum, line) => {
    if (!line) return sum
    if (!settings.onSaleItems && wasOnSale(line)) return sum
    return sum + Math.max(0, amountOf(line.total))
  }, 0)
  const credit = Math.max(0, amountOf(order.credit_line_total))
  const total = Math.max(0, amountOf(order.total))
  const share = credit > 0 ? (total + credit > 0 ? total / (total + credit) : 0) : 1
  const points = Math.floor(((eligible * share * settings.percent) / 100) / Math.max(1, pointValueHuf))
  return Number.isSafeInteger(points) && points > 0 ? points : 0
}
