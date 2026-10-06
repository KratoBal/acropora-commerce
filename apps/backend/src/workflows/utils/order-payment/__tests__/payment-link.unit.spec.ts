import { MedusaError } from "@medusajs/framework/utils"

import { STRIPE_PROVIDER_ID } from "../../stripe-config"
import { verifyPaymentLink } from "../link-token"
import { type PaymentLinkOperations, sendPaymentLink } from "../payment-link"
import type { ReleaseSide } from "../release-hold"
import { ORDER_PAYMENT_METADATA_KEY } from "../state"

/**
 * "FIZETÉSI LINK KÜLDÉSE" (brief, point 4). What must fail:
 * - a link sent while the card is still held, or for a paid, expired or cash
 *   order;
 * - the link not for the order's CURRENT amount, or for 0 Ft;
 * - the deadline not 6 days (decision 2);
 * - a mixed cart's pickup order left out of the amount or the state;
 * - the token not naming the collection it pays;
 * - the release's facts (released_at) lost from the state.
 */
const SECRET = "teszt-titok-legalabb-harminckettő-karakter"
const CONFIG = { secret: SECRET, storefrontUrl: "https://shop.example.test" }
const NOW = new Date("2026-10-06T10:00:00.000Z")
const released = (amount: number) => ({
  [ORDER_PAYMENT_METADATA_KEY]: {
    state: "awaiting_payment",
    releasing_at: "2026-10-05T19:00:00.000Z",
    released_at: "2026-10-05T19:00:00.000Z",
    released_amount: amount,
  },
})
const card = (facts: Partial<ReleaseSide["payments"][number]> = {}): ReleaseSide["payments"][number] => ({
  id: "pay_1",
  provider_id: STRIPE_PROVIDER_ID,
  amount: 11650,
  created_at: "2026-10-05T08:00:00.000Z",
  canceled_at: "2026-10-05T19:00:00.000Z",
  captured: 0,
  data: null,
  collection_id: "col_old",
  collection_status: "canceled",
  ...facts,
})
const order = (id: string, display: number, metadata: Record<string, unknown>, payments = [card()]): ReleaseSide => ({
  order_id: id,
  display_id: display,
  metadata: { kept: "yes", ...metadata },
  payments,
})

const opsFor = (
  pair: { primary: ReleaseSide; pickup: ReleaseSide | null } | null,
  collections: Record<string, { id: string; amount: number } | null>
) => {
  const written = new Map<string, Record<string, unknown>>()
  const ops: PaymentLinkOperations = {
    loadPair: async () => pair,
    ensureCollection: async (orderId) => collections[orderId] ?? null,
    setMetadata: async (id, metadata) => void written.set(id, metadata),
  }
  return { ops, written }
}

