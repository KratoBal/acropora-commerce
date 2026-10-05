const transitionRun = jest.fn(async () => ({ result: {} }))
jest.mock("../../../transition-order-business-status", () => ({
  transitionOrderBusinessStatusWorkflow: jest.fn(() => ({ run: transitionRun })),
}))

import { config } from "../../../../jobs/order-payment-deadlines"
import { deadlineOperations } from "../operations"

/**
 * THE JOB'S MEDUSA SIDE. What must fail: the candidates cut at one page (an
 * order past the 200th never reminded or closed); the window not on
 * `updated_at` (a link written today on an old order missed); the close not
 * the system's payment-deadline step; the job not hourly.
 */
describe("deadlineOperations", () => {
  it("reads every page of orders changed since the window's start", async () => {
    const calls: any[] = []
    const graph = jest.fn(async (input: any) => {
      calls.push(input)
      const start = input.pagination.skip
      const count = start === 0 ? 200 : 3
      return { data: Array.from({ length: count }, (_, i) => ({ id: `order_${start + i}`, display_id: start + i, metadata: null })) }
    })
    const ops = deadlineOperations({ resolve: (key: string) => (key === "query" ? { graph } : { warn: jest.fn() }) } as never)
    const since = new Date("2026-09-28T10:00:00.000Z")
    const sides = await ops.candidates(since)
    expect(sides).toHaveLength(203)
    expect(calls.map((call) => call.pagination.skip)).toEqual([0, 200])
    expect(calls[0].filters).toEqual({ updated_at: { $gte: since } })
  })

  it("closes as the system, for the payment deadline", async () => {
    const ops = deadlineOperations({ resolve: () => ({ warn: jest.fn() }) } as never)
    await ops.close("order_1")
    expect(transitionRun).toHaveBeenCalledWith({
      input: { order_id: "order_1", to: "closed_unsuccessfully", actor: "system", source: "payment_deadline" },
    })
  })

  it("the job runs hourly", () => {
    expect(config).toEqual({ name: "order-payment-deadlines", schedule: "0 * * * *" })
  })
})
