import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../modules/order-business-status"
import { GET } from "../[order_id]/route"

/**
 * WHAT TURNS THIS RED (task reopen-nem-felkinalt-20261124; measured on the test shop 2026-11-24: the OS offered "Készletezés" on an order
 * the server then refused to reopen, 422, every time): the reopening still offered on a canceled order or one the close gave points and
 * the card back on; the old label-only close, which CAN be reopened, losing its step; another status losing or gaining a step, or
 * carrying a reason; the reason not being the sentence the transition answers.
 */
const run = async (opts: { status: string; orderStatus?: string; metadata?: Record<string, unknown> | null }) => {
  const sent: { business_status: { next_statuses: { status: string }[]; reopen_refused: string | null } }[] = []
  const scope = {
    resolve: (key: string) => {
      if (key === "notification") return { listNotifications: async () => [] }
      if (key === "query")
        return { graph: async () => ({ data: [{ id: "order_1", status: opts.orderStatus ?? "pending", metadata: opts.metadata ?? null }] }) }
      expect(key).toBe(ORDER_BUSINESS_STATUS_MODULE)
      return {
        retrieveOrderBusinessStatusForOrder: async (id: string) => ({
          status: { order_id: id, status: opts.status, updated_at: new Date("2026-11-24T19:00:00.000Z") },
          history: [],
        }),
        listOrderBusinessStatusModels: async () => [{ status: opts.status }],
      }
    },
  }
  await GET({ params: { order_id: "order_1" }, scope } as never, { json: (body: never) => void sent.push(body) } as never)
  return sent[0]!.business_status
}
const offers = (status: { next_statuses: { status: string }[] }) => status.next_statuses.map((step) => step.status)

describe("the reopening is offered only where the server would allow it", () => {
  it("a canceled order closed unsuccessfully is NOT offered Készletezés, and the reason is the transition's sentence", async () => {
    const status = await run({ status: "closed_unsuccessfully", orderStatus: "canceled" })
    expect(offers(status)).toEqual([])
    expect(status.reopen_refused).toMatch(/le lett mondva.*új rendelés kell/)
  })

  it("an order whose close gave the points and the card back (the marker) is NOT offered it either", async () => {
    const status = await run({
      status: "closed_unsuccessfully",
      metadata: { unsuccessful_close_credits_given_back: { credit_lines: 2, captured_unrefunded: 0 } },
    })
    expect(offers(status)).toEqual([])
    expect(status.reopen_refused).toMatch(/visszajárt.*új rendelés kell/)
  })

  it("an old label-only close (not canceled, no marker) is still offered Készletezés, with no reason", async () => {
    const status = await run({ status: "closed_unsuccessfully" })
    expect(offers(status)).toEqual(["stocking"])
    expect(status.reopen_refused).toBeNull()
  })

  it("any other status is untouched: its steps as the table has them, no reason, even on a canceled order", async () => {
    const stocking = await run({ status: "stocking", orderStatus: "canceled" })
    expect(offers(stocking)).toEqual(["out_for_delivery", "ready_for_pickup", "closed_unsuccessfully"])
    expect(stocking.reopen_refused).toBeNull()
    const pending = await run({ status: "pending_processing" })
    expect(offers(pending)).toEqual(["confirmed", "stocking", "closed_unsuccessfully"])
    expect(pending.reopen_refused).toBeNull()
  })
})
