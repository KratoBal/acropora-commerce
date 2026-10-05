import { STRIPE_PROVIDER_ID } from "../../stripe-config"
import { signPaymentLink } from "../link-token"
import { type PayByLinkOperations, completeLinkPayment } from "../pay-by-link"
import { type PaymentLinkOperations, sendPaymentLink } from "../payment-link"
import type { ReleaseSide } from "../release-hold"
import {
  ORDER_PAYMENT_METADATA_KEY,
  type OrderPaymentFacts,
  differenceOf,
  orderPaymentView,
  refuseWhileAwaitingPayment,
} from "../state"

/**
 * AN ITEM ADDED OVER THE HOLD (Balázs 2026-10-05 18:01 UTC; plan section 5):
 * one order, two payments, the hold and the difference.
 *
 * What must fail:
 * - the paid difference taken for the hold (the order read as captured,
 *   Kiszállítás never taking the hold);
 * - the difference not counted, or counted twice once paid;
 * - Kiszállítás let through while it is unpaid;
 * - the difference link reopening the hold's collection (Medusa would cancel
 *   the hold);
 * - the link's payment capturing the hold;
 * - a link sent before an edit still shown after the edit moved the
 *   difference.
 */
const hold = (facts: Partial<OrderPaymentFacts> = {}): OrderPaymentFacts => ({
  id: "pay_hold",
  provider_id: STRIPE_PROVIDER_ID,
  amount: 14000,
  created_at: "2026-10-05T08:00:00.000Z",
  canceled_at: null,
  captured: 0,
  captured_at: null,
  ...facts,
})
const difference = (facts: Partial<OrderPaymentFacts> = {}): OrderPaymentFacts =>
  hold({ id: "pay_diff", amount: 2500, created_at: "2026-10-06T10:00:00.000Z", ...facts })
const stored = (value: Record<string, unknown>) => ({ [ORDER_PAYMENT_METADATA_KEY]: value })
const link = (amount: number) => ({
  collection_id: "col_diff",
  pickup_collection_id: null,
  sent_at: "2026-10-06T10:00:00.000Z",
  expires_at: "2026-10-12T10:00:00.000Z",
  reminded_at: null,
  amount,
  url: "https://shop.example.test/hu/rendeles-fizetese/t",
})

describe("the difference over a hold", () => {
  it("counts what the hold and the paid differences do not cover", () => {
    expect(differenceOf({ payments: [hold()], total: 16500 })).toBe(2500)
    expect(differenceOf({ payments: [hold()], total: 12000 })).toBe(0)
    expect(differenceOf({ payments: [hold(), difference({ captured: 2500 })], total: 16500 })).toBe(0)
    expect(differenceOf({ payments: [hold(), difference({ captured: 2000 })], total: 16500 })).toBe(500)
    // a canceled difference payment paid nothing
    expect(differenceOf({ payments: [hold(), difference({ captured: 2500, canceled_at: "x" })], total: 16500 })).toBe(2500)
  })

  it("the hold is the uncaptured payment, whichever is listed first", () => {
    const view = orderPaymentView({ metadata: null, payments: [difference({ captured: 2500 }), hold()], total: 16500 })
    expect(view).toMatchObject({ state: "hold", hold: { amount: 14000 }, due: null })
  })

  it("of two uncaptured payments the hold is the earlier (a link's authorized this second)", () => {
    const view = orderPaymentView({ metadata: null, payments: [difference(), hold()], total: 16500 })
    expect(view.hold).toMatchObject({ amount: 14000, authorized_at: "2026-10-05T08:00:00.000Z" })
  })

  it("unpaid: waiting for payment, the hold kept, due the difference; with its link, link_sent", () => {
    expect(orderPaymentView({ metadata: null, payments: [hold()], total: 16500 })).toMatchObject({
      state: "awaiting_payment",
      hold: { amount: 14000 },
      link: null,
      due: { amount: 2500, reason: "difference" },
    })
    const sent = stored({ kind: "difference", state: "link_sent", link: link(2500) })
    expect(orderPaymentView({ metadata: sent, payments: [hold()], total: 16500 })).toMatchObject({
      state: "link_sent",
      hold: { amount: 14000 },
      link: { amount: 2500 },
      due: { amount: 2500, reason: "difference" },
    })
  })

  it("an edit since moved the difference: the old link is not shown, the order waits for a new one", () => {
    const sent = stored({ kind: "difference", state: "link_sent", link: link(2500) })
    expect(orderPaymentView({ metadata: sent, payments: [hold()], total: 17000 })).toMatchObject({
      state: "awaiting_payment",
      link: null,
      due: { amount: 3000, reason: "difference" },
    })
  })

  it("paid: back to hold, nothing due", () => {
    const paid = stored({ kind: "difference", state: "paid", paid_at: "2026-10-06T11:00:00.000Z", link: link(2500) })
    expect(
      orderPaymentView({ metadata: paid, payments: [hold(), difference({ captured: 2500 })], total: 16500 })
    ).toMatchObject({ state: "hold", due: null })
  })

  it("a released hold's due is the released kind", () => {
    const released = stored({ state: "awaiting_payment", released_at: "x" })
    expect(orderPaymentView({ metadata: released, payments: [], total: 9800 }).due).toEqual({
      amount: 9800,
      reason: "released",
    })
  })

  it("Kiszállítás waits for a sent difference link, with the difference's own words", () => {
    expect(() => refuseWhileAwaitingPayment(stored({ kind: "difference", state: "link_sent", link: link(2500) }))).toThrow(
      /különbözet még nincs kifizetve/
    )
    expect(() => refuseWhileAwaitingPayment(stored({ kind: "difference", state: "paid" }))).not.toThrow()
  })
})

