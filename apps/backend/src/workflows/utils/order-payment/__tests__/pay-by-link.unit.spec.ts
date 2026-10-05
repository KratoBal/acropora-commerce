import { MedusaError } from "@medusajs/framework/utils"

import { signPaymentLink } from "../link-token"
import {
  type LinkCollection,
  type PayByLinkOperations,
  completeLinkPayment,
  resolvePaymentLink,
  startLinkSession,
} from "../pay-by-link"
import type { ReleaseSide } from "../release-hold"
import { ORDER_PAYMENT_METADATA_KEY } from "../state"

/**
 * THE CUSTOMER PAYS THROUGH THE LINK (plan 2.2). What must fail:
 * - a forged token, or an older link, paying;
 * - a link paying after its deadline, after the order changed its amount, or
 *   twice;
 * - a mixed cart paid with two Stripe payments instead of one (the pickup
 *   session not joined to the shipped one's intent);
 * - the money only held, not captured;
 * - an unconfirmed card answered as paid;
 * - the orders not marked paid, or marked before the capture.
 */
const SECRET = "teszt-titok-legalabb-harminckettő-karakter"
const SENT = new Date("2026-10-06T10:00:00.000Z")
const EXPIRES = new Date("2026-10-12T10:00:00.000Z")
const NOW = () => new Date("2026-10-07T10:00:00.000Z")

const link = (over: Record<string, unknown> = {}) => ({
  collection_id: "col_ship",
  pickup_collection_id: null as string | null,
  sent_at: SENT.toISOString(),
  expires_at: EXPIRES.toISOString(),
  reminded_at: null,
  amount: 9800,
  url: "https://shop.example.test/hu/rendeles-fizetese/x",
  ...over,
})
const order = (id: string, state: Record<string, unknown> | null): ReleaseSide => ({
  order_id: id,
  display_id: 48,
  metadata: { kept: "yes", ...(state ? { [ORDER_PAYMENT_METADATA_KEY]: state } : {}) },
  payments: [],
})
const linked = (over: Record<string, unknown> = {}) => ({
  state: "link_sent",
  released_at: "2026-10-05T19:00:00.000Z",
  link: link(over),
})
const tokenFor = (over: Partial<{ order_id: string; collection_id: string; amount: number; expires_at: number }> = {}) =>
  signPaymentLink(
    { order_id: "order_1", collection_id: "col_ship", amount: 9800, expires_at: EXPIRES.getTime(), ...over },
    SECRET
  )
const collection = (id: string, amount: number, sessions: Partial<LinkCollection["sessions"][number]>[] = []) => ({
  id,
  amount,
  status: "not_paid",
  sessions: sessions.map((session, index) => ({
    id: `ps_${id}_${index}`,
    provider_id: "pp_stripe_stripe",
    status: "pending",
    data: null,
    created_at: `2026-10-07T09:0${index}:00.000Z`,
    ...session,
  })),
})

const opsFor = (
  pair: { primary: ReleaseSide; pickup: ReleaseSide | null } | null,
  collections: Record<string, LinkCollection>,
  authorize: (sessionId: string) => boolean | Error = () => true
) => {
  const log: string[] = []
  const written = new Map<string, Record<string, unknown>>()
  const ops: PayByLinkOperations = {
    loadPair: async () => pair,
    collection: async (id) => collections[id] ?? null,
    startSession: async (id, data) => {
      log.push(`session ${id} ${JSON.stringify(data)}`)
      // as the provider answers: share facts only for a joint start
      if ("stripe_joint" in data) {
        return { id: "pi_new", stripe_share: { transactionId: "pi_new", total: 21950, own: 4950, clientSecret: "cs_joint" } }
      }
      return "stripe_joined" in data ? { id: "pi_new" } : { id: "pi_new", client_secret: "cs_plain" }
    },
    authorizeSession: async (id) => {
      const result = authorize(id)
      log.push(`authorize ${id} ${result instanceof Error ? "ERROR" : result}`)
      if (result instanceof Error) throw result
      return result
    },
    capture: async (id) => void log.push(`capture ${id}`),
    setMetadata: async (id, metadata) => {
      log.push(`state ${id}`)
      written.set(id, metadata)
    },
  }
  return { ops, log, written }
}

