import {
  getCommerceSettingValue,
  getShippingPricingSettings,
} from "../../../modules/commerce-settings/accessor"
import {
  CASH_ON_DELIVERY_FEE_SETTING_KEY,
  COMMERCE_SETTING_DEFINITIONS,
  FREE_SHIPPING_THRESHOLD_SETTING_KEY,
  normalizeCommerceSettingValue,
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
        FREE_SHIPPING_THRESHOLD_SETTING_KEY,
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
    expect(defaultSetting(FREE_SHIPPING_THRESHOLD_SETTING_KEY)).toMatchObject({
      value: 50_000,
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
        FREE_SHIPPING_THRESHOLD_SETTING_KEY,
      ),
    ).resolves.toBe(50_000)
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
      free_shipping_threshold_huf: 50_000,
    })
  })
})
