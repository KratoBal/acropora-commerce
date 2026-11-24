import { COMMERCE_SETTINGS_MODULE } from "../../../modules/commerce-settings"
import {
  COMMERCE_SETTING_DEFINITIONS,
  LOYALTY_MAX_PERCENT_SETTING_KEY,
  LOYALTY_MIN_ORDER_HUF_SETTING_KEY,
  LOYALTY_MIN_POINTS_SETTING_KEY,
  LOYALTY_POINT_VALUE_HUF_SETTING_KEY,
  LOYALTY_REDEMPTION_ENABLED_SETTING_KEY,
  type CommerceSettingKey,
} from "../../../modules/commerce-settings/definitions"
import { LOYALTY_DEFAULTS, type LoyaltySettings } from "./loyalty-credit"

/**
 * THE LOYALTY REDEMPTION'S SETTINGS AS THE SHOP READS THEM (card dfb79916; Balázs 2026-11-24 10:01 UTC: every number and switch
 * settable from the admin, the old shop's values the defaults). THREE SOURCES, IN THIS ORDER, PER FIELD: a stored commerce-
 * setting row (what a person set in the OS), then the environment (`LOYALTY_*`, how the test shop was switched on before the
 * admin could), then the default. A stored row that fails its bounds is IGNORED here, never thrown: every cart operation passes
 * through these settings, and a broken row must not stop a checkout (the admin edge refuses such a value in the first place).
 * `sources` says which of the three each field came from, so the OS can show a value that is not a stored one.
 */
export const LOYALTY_SETTING_KEYS = [
  LOYALTY_REDEMPTION_ENABLED_SETTING_KEY,
  LOYALTY_POINT_VALUE_HUF_SETTING_KEY,
  LOYALTY_MIN_ORDER_HUF_SETTING_KEY,
  LOYALTY_MIN_POINTS_SETTING_KEY,
  LOYALTY_MAX_PERCENT_SETTING_KEY,
] as const satisfies readonly CommerceSettingKey[]

/**
 * WHERE A FIELD CAME FROM. `row_invalid`: a stored row EXISTS but fails its bounds (a later PR narrowed the bound, a hand-made
 * write), so it was ignored and the value in use is the environment's or the default's: the OS shows it, instead of a silent
 * fall-back that reads as "nobody set it" (barracuda, #881 review). `read_failed` (the master switch only): the settings read
 * itself failed, so the switch is OFF whatever the environment says.
 */
export type LoyaltySettingSource = "row" | "env" | "default" | "row_invalid" | "read_failed"
export type ResolvedLoyaltySettings = {
  settings: LoyaltySettings
  sources: Record<keyof LoyaltySettings, LoyaltySettingSource>
}

type SettingRow = { key: string; value: unknown }

/** A positive whole number from the environment, or undefined: the same reading as `loyaltySettings`, but it tells "not set". */
const envWhole = (raw: string | undefined, max: number): number | undefined => {
  const text = raw?.trim()
  if (!text || !/^\d+$/.test(text)) return undefined
  const value = Number(text)
  return Number.isSafeInteger(value) && value >= 1 && value <= max ? value : undefined
}

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

export function resolveLoyaltySettings(
  rows: SettingRow[],
  env: Record<string, string | undefined> = process.env,
  /** the settings read FAILED (not "the module is absent"): the master switch is then off, whatever the environment says */
  readFailed = false,
): ResolvedLoyaltySettings {
  const pick = (
    key: CommerceSettingKey,
    fromEnv: number | undefined,
    fallback: number,
  ): { value: number; source: LoyaltySettingSource } => {
    const stored = rowNumber(rows, key)
    if (typeof stored === "number") return { value: stored, source: "row" }
    const invalid = stored === "invalid"
    if (fromEnv !== undefined) return { value: fromEnv, source: invalid ? "row_invalid" : "env" }
    return { value: fallback, source: invalid ? "row_invalid" : "default" }
  }
  // the environment's switch is the text `true` (anything else set is OFF, as before); unset falls through to the default
  const envSwitch =
    env.LOYALTY_REDEMPTION_ENABLED === undefined
      ? undefined
      : env.LOYALTY_REDEMPTION_ENABLED.trim().toLowerCase() === "true"
        ? 1
        : 0
  // A FAILED READ turns the redemption OFF: the safe direction for money. The numbers keep reading as the environment and the defaults.
  // A BROKEN STORED SWITCH ROW is OFF too (barracuda, #881): it must not fall back to an environment that says on.
  const enabled = readFailed
    ? { value: 0, source: "read_failed" as LoyaltySettingSource }
    : rowNumber(rows, LOYALTY_REDEMPTION_ENABLED_SETTING_KEY) === "invalid"
      ? { value: 0, source: "row_invalid" as LoyaltySettingSource }
      : pick(LOYALTY_REDEMPTION_ENABLED_SETTING_KEY, envSwitch, 0)
  const value = pick(LOYALTY_POINT_VALUE_HUF_SETTING_KEY, envWhole(env.LOYALTY_POINT_VALUE_HUF, 1_000_000), LOYALTY_DEFAULTS.value)
  const minOrder = pick(LOYALTY_MIN_ORDER_HUF_SETTING_KEY, envWhole(env.LOYALTY_MIN_ORDER_HUF, 1_000_000_000), LOYALTY_DEFAULTS.minOrder)
  const minPoints = pick(LOYALTY_MIN_POINTS_SETTING_KEY, envWhole(env.LOYALTY_MIN_POINTS, 1_000_000_000), LOYALTY_DEFAULTS.minPoints)
  const maxPercent = pick(LOYALTY_MAX_PERCENT_SETTING_KEY, envWhole(env.LOYALTY_MAX_PERCENT, 100), LOYALTY_DEFAULTS.maxPercent)
  return {
    settings: {
      enabled: enabled.value === 1,
      value: value.value,
      minOrder: minOrder.value,
      minPoints: minPoints.value,
      maxPercent: maxPercent.value,
    },
    sources: {
      enabled: enabled.source,
      value: value.source,
      minOrder: minOrder.source,
      minPoints: minPoints.source,
      maxPercent: maxPercent.source,
    },
  }
}

type Container = { resolve: <T = unknown>(key: string) => T }
type SettingsReader = {
  listCommerceSettings: (filters: { key: string[] }, config: { take: null }) => Promise<SettingRow[]>
}

/**
 * The settings for one cart operation or one admin read. NEVER THROWS, so a checkout does not stop on a settings read. Two
 * different failures, two different answers: a container WITHOUT the settings module (a unit test's stand-in) reads as the
 * environment and the defaults; a read that FAILS on a module that is there (the database is down) reads the numbers as the
 * environment and the defaults but turns the master switch OFF (barracuda, #881: with the test shop's environment saying on and
 * the admin having switched it off, a read error must not switch the redemption on).
 */
export async function loadLoyaltySettings(
  container: Container,
  env: Record<string, string | undefined> = process.env,
): Promise<ResolvedLoyaltySettings> {
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
      rows = await service.listCommerceSettings({ key: [...LOYALTY_SETTING_KEYS] }, { take: null })
    } catch {
      readFailed = true
    }
  }
  return resolveLoyaltySettings(rows, env, readFailed)
}