describe("sendPaymentLink", () => {
  it("a released order: a link for its current total, 6 days, the state link_sent", async () => {
    const { ops, written } = opsFor(
      { primary: order("order_1", 48, released(11650)), pickup: null },
      { order_1: { id: "col_new", amount: 9800 } }
    )
    const sent = await sendPaymentLink("order_1", ops, CONFIG, () => NOW)

    expect(sent.state).toBe("link_sent")
    expect(sent.link.amount).toBe(9800)
    expect(sent.link.expires_at).toBe("2026-10-12T10:00:00.000Z")
    expect(sent.link.url).toMatch(/^https:\/\/shop\.example\.test\/hu\/rendeles-fizetese\/[^/]+$/)
    const token = sent.link.url.split("/").at(-1)!
    expect(verifyPaymentLink(token, SECRET)).toEqual({
      order_id: "order_1",
      collection_id: "col_new",
      amount: 9800,
      expires_at: Date.parse("2026-10-12T10:00:00.000Z"),
    })
    expect(written.get("order_1")).toEqual({
      kept: "yes",
      [ORDER_PAYMENT_METADATA_KEY]: {
        ...released(11650)[ORDER_PAYMENT_METADATA_KEY],
        state: "link_sent",
        link: {
          collection_id: "col_new",
          pickup_collection_id: null,
          sent_at: NOW.toISOString(),
          expires_at: "2026-10-12T10:00:00.000Z",
          reminded_at: null,
          amount: 9800,
          url: sent.link.url,
        },
      },
    })
  })

  it("a split-off card order (C/3): no hold ever, a link for its own total, its split facts kept", async () => {
    const split = { [ORDER_PAYMENT_METADATA_KEY]: { state: "awaiting_payment", kind: "split", split_at: "2026-10-06T07:00:00.000Z" } }
    const { ops, written } = opsFor({ primary: order("order_B", 202, split, []), pickup: null }, { order_B: { id: "col_B", amount: 4200 } })
    const sent = await sendPaymentLink("order_B", ops, CONFIG, () => NOW)
    expect(sent.link.amount).toBe(4200)
    expect(written.get("order_B")).toMatchObject({
      [ORDER_PAYMENT_METADATA_KEY]: { kind: "split", split_at: "2026-10-06T07:00:00.000Z", state: "link_sent", link: { collection_id: "col_B" } },
    })
  })

  it("a mixed cart: both orders' totals in one link, both orders link_sent", async () => {
    const { ops, written } = opsFor(
      { primary: order("order_ship", 45, released(4950)), pickup: order("order_pick", 46, released(17000)) },
      { order_ship: { id: "col_ship", amount: 4950 }, order_pick: { id: "col_pick", amount: 17000 } }
    )
    const sent = await sendPaymentLink("order_pick", ops, CONFIG, () => NOW)
    expect(sent.link.amount).toBe(21950)
    expect(sent.orders).toEqual([
      { order_id: "order_ship", display_id: 45, amount: 4950 },
      { order_id: "order_pick", display_id: 46, amount: 17000 },
    ])
    for (const id of ["order_ship", "order_pick"]) {
      const state = written.get(id)?.[ORDER_PAYMENT_METADATA_KEY] as any
      expect(state.state).toBe("link_sent")
      expect(state.link).toMatchObject({ collection_id: "col_ship", pickup_collection_id: "col_pick", amount: 21950 })
    }
    // each order keeps its own released part
    expect((written.get("order_pick")?.[ORDER_PAYMENT_METADATA_KEY] as any).released_amount).toBe(17000)
  })

  it("sent again: a new link with a new deadline", async () => {
    const first = opsFor({ primary: order("order_1", 48, released(1)), pickup: null }, { order_1: { id: "c", amount: 100 } })
    const a = await sendPaymentLink("order_1", first.ops, CONFIG, () => NOW)
    const later = new Date(NOW.getTime() + 60_000)
    const b = await sendPaymentLink("order_1", first.ops, CONFIG, () => later)
    expect(b.link.url).not.toBe(a.link.url)
    expect(Date.parse(b.link.expires_at) - Date.parse(a.link.expires_at)).toBe(60_000)
  })

  it("refuses a held, a paid, an expired, a cash and an empty order, writing nothing", async () => {
    const cases: [ReleaseSide, RegExp][] = [
      [order("o", 1, {}, [card({ canceled_at: null, collection_status: "authorized" })]), /még zárolva/],
      [order("o", 1, {}, [card({ canceled_at: null, captured: 11650 })]), /már kifizették/],
      [order("o", 1, { [ORDER_PAYMENT_METADATA_KEY]: { state: "paid", released_at: "x" } }), /már kifizették/],
      [order("o", 1, { [ORDER_PAYMENT_METADATA_KEY]: { state: "expired", released_at: "x" } }), /lejárt/],
      [order("o", 1, {}, [card({ canceled_at: null, provider_id: "pp_system_default" })]), /nem kártyás/],
      [order("o", 1, {}, []), /nem kártyás/],
      [order("o", 1, released(5)), /0 Ft/],
    ]
    for (const [side, message] of cases) {
      const { ops, written } = opsFor({ primary: side, pickup: null }, { o: { id: "c", amount: 0 } })
      const error = await sendPaymentLink("o", ops, CONFIG, () => NOW).catch((caught) => caught)
      expect(error).toBeInstanceOf(MedusaError)
      expect(error.message).toMatch(message)
      expect(written.size).toBe(0)
    }
  })
})
