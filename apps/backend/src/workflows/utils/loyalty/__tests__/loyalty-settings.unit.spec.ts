import { loadLoyaltySettings, resolveLoyaltySettings } from "../loyalty-settings"

/*
  WHAT TURNS THIS RED (card dfb79916; Balázs 2026-11-24: every number and switch settable from the admin, the old shop's values the
  defaults). A stored row not winning over the environment, or the environment over the default; a stored row that fails its bounds
  stopping a checkout instead of falling through; the source of a field named wrongly (the OS shows it); the master switch turning on
  for anything but 1 (or the environment's text true); a container without the settings module, or a failing read, throwing into a
  cart operation.
*/
const DEFAULTS = { enabled: false, value: 1, minOrder: 30_000, minPoints: 100, maxPercent: 100 }

describe("resolveLoyaltySettings", () => {
  it("with no row and no environment: the old shop's values, every source the default", () => {
    const { settings, sources } = resolveLoyaltySettings([], {})
    expect(settings).toEqual(DEFAULTS)
    expect(Object.values(sources)).toEqual(["default", "default", "default", "default", "default"])
  })

  it("the environment still works as before the admin could set anything, and says so", () => {
    const { settings, sources } = resolveLoyaltySettings([], {
      LOYALTY_REDEMPTION_ENABLED: "true",
      LOYALTY_POINT_VALUE_HUF: "2",
      LOYALTY_MIN_ORDER_HUF: "50000",
      LOYALTY_MIN_POINTS: "200",
      LOYALTY_MAX_PERCENT: "50",
    })
    expect(settings).toEqual({ enabled: true, value: 2, minOrder: 50_000, minPoints: 200, maxPercent: 50 })
    expect(Object.values(sources)).toEqual(["env", "env", "env", "env", "env"])
  })

  it("a stored row wins over the environment, field by field; the rest keep their sources", () => {
    const { settings, sources } = resolveLoyaltySettings(
      [
        { key: "loyalty_redemption_enabled", value: "1" },
        { key: "loyalty_min_order_huf", value: "0" },
        { key: "loyalty_max_percent", value: "40" },
      ],
      { LOYALTY_REDEMPTION_ENABLED: "false", LOYALTY_MAX_PERCENT: "50", LOYALTY_MIN_POINTS: "300" },
    )
    expect(settings).toEqual({ enabled: true, value: 1, minOrder: 0, minPoints: 300, maxPercent: 40 })
    expect(sources).toEqual({ enabled: "row", value: "default", minOrder: "row", minPoints: "env", maxPercent: "row" })
  })

  it("the switch is on only for a stored 1, or for the environment's text true", () => {
    const on = (rows: { key: string; value: unknown }[], env: Record<string, string>) =>
      resolveLoyaltySettings(rows, env).settings.enabled
    expect(on([{ key: "loyalty_redemption_enabled", value: "1" }], {})).toBe(true)
    expect(on([{ key: "loyalty_redemption_enabled", value: 0 }], { LOYALTY_REDEMPTION_ENABLED: "true" })).toBe(false)
    expect([" TRUE ", "true"].map((v) => on([], { LOYALTY_REDEMPTION_ENABLED: v }))).toEqual([true, true])
    expect(["1", "yes", "on", "false", ""].map((v) => on([], { LOYALTY_REDEMPTION_ENABLED: v }))).toEqual([false, false, false, false, false])
  })

  it("a stored row that fails its bounds is ignored (never thrown): the environment, then the default, answers", () => {
    const { settings, sources } = resolveLoyaltySettings(
      [
        { key: "loyalty_max_percent", value: "250" },
        { key: "loyalty_point_value_huf", value: "0" },
        { key: "loyalty_min_points", value: "tíz" },
        { key: "loyalty_min_order_huf", value: -5 },
        { key: "loyalty_redemption_enabled", value: "2" },
      ],
      { LOYALTY_MAX_PERCENT: "60" },
    )
    expect(settings).toEqual({ enabled: false, value: 1, minOrder: 30_000, minPoints: 100, maxPercent: 60 })
    expect(sources).toEqual({ enabled: "default", value: "default", minOrder: "default", minPoints: "default", maxPercent: "env" })
  })

  it("the order minimum may be stored as 0 (no minimum), which the environment could not say", () => {
    expect(resolveLoyaltySettings([{ key: "loyalty_min_order_huf", value: "0" }], {}).settings.minOrder).toBe(0)
    expect(resolveLoyaltySettings([], { LOYALTY_MIN_ORDER_HUF: "0" }).settings.minOrder).toBe(30_000)
  })
})

describe("loadLoyaltySettings", () => {
  const containerWith = (service: unknown) => ({
    resolve: <T>(key: string): T => {
      if (key !== "commerce_settings") throw new Error(`no ${key}`)
      return service as T
    },
  })

  it("reads the five loyalty keys through the module and resolves them", async () => {
    const listCommerceSettings = jest.fn().mockResolvedValue([{ key: "loyalty_point_value_huf", value: "3" }])
    const { settings, sources } = await loadLoyaltySettings(containerWith({ listCommerceSettings }), {})
    expect(listCommerceSettings).toHaveBeenCalledWith(
      {
        key: [
          "loyalty_redemption_enabled",
          "loyalty_point_value_huf",
          "loyalty_min_order_huf",
          "loyalty_min_points",
          "loyalty_max_percent",
        ],
      },
      { take: null },
    )
    expect(settings.value).toBe(3)
    expect(sources.value).toBe("row")
  })

  it("a container without the module, or a read that fails, never throws: the environment and the defaults answer", async () => {
    const noModule = { resolve: () => { throw new Error("not registered") } }
    expect((await loadLoyaltySettings(noModule, { LOYALTY_MIN_POINTS: "250" })).settings.minPoints).toBe(250)
    const failing = containerWith({ listCommerceSettings: jest.fn().mockRejectedValue(new Error("db down")) })
    expect((await loadLoyaltySettings(failing, {})).settings).toEqual(DEFAULTS)
    expect((await loadLoyaltySettings(containerWith(undefined), {})).settings).toEqual(DEFAULTS)
  })
})
