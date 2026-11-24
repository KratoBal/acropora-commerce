import {
  getCommerceSettingValue,
  getShippingPricingSettings,
} from "../../../modules/commerce-settings/accessor"
import {
  CASH_ON_DELIVERY_FEE_SETTING_KEY,
  COMMERCE_SETTING_DEFINITIONS,
  FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY,
  FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY,
  FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY,
  normalizeCommerceSettingValue,
  OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY,
  SHIPPING_FOXPOST_SETTING_KEY,
  SHIPPING_GLS_HEAVY_SETTING_KEY,
  SHIPPING_GLS_NORMAL_SETTING_KEY,
} from "../../../modules/commerce-settings/definitions"
import {
  defaultSetting,
  validateSettingValue,
} from "../../../api/admin/commerce-settings/helpers"
import { AdminUpsertCommerceSetting } from "../../../api/admin/commerce-settings/validators"

const serviceWith = (rows: { key: string; value: unknown }[]) => ({
  listCommerceSettings: async (filters: { key: string }) =>
    rows.filter((row) => row.key === filters.key),
})

describe("commerce setting definitions", () => {
  it("centralizes all operational pricing keys", () => {
    expect(Object.keys(COMMERCE_SETTING_DEFINITIONS).sort()).toEqual(
      [
        CASH_ON_DELIVERY_FEE_SETTING_KEY,
        SHIPPING_GLS_NORMAL_SETTING_KEY,
        SHIPPING_GLS_HEAVY_SETTING_KEY,
        SHIPPING_FOXPOST_SETTING_KEY,
        FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY,
        FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY,
        // the merchant feed's restock lead time (card 69d18bff): days, not forints, and no default
        FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY,
        // the least price history a reduction needs to be announced (card 90c54873): days, default 15
        OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY,
      ].sort(),
    )
  })

  it("accepts zero, positive integers and numeric text", () => {
    expect(
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, 0),
    ).toBe(0)
    expect(
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, 1_990),
    ).toBe(1_990)
    expect(
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, "1990"),
    ).toBe(1_990)
  })

  it.each([-1, "-1"])("rejects a negative HUF value: %p", (value) => {
    expect(() =>
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, value),
    ).toThrow(/must not be negative/)
  })

  it("rejects fractional, non-numeric, null and undefined values", () => {
    expect(() =>
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, 1.5),
    ).toThrow(/whole number/)
    expect(() =>
      normalizeCommerceSettingValue(
        SHIPPING_GLS_NORMAL_SETTING_KEY,
        "nem szám",
      ),
    ).toThrow(/must be a number/)
    expect(() =>
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, NaN),
    ).toThrow(/must be a number/)
    expect(() =>
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, null),
    ).toThrow(/must be a number/)
    expect(() =>
      normalizeCommerceSettingValue(SHIPPING_GLS_NORMAL_SETTING_KEY, undefined),
    ).toThrow(/must be a number/)
  })

  it("rejects an unknown key at the admin edge", () => {
    expect(() => validateSettingValue("shipping_guessed_huf", 100)).toThrow(
      /Unknown commerce setting key/,
    )
    expect(
      AdminUpsertCommerceSetting.safeParse({
        key: "shipping_guessed_huf",
        value: 100,
      }).success,
    ).toBe(false)
  })

  it("exposes approved defaults and marks carrier prices unconfigured", () => {
    expect(defaultSetting(CASH_ON_DELIVERY_FEE_SETTING_KEY)).toMatchObject({
      value: 450,
      is_default: true,
      is_configured: false,
    })
    expect(defaultSetting(FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY)).toMatchObject({
      value: 50_000,
      is_default: true,
      is_configured: false,
    })
    expect(
      defaultSetting(FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY)
    ).toMatchObject({
      value: 30_000,
      is_default: true,
      is_configured: false,
    })
    expect(defaultSetting(SHIPPING_FOXPOST_SETTING_KEY)).toMatchObject({
      value: null,
      is_default: false,
      is_configured: false,
    })
  })
})