const plainPair = (state: Record<string, unknown> | null = linked()) => ({ primary: order("order_1", state), pickup: null })

describe("resolvePaymentLink", () => {
  it("open: the newest link, before its deadline, for what the order still owes", async () => {
    const { ops } = opsFor(plainPair(), { col_ship: collection("col_ship", 9800) })
    expect((await resolvePaymentLink(tokenFor(), ops, SECRET, NOW))?.state).toBe("open")
  })

  it("a forged token or a token of another secret is not a link (404)", async () => {
    const { ops } = opsFor(plainPair(), { col_ship: collection("col_ship", 9800) })
    expect(await resolvePaymentLink(`${tokenFor().split(".")[0]}.AAAA`, ops, SECRET, NOW)).toBeNull()
    expect(await resolvePaymentLink(tokenFor(), ops, `${SECRET}x`, NOW)).toBeNull()
    expect(await resolvePaymentLink(tokenFor(), opsFor(null, {}).ops, SECRET, NOW)).toBeNull()
  })

  it("paid, expired by the deadline or by the order's close, superseded by a newer link or an edit", async () => {
    const col = { col_ship: collection("col_ship", 9800) }
    const state = async (pair: ReturnType<typeof plainPair>, token = tokenFor(), collections = col, now = NOW) =>
      (await resolvePaymentLink(token, opsFor(pair, collections).ops, SECRET, now))?.state

    expect(await state(plainPair({ ...linked(), state: "paid" }))).toBe("paid")
    expect(await state(plainPair({ ...linked(), state: "expired" }))).toBe("expired")
    expect(await state(plainPair(), tokenFor(), col, () => new Date(EXPIRES.getTime() + 1))).toBe("expired")
    // a newer link: another deadline, another amount, another collection
    expect(await state(plainPair(linked({ expires_at: "2026-10-13T10:00:00.000Z" })))).toBe("superseded")
    expect(await state(plainPair(linked({ amount: 9000 })))).toBe("superseded")
    expect(await state(plainPair(linked({ collection_id: "col_other" })))).toBe("superseded")
    // the order changed since: its collection owes another amount, or is gone
    expect(await state(plainPair(), tokenFor(), { col_ship: collection("col_ship", 12000) })).toBe("superseded")
    expect(await state(plainPair(), tokenFor(), {})).toBe("superseded")
    expect(await state(plainPair({ state: "awaiting_payment", released_at: "x" }))).toBe("superseded")
  })
})

