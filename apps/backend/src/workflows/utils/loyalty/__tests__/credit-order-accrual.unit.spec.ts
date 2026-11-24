import { Modules } from "@medusajs/framework/utils"

import { COMMERCE_SETTINGS_MODULE } from "../../../../modules/commerce-settings"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import { creditOrderLoyaltyAccrual } from "../credit-order-accrual"

/*
  WHAT TURNS THIS RED (card dfb79916): a closed order of a customer not crediting the points it earned; the accrual switched off
  (no row) still crediting; a guest order, or one that earns less than a point, touching the ledger; the credit not carrying the
  customer, the order and the points; a ledger or read failure throwing out of the status change (the move stands) instead of
  being logged with what to credit by hand; a second call for the same order crediting twice (the ledger answers `repeated`).
*/
const order = (over: Record<string, unknown> = {}) => ({
  id: "order_1",
  customer_id: "cus_1",
  total: 10_000,
  credit_line_total: 0,
  items: [{ total: 10_000, unit_price: 10_000, compare_at_unit_price: null }],
  ...over,
})

const run = async (opts: {
  rows?: { key: string; value: unknown }[]
  order?: unknown
  accrue?: jest.Mock
  settingsFail?: boolean
  customer?: { has_account?: boolean | null } | Error
}) => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const accrue = opts.accrue ?? jest.fn(async (input: { points: number }) => ({ balance: input.points, points: input.points, repeated: false }))
  const graph = jest.fn(async () => ({ data: opts.order === undefined ? [order()] : opts.order === null ? [] : [opts.order] }))
  const container = {
    resolve: (key: string) => {
      if (key === "logger") return logger
      if (key === "query") return { graph }
      if (key === COMMERCE_SETTINGS_MODULE)
        return { listCommerceSettings: async () => (opts.settingsFail ? Promise.reject(new Error("db down")) : (opts.rows ?? [])) }
      if (key === Modules.CUSTOMER)
        return {
          retrieveCustomer: async () => {
            if (opts.customer instanceof Error) throw opts.customer
            return opts.customer ?? { has_account: true }
          },
        }
      if (key === LOYALTY_MODULE) return { accruePoints: accrue }
      throw new Error(`unknown ${key}`)
    },
  }
  const outcome = await creditOrderLoyaltyAccrual(container as never, "order_1")
  return { outcome, logger, accrue, graph }
}
const ON = [{ key: "loyalty_accrual_enabled", value: "1" }]

describe("creditOrderLoyaltyAccrual", () => {
  it("credits 3 percent of the closed order to its customer, naming the order", async () => {
    const { outcome, accrue, logger } = await run({ rows: ON })
    expect(outcome).toEqual({ status: "credited", points: 300, repeated: false })
    expect(accrue).toHaveBeenCalledWith({ customer_id: "cus_1", order_id: "order_1", points: 300 })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("300 points credited to customer cus_1"))
  })

  it("with the switch off (no row) it neither reads the order nor touches the ledger", async () => {
    const { outcome, accrue, graph } = await run({})
    expect(outcome).toEqual({ status: "off" })
    expect(graph).not.toHaveBeenCalled()
    expect(accrue).not.toHaveBeenCalled()
  })

  it("a failed settings read is OFF, not a failure of the status change", async () => {
    const { outcome, accrue } = await run({ rows: ON, settingsFail: true })
    expect(outcome).toEqual({ status: "off" })
    expect(accrue).not.toHaveBeenCalled()
  })

  it("a guest order credits nobody", async () => {
    const { outcome, accrue } = await run({ rows: ON, order: order({ customer_id: null }) })
    expect(outcome).toEqual({ status: "no_customer" })
    expect(accrue).not.toHaveBeenCalled()
  })

  it("a GUEST checkout's customer (has_account false) is credited nothing: the guest record has a customer id too", async () => {
    const { outcome, accrue } = await run({ rows: ON, customer: { has_account: false } })
    expect(outcome).toEqual({ status: "no_customer" })
    expect(accrue).not.toHaveBeenCalled()
  })

  it("a customer whose account flag is missing is not credited either (the safe direction)", async () => {
    const { outcome, accrue } = await run({ rows: ON, customer: {} })
    expect(outcome).toEqual({ status: "no_customer" })
    expect(accrue).not.toHaveBeenCalled()
  })

  it("a customer that cannot be read is a logged failure, not a credit and not a throw", async () => {
    const { outcome, accrue, logger } = await run({ rows: ON, customer: new Error("customer gone") })
    expect(outcome).toMatchObject({ status: "failed", message: "customer gone" })
    expect(accrue).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalled()
  })

  it("an order that earns less than a point touches nothing", async () => {
    const { outcome, accrue } = await run({ rows: ON, order: order({ total: 20, items: [{ total: 20, unit_price: 20 }] }) })
    expect(outcome).toEqual({ status: "nothing_earned" })
    expect(accrue).not.toHaveBeenCalled()
  })

  it("the point value of the redemption settings divides the points (a point worth 2 forints)", async () => {
    const { outcome } = await run({ rows: [...ON, { key: "loyalty_point_value_huf", value: "2" }] })
    expect(outcome).toEqual({ status: "credited", points: 150, repeated: false })
  })

  it("a repeated closing is answered as repeated, the ledger having stored nothing", async () => {
    const accrue = jest.fn(async () => ({ balance: 300, points: 300, repeated: true }))
    const { outcome, logger } = await run({ rows: ON, accrue })
    expect(outcome).toEqual({ status: "credited", points: 300, repeated: true })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("(already done)"))
  })

  it("a ledger failure is logged with the points to credit by hand, never thrown", async () => {
    const accrue = jest.fn(async () => Promise.reject(new Error("db down")))
    const { outcome, logger } = await run({ rows: ON, accrue })
    expect(outcome).toEqual({ status: "failed", message: "db down" })
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/order_1.*300.*cus_1.*db down.*by hand/))
  })

  it("an order that cannot be read is a failure that is logged, not thrown", async () => {
    const { outcome, logger } = await run({ rows: ON, order: null })
    expect(outcome).toMatchObject({ status: "failed" })
    expect(logger.error).toHaveBeenCalled()
  })
})
