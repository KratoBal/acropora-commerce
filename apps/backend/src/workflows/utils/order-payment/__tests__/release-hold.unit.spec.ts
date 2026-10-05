import { MedusaError } from "@medusajs/framework/utils"

import { STRIPE_PROVIDER_ID } from "../../stripe-config"
import { type ReleaseHoldOperations, type ReleaseSide, releaseHold } from "../release-hold"
import { ORDER_PAYMENT_METADATA_KEY } from "../state"

/**
 * "CSÚSZIK A SZÁLLÍTÁS": THE CARD HOLD RELEASED (brief, point 3; acrobot
 * 26483, decision 3: a mixed cart's pair together).
 *
 * What must fail:
 * - the Stripe intent not canceled, or the state written without the cancel;
 * - a mixed cart's pickup half left held, or its joined payment canceled
 *   before the shipped one (the one holding the intent);
 * - a captured, cash or editing order released;
 * - a second press releasing (or mailing) again;
 * - a half-done release leaving no state (Kiszállítás would let the order go
 *   unpaid), or not finishing on the next press;
 * - a refused first cancel leaving the order marked as waiting for payment;
 * - the other metadata keys lost.
 */
const NOW = new Date("2026-10-05T19:00:00.000Z")

type Payment = ReleaseSide["payments"][number]
const payment = (facts: Partial<Payment> = {}): Payment => ({
  id: "pay_1",
  provider_id: STRIPE_PROVIDER_ID,
  amount: 22150,
  created_at: "2026-10-05T08:00:00.000Z",
  canceled_at: null,
  captured: 0,
  captured_at: null,
  data: { id: "pi_1" },
  collection_id: "pay_col_1",
  collection_status: "authorized",
  ...facts,
})
const order = (id: string, display: number, payments: Payment[], metadata: Record<string, unknown> = {}): ReleaseSide => ({
  order_id: id,
  display_id: display,
  metadata: { kept: "yes", ...metadata },
  payments,
})

const SHARE = { transactionId: "pi_joint", total: 21950, own: 4950 }
const shippedHalf = (facts: Partial<Payment> = {}) =>
  order("order_ship", 45, [
    payment({ id: "pay_ship", amount: 4950, data: { id: "pi_joint", stripe_share: SHARE }, collection_id: "col_ship", ...facts }),
  ])
const pickupHalf = (facts: Partial<Payment> = {}) =>
  order("order_pick", 46, [
    payment({
      id: "pay_pick",
      amount: 17000,
      data: { stripe_share: { ...SHARE, own: 17000, joined: true } },
      collection_id: "col_pick",
      ...facts,
    }),
  ])

const opsFor = (
  pair: { primary: ReleaseSide; pickup: ReleaseSide | null } | null,
  failCancel: (id: string) => boolean = () => false
) => {
  const log: string[] = []
  const metadata = new Map<string, Record<string, unknown>>()
  const ops: ReleaseHoldOperations = {
    loadPair: async () => pair,
    cancelPayment: async (id) => {
      if (failCancel(id)) {
        log.push(`cancel ${id} FAILED`)
        throw new Error("Stripe refused")
      }
      log.push(`cancel ${id}`)
    },
    cancelCollection: async (id) => {
      log.push(`collection ${id}`)
    },
    setMetadata: async (id, value) => {
      const state = value[ORDER_PAYMENT_METADATA_KEY] as Record<string, unknown> | undefined
      log.push(`state ${id} ${state ? (state.released_at ? "released" : "releasing") : "none"}`)
      metadata.set(id, value)
    },
  }
  return { ops, log, metadata }
}