const SECRET = "teszt-titok-legalabb-harminckettő-karakter"
const CONFIG = { secret: SECRET, storefrontUrl: "https://shop.example.test" }
const NOW = new Date("2026-10-06T10:00:00.000Z")
const side = (metadata: Record<string, unknown> = {}, payments = [hold()], total = 16500): ReleaseSide => ({
  order_id: "order_1",
  display_id: 50,
  total,
  metadata: { kept: "yes", ...metadata },
  payments: payments.map((payment) => ({ ...payment, data: null, collection_id: "col_hold", collection_status: "authorized" })),
})

describe("sendPaymentLink for a difference", () => {
  const opsFor = (pair: { primary: ReleaseSide; pickup: ReleaseSide | null }) => {
    const log: string[] = []
    const written = new Map<string, Record<string, unknown>>()
    const ops: PaymentLinkOperations = {
      loadPair: async () => pair,
      ensureCollection: async () => {
        log.push("ensure")
        return { id: "col_hold", amount: 16500 }
      },
      openCollection: async (orderId, amount) => {
        log.push(`open ${orderId} ${amount}`)
        return { id: "col_diff", amount }
      },
      setMetadata: async (id, metadata) => void written.set(id, metadata),
    }
    return { ops, log, written }
  }

  it("a new collection for the difference only; the hold's collection untouched", async () => {
    const { ops, log, written } = opsFor({ primary: side(), pickup: null })
    const sent = await sendPaymentLink("order_1", ops, CONFIG, () => NOW)
    expect(log).toEqual(["open order_1 2500"])
    expect(sent.link.amount).toBe(2500)
    expect(sent.orders).toEqual([{ order_id: "order_1", display_id: 50, amount: 2500 }])
    expect(written.get("order_1")).toEqual({
      kept: "yes",
      [ORDER_PAYMENT_METADATA_KEY]: {
        kind: "difference",
        state: "link_sent",
        link: { ...link(2500), url: sent.link.url },
      },
    })
  })

  it("a held order without a difference gets no link", async () => {
    const { ops, log } = opsFor({ primary: side({}, [hold()], 14000), pickup: null })
    await expect(sendPaymentLink("order_1", ops, CONFIG, () => NOW)).rejects.toThrow(/még zárolva/)
    expect(log).toEqual([])
  })
})

describe("paying a difference link", () => {
  it("captures the link's own collection, not the hold, and the order is back to hold", async () => {
    const sent = { kind: "difference", state: "link_sent", link: link(2500) }
    const log: string[] = []
    const written = new Map<string, Record<string, unknown>>()
    const ops: PayByLinkOperations = {
      loadPair: async () => ({ primary: side(stored(sent)), pickup: null }),
      collection: async (id) => ({
        id,
        amount: 2500,
        status: "not_paid",
        sessions: [{ id: "ps_1", provider_id: STRIPE_PROVIDER_ID, status: "pending", data: null, created_at: null }],
      }),
      startSession: async () => null,
      authorizeSession: async () => true,
      capture: async (id) => void log.push(`capture order ${id}`),
      captureCollection: async (id) => void log.push(`capture collection ${id}`),
      setMetadata: async (id, metadata) => void written.set(id, metadata),
    }
    const token = signPaymentLink(
      { order_id: "order_1", collection_id: "col_diff", amount: 2500, expires_at: Date.parse("2026-10-12T10:00:00.000Z") },
      SECRET
    )
    await completeLinkPayment(token, ops, SECRET, () => new Date("2026-10-07T10:00:00.000Z"))
    expect(log).toEqual(["capture collection col_diff"])
    expect((written.get("order_1")?.[ORDER_PAYMENT_METADATA_KEY] as any)).toMatchObject({ kind: "difference", state: "paid" })
  })
})