describe("startLinkSession", () => {
  it("a plain order: its own card intent for the link's amount", async () => {
    const { ops, log } = opsFor(plainPair(), { col_ship: collection("col_ship", 9800) })
    expect(await startLinkSession(tokenFor(), ops, SECRET, NOW)).toEqual({ client_secret: "cs_plain", amount: 9800 })
    expect(log).toEqual([`session col_ship {"payment_method_types":["card"]}`])
  })

  it("a mixed cart: ONE intent for both, the pickup session joined to it", async () => {
    const both = linked({ pickup_collection_id: "col_pick", amount: 21950 })
    const { ops, log } = opsFor(
      { primary: order("order_1", both), pickup: order("order_pick", both) },
      { col_ship: collection("col_ship", 4950), col_pick: collection("col_pick", 17000) }
    )
    expect(await startLinkSession(tokenFor({ amount: 21950 }), ops, SECRET, NOW)).toEqual({
      client_secret: "cs_joint",
      amount: 21950,
    })
    expect(log).toEqual([
      `session col_ship {"stripe_joint":{"total":21950},"payment_method_types":["card"]}`,
      `session col_pick {"stripe_joined":{"transactionId":"pi_new","total":21950,"own":4950,"clientSecret":"cs_joint"}}`,
    ])
  })

  it("refuses a link that is not open, and a payment already authorized", async () => {
    const paid = opsFor(plainPair({ ...linked(), state: "paid" }), { col_ship: collection("col_ship", 9800) })
    await expect(startLinkSession(tokenFor(), paid.ops, SECRET, NOW)).rejects.toThrow(/már kifizetted/)
    // superseded: says what to do, and claims no mail (mails are off on stage)
    const newer = opsFor(plainPair(linked({ amount: 9000 })), { col_ship: collection("col_ship", 9800) })
    const refused = await startLinkSession(tokenFor(), newer.ops, SECRET, NOW).catch((error) => error)
    expect(refused.message).toMatch(/újabb fizetési link készült/)
    expect(refused.message).not.toMatch(/levelünk|küldtünk|elküldtük/i)
    const going = opsFor(plainPair(), { col_ship: collection("col_ship", 9800, [{ status: "authorized" }]) })
    await expect(startLinkSession(tokenFor(), going.ops, SECRET, NOW)).rejects.toThrow(/már folyamatban/)
    expect([...paid.log, ...going.log]).toEqual([])
  })
})

describe("completeLinkPayment", () => {
  it("authorizes, captures, then marks the order paid", async () => {
    const { ops, log, written } = opsFor(plainPair(), {
      col_ship: collection("col_ship", 9800, [{ status: "canceled" }, {}]),
    })
    expect(await completeLinkPayment(tokenFor(), ops, SECRET, NOW)).toEqual({
      state: "paid",
      paid_at: NOW().toISOString(),
    })
    // the newest session is the one the card was confirmed on
    expect(log).toEqual(["authorize ps_col_ship_1 true", "capture order_1", "state order_1"])
    expect(written.get("order_1")).toEqual({
      kept: "yes",
      [ORDER_PAYMENT_METADATA_KEY]: { ...linked(), state: "paid", paid_at: NOW().toISOString() },
    })
  })

  it("a mixed cart: the shipped session first, the joined one after, one capture, both orders paid", async () => {
    const both = linked({ pickup_collection_id: "col_pick", amount: 21950 })
    const { ops, log } = opsFor(
      { primary: order("order_1", both), pickup: order("order_pick", both) },
      { col_ship: collection("col_ship", 4950, [{}]), col_pick: collection("col_pick", 17000, [{}]) }
    )
    await completeLinkPayment(tokenFor({ amount: 21950 }), ops, SECRET, NOW)
    expect(log).toEqual([
      "authorize ps_col_ship_0 true",
      "authorize ps_col_pick_0 true",
      "capture order_1",
      "state order_1",
      "state order_pick",
    ])
  })

  it("an unconfirmed card is not paid: nothing captured, nothing marked", async () => {
    for (const answer of [false, new MedusaError(MedusaError.Types.NOT_ALLOWED, "not authorized")]) {
      const { ops, log } = opsFor(plainPair(), { col_ship: collection("col_ship", 9800, [{}]) }, () => answer)
      await expect(completeLinkPayment(tokenFor(), ops, SECRET, NOW)).rejects.toThrow(/még nem ment végbe/)
      expect(log.filter((line) => !line.startsWith("authorize"))).toEqual([])
    }
  })

  it("pressed again after paying: paid, nothing more", async () => {
    const { ops, log } = opsFor(plainPair({ ...linked(), state: "paid", paid_at: "2026-10-07T09:00:00.000Z" }), {})
    expect(await completeLinkPayment(tokenFor(), ops, SECRET, NOW)).toEqual({
      state: "paid",
      paid_at: "2026-10-07T09:00:00.000Z",
    })
    expect(log).toEqual([])
  })
})
