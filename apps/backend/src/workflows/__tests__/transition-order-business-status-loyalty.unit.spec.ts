import { Modules } from "@medusajs/framework/utils"
import { asValue, createContainer } from "awilix"

import { COMMERCE_SETTINGS_MODULE } from "../../modules/commerce-settings"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import { ORDER_BUSINESS_STATUS_MODULE } from "../../modules/order-business-status"
import { transitionOrderBusinessStatusWorkflow } from "../transition-order-business-status"

/*
  WHAT TURNS THIS RED (card dfb79916): the REAL status-transition workflow not crediting the earned points when an order becomes
  "Megrendelés lezárva" (the step dropped from the workflow, or fired before the status change); any other status crediting;
  a credit failure failing the status change that already happened; the order's status not changing when the credit fails.
  Run with the real workflow engine and a stand-in container, so the wiring is measured, not only the pieces.
*/
const run = async (to: string, opts: { accrue?: jest.Mock; rows?: unknown[] } = {}) => {
  const calls: string[] = []
  const accrue = opts.accrue ?? jest.fn(async (i: { points: number }) => ({ balance: i.points, points: i.points, repeated: false }))
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const container = createContainer()
  container.register({
    // the order's payment lock (card efcd5add): one run here, so it only passes the job through
    locking: asValue({ execute: async (_key: unknown, job: () => Promise<unknown>) => job() }),
    logger: asValue(logger),
    [ORDER_BUSINESS_STATUS_MODULE]: asValue({
      assertTransitionAllowed: async () => void calls.push("assert"),
      transitionOrderBusinessStatus: async (input: { to: string }) => {
        calls.push("transition")
        return { id: "obs_1", status: input.to }
      },
    }),
    [COMMERCE_SETTINGS_MODULE]: asValue({ listCommerceSettings: async () => opts.rows ?? [{ key: "loyalty_accrual_enabled", value: "1" }] }),
    query: asValue({
      graph: async () => ({
        data: [{ id: "order_1", customer_id: "cus_1", total: 10_000, credit_line_total: 0, items: [{ total: 10_000, unit_price: 10_000 }] }],
      }),
    }),
    [Modules.CUSTOMER]: asValue({ retrieveCustomer: async () => ({ id: "cus_1", has_account: true }) }),
    [LOYALTY_MODULE]: asValue({
      accruePoints: async (input: unknown) => {
        calls.push("accrue")
        return accrue(input as never)
      },
    }),
  })
  const { result } = await transitionOrderBusinessStatusWorkflow(container as never).run({
    input: { order_id: "order_1", to: to as never, actor: "admin", source: "admin" },
  })
  return { result, calls, accrue, logger }
}

describe("transitionOrderBusinessStatusWorkflow credits the loyalty accrual", () => {
  it("closing an order credits its points AFTER the status changed", async () => {
    const { result, calls, accrue } = await run("closed")
    expect(result).toMatchObject({ status: "closed" })
    expect(accrue).toHaveBeenCalledWith({ customer_id: "cus_1", order_id: "order_1", points: 300 })
    expect(calls.indexOf("transition")).toBeGreaterThanOrEqual(0)
    expect(calls.indexOf("accrue")).toBeGreaterThan(calls.indexOf("transition"))
  })

  it("any other status credits nothing", async () => {
    const { accrue, calls } = await run("confirmed")
    expect(accrue).not.toHaveBeenCalled()
    expect(calls).toContain("transition")
  })

  it("a failing credit does not fail the status change, and is logged with what to credit by hand", async () => {
    const { result, logger } = await run("closed", { accrue: jest.fn(async () => Promise.reject(new Error("db down"))) })
    expect(result).toMatchObject({ status: "closed" })
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Credit them by hand"))
  })

  it("with the switch off the status changes and nothing is credited", async () => {
    const { result, accrue } = await run("closed", { rows: [] })
    expect(result).toMatchObject({ status: "closed" })
    expect(accrue).not.toHaveBeenCalled()
  })
})
