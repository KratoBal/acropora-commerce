const updateRun = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  ...jest.requireActual("@medusajs/medusa/core-flows"),
  updateOrderWorkflow: jest.fn(() => ({ run: updateRun })),
}))

import { POST } from "../../../api/admin/order-manual-refund/[order_id]/settle/route"
import { AdminPostManualRefundSettle } from "../../../api/admin/order-manual-refund/validators"
import middlewares from "../../../api/middlewares"
import { GIVEN_BACK_METADATA_KEY } from "../cancel-on-unsuccessful-close"
import {
  SETTLED_BY_MAX,
  SETTLED_NOTE_MAX,
  cleanSettleText,
  decideSettle,
  settleManualRefund,
} from "../manual-refund-settle"

/*
  WHAT TURNS THIS RED (task commerce-kezi-refund-rendezve-20261125, card abf3f8f4; measured in the code 2026-11-25: a refund started in the
  Stripe dashboard is invisible to the shop, so the "Kézi visszatérítés kell" notice stayed for ever): the settle writing anything but the
  mark's own key, or a partial mark (a nested object is REPLACED, so the credit lines and the amount must ride along); a second press changing
  who and when (the FIRST settlement is the record); an order without the mark, or with a zero amount, settled all the same; an order the shop
  already shows refunded settled by hand; an empty `settled_by`, an unknown field or a long note accepted; control characters kept in the text;
  the route not answering 404 / 409 / the stored who and when; the endpoint not behind its validator.
*/
const NOW = new Date("2026-11-25T09:40:00.000Z")
const mark = (over: Record<string, unknown> = {}) => ({
  credit_lines: 1,
  captured_unrefunded: 40700,
  at: "2026-11-24T20:11:59.001Z",
  ...over,
})
const meta = (over: Record<string, unknown> = {}) => ({ acropora_payment: { state: "x" }, [GIVEN_BACK_METADATA_KEY]: mark(over) })
const input = { settled_by: "Kiss Anna", note: "Stripe irányítópult, re_123" }

describe("decideSettle", () => {
  it("writes who and when ON the mark, keeping its credit lines, amount and time", () => {
    const decision = decideSettle(meta(), 40700, input, NOW)
    expect(decision).toEqual({
      action: "settle",
      mark: { ...mark(), settled_at: NOW.toISOString(), settled_by: "Kiss Anna", settled_note: "Stripe irányítópult, re_123" },
    })
  })

  it("an order without the mark, or with a zero or broken amount, has nothing to settle", () => {
    for (const m of [null, undefined, {}, { [GIVEN_BACK_METADATA_KEY]: "x" }, { [GIVEN_BACK_METADATA_KEY]: [] }, meta({ captured_unrefunded: 0 }), meta({ captured_unrefunded: "nem szám" })])
      expect(decideSettle(m as never, 40700, input, NOW)).toEqual({ action: "no_mark" })
  })

  it("a second press answers the FIRST settlement: who and when do not change", () => {
    const first = decideSettle(meta(), 40700, input, NOW)
    expect(first.action).toBe("settle")
    const again = decideSettle(
      { [GIVEN_BACK_METADATA_KEY]: (first as { mark: Record<string, unknown> }).mark },
      40700,
      { settled_by: "Valaki Más", note: "másik" },
      new Date("2026-11-26T10:00:00.000Z")
    )
    expect(again.action).toBe("already")
    expect((again as { mark: Record<string, unknown> }).mark).toMatchObject({ settled_by: "Kiss Anna", settled_at: NOW.toISOString() })
  })

  it("an order the shop already shows refunded has nothing to settle by hand; unreadable figures do not block", () => {
    expect(decideSettle(meta(), 0, input, NOW)).toEqual({ action: "nothing_outstanding" })
    expect(decideSettle(meta(), -5, input, NOW)).toEqual({ action: "nothing_outstanding" })
    expect(decideSettle(meta(), null, input, NOW).action).toBe("settle")
  })

  it("the note is optional; the text is one clean short line", () => {
    const noNote = decideSettle(meta(), 40700, { settled_by: "Kiss Anna" }, NOW) as { mark: Record<string, unknown> }
    expect("settled_note" in noNote.mark).toBe(false)
    expect(cleanSettleText("  a\nb\tc\u0007d  ", 50)).toBe("a b c d")
    expect(cleanSettleText("x".repeat(500), SETTLED_NOTE_MAX)).toHaveLength(SETTLED_NOTE_MAX)
    expect(cleanSettleText("   ", 50)).toBeNull()
    expect(cleanSettleText(undefined, 50)).toBeNull()
  })
})

