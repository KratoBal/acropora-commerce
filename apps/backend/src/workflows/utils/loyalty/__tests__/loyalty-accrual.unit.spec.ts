import {
  accrualPoints,
  loadLoyaltyAccrualSettings,
  resolveLoyaltyAccrualSettings,
  wasOnSale,
  type LoyaltyAccrualSettings,
} from "../loyalty-accrual"

/*
  WHAT TURNS THIS RED (card dfb79916; Balázs 2026-11-24, the old shop's picture, emlék 2935: 3 percent of the gross price, nothing on
  a product bought at a sale price, 1 point = 1 Ft). A line bought on sale earning points while the setting says no; an order of
  points-paid money earning on the points; a guest order crediting somebody; the switch turning on from a broken or failed read;
  a stored number not winning over the default; a part of a point being credited.
*/
const ON: LoyaltyAccrualSettings = { enabled: true, percent: 3, onSaleItems: false }

describe("resolveLoyaltyAccrualSettings", () => {
  it("with no row: the old shop's numbers and the switch OFF, every source the default", () => {
    const { settings, sources } = resolveLoyaltyAccrualSettings([])
    expect(settings).toEqual({ enabled: false, percent: 3, onSaleItems: false })
    expect(Object.values(sources)).toEqual(["default", "default", "default"])
  })

  it("stored rows win, and say so", () => {
    const { settings, sources } = resolveLoyaltyAccrualSettings([
      { key: "loyalty_accrual_enabled", value: "1" },
      { key: "loyalty_accrual_percent", value: "5" },
      { key: "loyalty_accrual_on_sale_items", value: 1 },
    ])
    expect(settings).toEqual({ enabled: true, percent: 5, onSaleItems: true })
    expect(Object.values(sources)).toEqual(["row", "row", "row"])
  })

  it("a broken stored switch is OFF, a broken number is the default, and both are named", () => {
    const { settings, sources } = resolveLoyaltyAccrualSettings([
      { key: "loyalty_accrual_enabled", value: "igen" },
      { key: "loyalty_accrual_percent", value: "250" },
    ])
    expect(settings).toEqual({ enabled: false, percent: 3, onSaleItems: false })
    expect(sources).toEqual({ enabled: "row_invalid", percent: "row_invalid", onSaleItems: "default" })
  })

  it("a failed read turns the switch OFF even with a stored 1", () => {
    const { settings, sources } = resolveLoyaltyAccrualSettings([{ key: "loyalty_accrual_enabled", value: "1" }], true)
    expect(settings.enabled).toBe(false)
    expect(sources.enabled).toBe("read_failed")
  })
})

describe("loadLoyaltyAccrualSettings", () => {
  it("a container without the settings module reads the defaults (OFF) and does not throw", async () => {
    const { settings } = await loadLoyaltyAccrualSettings({ resolve: () => { throw new Error("no module") } })
    expect(settings.enabled).toBe(false)
  })

  it("a read that fails on a module that is there is OFF, whatever was stored", async () => {
    const { settings, sources } = await loadLoyaltyAccrualSettings({
      resolve: (() => ({ listCommerceSettings: async () => { throw new Error("db down") } })) as never,
    })
    expect(settings.enabled).toBe(false)
    expect(sources.enabled).toBe("read_failed")
  })

  it("reads the three keys", async () => {
    let asked: string[] = []
    const { settings } = await loadLoyaltyAccrualSettings({
      resolve: (() => ({
        listCommerceSettings: async (f: { key: string[] }) => {
          asked = f.key
          return [{ key: "loyalty_accrual_enabled", value: "1" }]
        },
      })) as never,
    })
    expect(asked.sort()).toEqual(["loyalty_accrual_enabled", "loyalty_accrual_on_sale_items", "loyalty_accrual_percent"])
    expect(settings.enabled).toBe(true)
  })
})

describe("wasOnSale", () => {
  it("is on sale only when the compare-at price is set AND above the price paid", () => {
    expect(wasOnSale({ unit_price: 4080, compare_at_unit_price: 5100 })).toBe(true)
    expect(wasOnSale({ unit_price: 4080, compare_at_unit_price: 4080 })).toBe(false)
    expect(wasOnSale({ unit_price: 4080, compare_at_unit_price: null })).toBe(false)
    expect(wasOnSale({ unit_price: 4080 })).toBe(false)
  })
})

describe("accrualPoints", () => {
  const line = (total: number, extra: object = {}) => ({ total, unit_price: total, ...extra })

  it("3 percent of the gross lines, rounded DOWN to whole points (1 point = 1 Ft)", () => {
    expect(accrualPoints({ customer_id: "c", total: 10_000, items: [line(10_000)] }, ON, 1)).toBe(300)
    expect(accrualPoints({ customer_id: "c", total: 4_990, items: [line(4_990)] }, ON, 1)).toBe(149) // 149.7
  })

  it("a line bought at a sale price earns nothing, the others in the same order do", () => {
    const order = { customer_id: "c", total: 15_000, items: [line(10_000), line(5_000, { compare_at_unit_price: 6_500 })] }
    expect(accrualPoints(order, ON, 1)).toBe(300)
    expect(accrualPoints(order, { ...ON, onSaleItems: true }, 1)).toBe(450)
  })

  it("points are not earned on points: the base is the share of the order that money paid", () => {
    // 10 000 of lines, 4 000 paid with points: money paid 6 000 of 10 000 (total after credit 6 000, credit 4 000)
    const order = { customer_id: "c", total: 6_000, credit_line_total: 4_000, items: [line(10_000)] }
    expect(accrualPoints(order, ON, 1)).toBe(180)
  })

  it("a line's own discount is already out of its total", () => {
    expect(accrualPoints({ customer_id: "c", total: 8_000, items: [line(8_000, { unit_price: 10_000 })] }, ON, 1)).toBe(240)
  })

  it("nothing when switched off, for a guest order, for an order with no eligible line, or below one point", () => {
    const order = { customer_id: "c", total: 10_000, items: [line(10_000)] }
    expect(accrualPoints(order, { ...ON, enabled: false }, 1)).toBe(0)
    expect(accrualPoints({ ...order, customer_id: null }, ON, 1)).toBe(0)
    expect(accrualPoints({ customer_id: "c", total: 6_000, items: [line(6_000, { compare_at_unit_price: 8_000 })] }, ON, 1)).toBe(0)
    expect(accrualPoints({ customer_id: "c", total: 30, items: [line(30)] }, ON, 1)).toBe(0) // 0.9
  })

  it("the percent is a setting, and a point worth more than a forint earns fewer points", () => {
    const order = { customer_id: "c", total: 10_000, items: [line(10_000)] }
    expect(accrualPoints(order, { ...ON, percent: 10 }, 1)).toBe(1_000)
    expect(accrualPoints(order, ON, 2)).toBe(150)
    expect(accrualPoints(order, { ...ON, percent: 0 }, 1)).toBe(0)
  })

  it("reads Medusa's money values: strings and raw BigNumber objects", () => {
    const order = { customer_id: "c", total: "10000", items: [{ total: { value: "10000", precision: 20 }, unit_price: "10000" }] }
    expect(accrualPoints(order as never, ON, 1)).toBe(300)
  })
})