describe("releaseHold", () => {
  it("a plain card order: state first, the Stripe cancel, the collection, then released", async () => {
    const { ops, log, metadata } = opsFor({ primary: order("order_1", 44, [payment()]), pickup: null })
    expect(await releaseHold("order_1", ops, () => NOW)).toEqual({
      state: "awaiting_payment",
      released: true,
      amount: 22150,
      released_at: NOW.toISOString(),
      orders: [{ order_id: "order_1", display_id: 44 }],
    })
    expect(log).toEqual(["state order_1 releasing", "cancel pay_1", "collection pay_col_1", "state order_1 released"])
    expect(metadata.get("order_1")).toEqual({
      kept: "yes",
      [ORDER_PAYMENT_METADATA_KEY]: {
        state: "awaiting_payment",
        releasing_at: NOW.toISOString(),
        released_at: NOW.toISOString(),
        released_amount: 22150,
      },
    })
  })

  it("a mixed cart's pair together, the intent-holding shipped payment first, whichever half is asked", async () => {
    const { ops, log, metadata } = opsFor({ primary: shippedHalf(), pickup: pickupHalf() })
    const result = await releaseHold("order_pick", ops, () => NOW)
    expect(result.amount).toBe(4950 + 17000)
    expect(result.orders).toEqual([
      { order_id: "order_ship", display_id: 45 },
      { order_id: "order_pick", display_id: 46 },
    ])
    expect(log.filter((line) => line.startsWith("cancel"))).toEqual(["cancel pay_ship", "cancel pay_pick"])
    expect(log.filter((line) => line.startsWith("collection")).sort()).toEqual(["collection col_pick", "collection col_ship"])
    expect((metadata.get("order_pick")?.[ORDER_PAYMENT_METADATA_KEY] as any).released_amount).toBe(17000)
    expect((metadata.get("order_ship")?.[ORDER_PAYMENT_METADATA_KEY] as any).released_amount).toBe(4950)
  })

  it("orders by the share, not by the list: a joined payment listed first is still canceled last", async () => {
    const primary = order("order_ship", 45, [
      pickupHalf().payments[0],
      ...shippedHalf().payments,
    ])
    const { ops, log } = opsFor({ primary, pickup: null })
    await releaseHold("order_ship", ops, () => NOW)
    expect(log.filter((line) => line.startsWith("cancel"))).toEqual(["cancel pay_ship", "cancel pay_pick"])
  })

  it("refuses a captured, a cash and an editing order, with a 409 and nothing touched", async () => {
    const cases: [ReleaseSide, RegExp][] = [
      [order("o", 1, [payment({ captured: 22150 })]), /már levontuk/],
      [order("o", 1, [payment({ provider_id: "pp_system_default" })]), /nincs kártyás zárolás/],
      [order("o", 1, [payment({ canceled_at: "2026-10-05T09:00:00.000Z" })]), /nincs kártyás zárolás/],
      [order("o", 1, [payment({ collection_status: "awaiting" })]), /szerkesztése épp most fut/],
    ]
    for (const [side, message] of cases) {
      const { ops, log } = opsFor({ primary: side, pickup: null })
      const error = await releaseHold("o", ops, () => NOW).catch((caught) => caught)
      expect(error).toBeInstanceOf(MedusaError)
      expect(error.type).toBe(MedusaError.Types.CONFLICT)
      expect(error.message).toMatch(message)
      expect(log).toEqual([])
    }
  })

  it("an unknown order is a 404", async () => {
    const { ops } = opsFor(null)
    await expect(releaseHold("nope", ops)).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
  })

  it("pressed again after a release: not an error, nothing canceled or written again", async () => {
    const released = {
      [ORDER_PAYMENT_METADATA_KEY]: {
        state: "awaiting_payment",
        releasing_at: "2026-10-05T18:00:00.000Z",
        released_at: "2026-10-05T18:00:00.000Z",
        released_amount: 22150,
      },
    }
    const side = order("order_1", 44, [payment({ canceled_at: "2026-10-05T18:00:00.000Z" })], released)
    const { ops, log } = opsFor({ primary: side, pickup: null })
    expect(await releaseHold("order_1", ops, () => NOW)).toMatchObject({
      state: "awaiting_payment",
      released: false,
      amount: 22150,
      released_at: "2026-10-05T18:00:00.000Z",
    })
    expect(log).toEqual([])
  })

  it("a link already sent is another path: refused, not released again", async () => {
    const side = order("order_1", 44, [], { [ORDER_PAYMENT_METADATA_KEY]: { state: "link_sent" } })
    const { ops, log } = opsFor({ primary: side, pickup: null })
    await expect(releaseHold("order_1", ops)).rejects.toMatchObject({ type: MedusaError.Types.CONFLICT })
    expect(log).toEqual([])
  })

  it("a release stopped half way finishes on the next press, keeping its amount and start", async () => {
    const releasing = (amount: number) => ({
      [ORDER_PAYMENT_METADATA_KEY]: { state: "awaiting_payment", releasing_at: "2026-10-05T18:00:00.000Z", released_amount: amount },
    })
    // the shipped payment was canceled; the pickup's and both collections were not
    const primary = order(
      "order_ship",
      45,
      [{ ...shippedHalf().payments[0], canceled_at: "2026-10-05T18:00:01.000Z" }],
      releasing(4950)
    )
    const pickup = { ...pickupHalf(), metadata: { kept: "yes", ...releasing(17000) } }
    const { ops, log, metadata } = opsFor({ primary, pickup })
    const result = await releaseHold("order_ship", ops, () => NOW)
    expect(result).toMatchObject({ released: true, amount: 21950, released_at: NOW.toISOString() })
    expect(log).toEqual([
      "cancel pay_pick",
      "collection col_ship",
      "collection col_pick",
      "state order_ship released",
      "state order_pick released",
    ])
    expect((metadata.get("order_ship")?.[ORDER_PAYMENT_METADATA_KEY] as any).releasing_at).toBe("2026-10-05T18:00:00.000Z")
  })

  it("Stripe refusing the first cancel takes the state back: nothing was released", async () => {
    const { ops, log, metadata } = opsFor({ primary: order("order_1", 44, [payment()]), pickup: null }, () => true)
    await expect(releaseHold("order_1", ops, () => NOW)).rejects.toThrow("Stripe refused")
    expect(log).toEqual(["state order_1 releasing", "cancel pay_1 FAILED", "state order_1 none"])
    expect(metadata.get("order_1")).toEqual({ kept: "yes" })
  })

  it("a later cancel failing leaves the order waiting for payment (the safe side), not released", async () => {
    const { ops, log } = opsFor({ primary: shippedHalf(), pickup: pickupHalf() }, (id) => id === "pay_pick")
    await expect(releaseHold("order_ship", ops, () => NOW)).rejects.toThrow("Stripe refused")
    expect(log).toEqual([
      "state order_ship releasing",
      "state order_pick releasing",
      "cancel pay_ship",
      "cancel pay_pick FAILED",
    ])
  })
})
