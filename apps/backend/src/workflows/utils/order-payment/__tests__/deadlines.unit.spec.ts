import { type DeadlineOperations, deadlineStep, runPaymentDeadlines } from "../deadlines"
import type { ReleaseSide } from "../release-hold"
import { ORDER_PAYMENT_METADATA_KEY, type StoredOrderPayment } from "../state"

/**
 * THE LINK'S DEADLINES (brief, point 6; decision 2: the reminder on day 3,
 * the close on day 6). What must fail:
 * - a reminder before day 3, twice for one link, or after paying;
 * - an expiry before the deadline;
 * - a released hold's order left open after its link expired, or its
 *   mixed-cart pair half left behind;
 * - a difference's order closed (its hold stays: only the link expires);
 * - the reminder mail retried every hour after a failure;
 * - one failing order stopping the others.
 */
const SENT = "2026-10-06T10:00:00.000Z"
const EXPIRES = "2026-10-12T10:00:00.000Z"
const at = (iso: string) => new Date(iso)
const link = (over: Record<string, unknown> = {}) => ({
  collection_id: "col_1",
  pickup_collection_id: null,
  sent_at: SENT,
  expires_at: EXPIRES,
  reminded_at: null as string | null,
  amount: 9800,
  url: "https://shop.example.test/hu/rendeles-fizetese/t",
  ...over,
})
const state = (over: Partial<StoredOrderPayment> = {}): StoredOrderPayment => ({
  state: "link_sent",
  released_at: "2026-10-05T19:00:00.000Z",
  link: link(),
  ...over,
})
const order = (id: string, stored: StoredOrderPayment | null, extra: Record<string, unknown> = {}): ReleaseSide => ({
  order_id: id,
  display_id: 48,
  metadata: { kept: "yes", ...extra, ...(stored ? { [ORDER_PAYMENT_METADATA_KEY]: stored } : {}) },
  payments: [],
})

describe("deadlineStep", () => {
  it("day 3 reminds once, day 6 expires, a paid or unsent link does nothing", () => {
    expect(deadlineStep(state(), at("2026-10-09T09:59:00.000Z"))).toBeNull()
    expect(deadlineStep(state(), at("2026-10-09T10:00:00.000Z"))).toBe("remind")
    expect(deadlineStep(state({ state: "reminded", link: link({ reminded_at: "2026-10-09T10:00:00.000Z" }) }), at("2026-10-10T10:00:00.000Z"))).toBeNull()
    expect(deadlineStep(state({ state: "reminded" }), at(EXPIRES))).toBe("expire")
    expect(deadlineStep(state(), at("2026-10-12T09:59:00.000Z"))).toBe("remind")
    expect(deadlineStep(state({ state: "paid" }), at("2026-10-20T00:00:00.000Z"))).toBeNull()
    expect(deadlineStep(state({ state: "awaiting_payment", link: null }), at("2026-10-20T00:00:00.000Z"))).toBeNull()
    expect(deadlineStep(null, at("2026-10-20T00:00:00.000Z"))).toBeNull()
  })
})

const opsFor = (
  orders: ReleaseSide[],
  pairs: Record<string, { primary: ReleaseSide; pickup: ReleaseSide | null }>,
  over: Partial<DeadlineOperations> = {}
) => {
  const log: string[] = []
  const written = new Map<string, Record<string, unknown>>()
  const ops: DeadlineOperations = {
    candidates: async () => orders,
    loadPair: async (id) => pairs[id] ?? null,
    setMetadata: async (id, metadata) => {
      log.push(`state ${id} ${(metadata[ORDER_PAYMENT_METADATA_KEY] as StoredOrderPayment).state}`)
      written.set(id, metadata)
    },
    remind: async (input) => {
      log.push(`remind ${input.orderId} ${input.pickupOrderId}`)
      return { sent: true }
    },
    close: async (id) => void log.push(`close ${id}`),
    log: (message) => void log.push(`log ${message}`),
    ...over,
  }
  return { ops, log, written }
}

describe("runPaymentDeadlines", () => {
  it("day 3: both halves marked reminded first, then one mail from the shipped order", async () => {
    const both = state({ link: link({ pickup_collection_id: "col_2" }) })
    const ship = order("order_ship", both)
    const pick = order("order_pick", both, { acropora_parent_order_id: "order_ship" })
    const { ops, log, written } = opsFor([ship, pick], { order_ship: { primary: ship, pickup: pick } })
    const report = await runPaymentDeadlines(ops, at("2026-10-09T11:00:00.000Z"))
    expect(log).toEqual(["state order_ship reminded", "state order_pick reminded", "remind order_ship order_pick"])
    expect(report.reminded).toEqual(["order_ship"])
    expect((written.get("order_pick")?.[ORDER_PAYMENT_METADATA_KEY] as StoredOrderPayment).link?.reminded_at).toBe(
      "2026-10-09T11:00:00.000Z"
    )
  })

  it("a failed reminder mail is logged, not retried: the link is marked reminded", async () => {
    const one = order("order_1", state())
    const { ops, log } = opsFor([one], { order_1: { primary: one, pickup: null } }, { remind: async () => ({ sent: false }) })
    await runPaymentDeadlines(ops, at("2026-10-09T11:00:00.000Z"))
    expect(log).toEqual(["state order_1 reminded", "log Order order_1: the payment reminder did not go"])
  })

  it("day 6, a released hold: the link expires and the pair is closed", async () => {
    const both = state({ state: "reminded" })
    const ship = order("order_ship", both)
    const pick = order("order_pick", both, { acropora_parent_order_id: "order_ship" })
    const { ops, log } = opsFor([pick, ship], { order_ship: { primary: ship, pickup: pick } })
    const report = await runPaymentDeadlines(ops, at(EXPIRES))
    expect(log).toEqual(["state order_ship expired", "state order_pick expired", "close order_ship", "close order_pick"])
    expect(report).toMatchObject({ expired: ["order_ship"], closed: ["order_ship", "order_pick"] })
  })

  it("day 6, a difference: only the link expires, the order and its hold stay", async () => {
    const diff = order("order_1", { kind: "difference", state: "link_sent", link: link() })
    const { ops, log } = opsFor([diff], { order_1: { primary: diff, pickup: null } })
    await runPaymentDeadlines(ops, at(EXPIRES))
    expect(log).toEqual(["state order_1 expired"])
  })

  it("paid since the list was taken: nothing happens", async () => {
    const listed = order("order_1", state())
    const now = order("order_1", state({ state: "paid" }))
    const { ops, log } = opsFor([listed], { order_1: { primary: now, pickup: null } })
    await runPaymentDeadlines(ops, at(EXPIRES))
    expect(log).toEqual([])
  })

  it("one failing order does not stop the others", async () => {
    const bad = order("order_bad", state())
    const good = order("order_good", state())
    const { ops, log } = opsFor(
      [bad, good],
      { order_bad: { primary: bad, pickup: null }, order_good: { primary: good, pickup: null } },
      {
        close: async (id) => {
          if (id === "order_bad") throw new Error("status moved")
          log.push(`close ${id}`)
        },
      }
    )
    const report = await runPaymentDeadlines(ops, at(EXPIRES))
    expect(report.failed).toEqual(["order_bad"])
    expect(report.closed).toEqual(["order_good"])
    expect(log).toContain('log Order order_bad: the payment deadline step "expire" failed: status moved')
  })
})