describe("typed commerce setting access", () => {
  it("uses an approved default when no row exists", async () => {
    await expect(
      getCommerceSettingValue(
        serviceWith([]),
        FREE_SHIPPING_THRESHOLD_GLS_SETTING_KEY,
      ),
    ).resolves.toBe(50_000)
    await expect(
      getCommerceSettingValue(
        serviceWith([]),
        FREE_SHIPPING_THRESHOLD_FOXPOST_SETTING_KEY,
      ),
    ).resolves.toBe(30_000)
  })

  it("requires explicit carrier prices instead of inventing defaults", async () => {
    await expect(
      getCommerceSettingValue(serviceWith([]), SHIPPING_GLS_NORMAL_SETTING_KEY),
    ).rejects.toThrow(/must be configured/)
  })

  it("fails loudly on a stored invalid value", async () => {
    await expect(
      getCommerceSettingValue(
        serviceWith([{ key: SHIPPING_FOXPOST_SETTING_KEY, value: "-5" }]),
        SHIPPING_FOXPOST_SETTING_KEY,
      ),
    ).rejects.toThrow(/must not be negative/)
  })

  it("reads the four shipping-pricing settings through the module service", async () => {
    await expect(
      getShippingPricingSettings(
        serviceWith([
          { key: SHIPPING_GLS_NORMAL_SETTING_KEY, value: "1990" },
          { key: SHIPPING_GLS_HEAVY_SETTING_KEY, value: "5990" },
          { key: SHIPPING_FOXPOST_SETTING_KEY, value: "1490" },
        ]),
      ),
    ).resolves.toEqual({
      shipping_gls_normal_huf: 1_990,
      shipping_gls_heavy_huf: 5_990,
      shipping_foxpost_huf: 1_490,
      free_shipping_threshold_gls_huf: 50_000,
      free_shipping_threshold_foxpost_huf: 30_000,
    })
  })

  /*
    THE OMNIBUS HISTORY THRESHOLD (card 90c54873; Balázs 2026-11-24: "legyen állítható, alapérték 15"). WHAT TURNS THIS RED: the
    default no longer 15; a value under 15 (the decree's floor for a product on the market for less than 30 days) or over 30 (the
    general rule) or a fraction or text that is no number accepted; a missing row failing instead of reading as the default.
  */
  describe("the Omnibus history threshold", () => {
    it("reads as 15 days when no row was written, and the admin shows it as the default", async () => {
      await expect(
        getCommerceSettingValue(serviceWith([]), OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY),
      ).resolves.toBe(15)
      expect(defaultSetting(OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY)).toMatchObject({
        key: "omnibus_min_history_days",
        value: 15,
        is_default: true,
        is_configured: false,
      })
    })

    it("takes whole days from 15 to 30, as a number or as numeric text", () => {
      const read = [15, 16, 29, 30, "15", "30"].map((ok) =>
        normalizeCommerceSettingValue(OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY, ok),
      )
      expect(read).toEqual([15, 16, 29, 30, 15, 30])
    })

    it("refuses 14 and under, 31 and over, fractions, zero, negatives and what is no number", () => {
      const accepted = [14, 0, -15, 31, 100, 15.5, "14", "31", "tizenöt", "", null, undefined, NaN].filter((bad) => {
        try {
          normalizeCommerceSettingValue(OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY, bad)
          return true
        } catch {
          return false
        }
      })
      expect(accepted).toEqual([])
    })

    it("the admin validator stores it as text and refuses a value outside the bounds before a row is written", () => {
      expect(validateSettingValue("omnibus_min_history_days", 20)).toBe("20")
      expect(() => validateSettingValue("omnibus_min_history_days", 10)).toThrow(/from 15 to 30/)
      expect(AdminUpsertCommerceSetting.safeParse({ key: "omnibus_min_history_days", value: 20 }).success).toBe(true)
    })

    it("a stored value that is no longer in bounds fails loudly instead of reading as the default", async () => {
      await expect(
        getCommerceSettingValue(
          serviceWith([{ key: OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY, value: "7" }]),
          OMNIBUS_MIN_HISTORY_DAYS_SETTING_KEY,
        ),
      ).rejects.toThrow(/from 15 to 30/)
    })
  })
})