const world = (order: { metadata: Record<string, unknown> | null; outstanding?: number } | null) => {
  updateRun.mockReset().mockResolvedValue({ result: {} })
  const container = {
    resolve: (key: string) => {
      if (key === "query")
        return {
          graph: async (args: { entity: string; fields: string[] }) => {
            if (!order) return { data: [] }
            if (args.fields.some((field) => field.startsWith("payment_collections")))
              return {
                data: [
                  {
                    id: "order_1",
                    status: "pending",
                    fulfillments: [],
                    payment_collections: [
                      {
                        payments: [
                          {
                            id: "pay_1",
                            data: {},
                            canceled_at: null,
                            captures: [{ amount: order.outstanding ?? 40700 }],
                            refunds: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              }
            return { data: [{ id: "order_1", metadata: order.metadata }] }
          },
        }
      throw new Error(`unexpected ${key}`)
    },
  } as never
  return container
}

describe("settleManualRefund", () => {
  it("writes ONLY the mark's key, with the WHOLE mark, and the user id; answers who and when", async () => {
    const container = world({ metadata: meta() })
    const result = await settleManualRefund(container, "order_1", input, "user_1", NOW)
    expect(result).toEqual({ status: "settled", settled_at: NOW.toISOString(), settled_by: "Kiss Anna", settled_note: "Stripe irányítópult, re_123" })
    expect(updateRun).toHaveBeenCalledTimes(1)
    const sent = updateRun.mock.calls[0]![0].input
    expect(sent.id).toBe("order_1")
    expect(sent.user_id).toBe("user_1")
    expect(Object.keys(sent.metadata)).toEqual([GIVEN_BACK_METADATA_KEY])
    expect(sent.metadata[GIVEN_BACK_METADATA_KEY]).toEqual({
      ...mark(),
      settled_at: NOW.toISOString(),
      settled_by: "Kiss Anna",
      settled_note: "Stripe irányítópult, re_123",
    })
  })

  it("a second press writes nothing and answers the first settlement", async () => {
    const settled = meta({ settled_at: "2026-11-25T09:00:00.000Z", settled_by: "Első", settled_note: "x" })
    const container = world({ metadata: settled })
    const result = await settleManualRefund(container, "order_1", input, "user_1", NOW)
    expect(result).toEqual({ status: "already", settled_at: "2026-11-25T09:00:00.000Z", settled_by: "Első", settled_note: "x" })
    expect(updateRun).not.toHaveBeenCalled()
  })

  it("no order, no mark, or the shop already showing the money back: nothing is written", async () => {
    expect(await settleManualRefund(world(null), "order_1", input, "u", NOW)).toEqual({ status: "not_found" })
    expect(await settleManualRefund(world({ metadata: {} }), "order_1", input, "u", NOW)).toEqual({ status: "no_mark" })
    expect(await settleManualRefund(world({ metadata: meta(), outstanding: 0 }), "order_1", input, "u", NOW)).toEqual({
      status: "nothing_outstanding",
    })
    expect(updateRun).not.toHaveBeenCalled()
  })
})

describe("the endpoint", () => {
  it("is behind its validator, which accepts only who and a short note", () => {
    const route = (middlewares.routes ?? []).find((r) => r.matcher === "/admin/order-manual-refund/:order_id/settle")
    expect(route?.methods).toEqual(["POST"])
    expect(route?.middlewares).toHaveLength(1)
    expect(AdminPostManualRefundSettle.safeParse({ settled_by: "Kiss Anna" }).success).toBe(true)
    expect(AdminPostManualRefundSettle.safeParse({ settled_by: "Kiss Anna", note: null }).success).toBe(true)
    expect(AdminPostManualRefundSettle.safeParse({ settled_by: "  " }).success).toBe(false)
    expect(AdminPostManualRefundSettle.safeParse({}).success).toBe(false)
    expect(AdminPostManualRefundSettle.safeParse({ settled_by: "x".repeat(SETTLED_BY_MAX + 1) }).success).toBe(false)
    expect(AdminPostManualRefundSettle.safeParse({ settled_by: "a", note: "x".repeat(SETTLED_NOTE_MAX + 1) }).success).toBe(false)
    expect(AdminPostManualRefundSettle.safeParse({ settled_by: "a", metadata: { x: 1 } }).success).toBe(false)
  })

  const call = async (container: never, body = input) => {
    const res = { statusCode: 200, status: jest.fn(function (this: { statusCode: number }, code: number) { this.statusCode = code; return this }), json: jest.fn() }
    await POST({ scope: container, params: { order_id: "order_1" }, validatedBody: body, auth_context: { actor_id: "user_1" } } as never, res as never)
    return res
  }

  it("answers who and when; 404 for no order; 409 (with a sentence) for nothing to settle", async () => {
    const ok = await call(world({ metadata: meta() }))
    expect(ok.json).toHaveBeenCalledWith({
      settled_at: expect.any(String),
      settled_by: "Kiss Anna",
      settled_note: "Stripe irányítópult, re_123",
      already: false,
    })
    const missing = await call(world(null))
    expect(missing.status).toHaveBeenCalledWith(404)
    const none = await call(world({ metadata: {} }))
    expect(none.status).toHaveBeenCalledWith(409)
    expect(none.json).toHaveBeenCalledWith({ message: expect.stringContaining("nincs kézi visszatérítés") })
    const refunded = await call(world({ metadata: meta(), outstanding: 0 }))
    expect(refunded.status).toHaveBeenCalledWith(409)
    expect(refunded.json).toHaveBeenCalledWith({ message: expect.stringContaining("már vissza van térítve") })
  })
})
