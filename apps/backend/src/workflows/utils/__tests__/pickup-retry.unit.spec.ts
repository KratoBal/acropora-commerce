import {
  ALERT_AFTER_MINUTES,
  ALERT_REPEAT_MINUTES,
  RETRY_AFTER_MINUTES,
  type AlertMemory,
  type PickupRetryOperations,
  type StuckPickup,
  runPickupRetry,
} from "../pickup-retry"

/**
 * THE MISSING PICKUP ORDER IS RETRIED AND SAID ALOUD (audit P1/6, F2). What
 * must fail: a stuck pickup cart never retried; a retry of a cart the normal
 * route is still working on; the retry creating anything other than a call to
 * the idempotent split completion; a pickup order still missing half an hour
 * later with no alert; an alert for one that finished; a failing cart stopping
 * the others; an alert naming neither the carts nor what to do.
 */
const NOW = new Date("2026-10-27T14:00:00.000Z")
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000)

const stuck = (parent: string, ageMinutes: number): StuckPickup => ({
  pickup_cart_id: `${parent}_pickup`,
  parent_cart_id: parent,
  parent_completed_at: minutesAgo(ageMinutes),
})

const world = (items: StuckPickup[], completions: Record<string, { order_ids: string[] } | Error>) => {
  const calls: string[] = []
  const infos: string[] = []
  const errors: string[] = []
  const ops: PickupRetryOperations = {
    stuck: async () => items,
    completeSplit: async (cartId) => {
      calls.push(cartId)
      const outcome = completions[cartId]!
      if (outcome instanceof Error) throw outcome
      return outcome
    },
    info: (message) => infos.push(message),
    error: (message) => errors.push(message),
  }
  return { ops, calls, infos, errors }
}

describe("the pickup retry", () => {
  it("finishes a stuck pickup order through the split's completion, and says so quietly", async () => {
    const w = world([stuck("cart_1", 10)], { cart_1: { order_ids: ["order_1", "order_2"] } })
    const report = await runPickupRetry(w.ops, NOW)
    expect(w.calls).toEqual(["cart_1"])
    expect(report).toEqual({ finished: ["cart_1"], pending: [], failed: [] })
    expect(w.errors).toEqual([])
    expect(w.infos[0]).toContain("order_1, order_2")
  })

  it("leaves a cart alone until the normal route has had its minutes", async () => {
    const w = world([stuck("cart_1", RETRY_AFTER_MINUTES - 1)], { cart_1: { order_ids: ["a", "b"] } })
    const report = await runPickupRetry(w.ops, NOW)
    expect(w.calls).toEqual([])
    expect(report).toEqual({ finished: [], pending: [], failed: [] })
  })

  it("a retry that still leaves only the shipped order stays quiet until the alert age, then is loud", async () => {
    const young = world([stuck("cart_1", ALERT_AFTER_MINUTES - 1)], { cart_1: { order_ids: ["order_1"] } })
    expect((await runPickupRetry(young.ops, NOW)).pending).toEqual(["cart_1"])
    expect(young.errors).toEqual([])

    const old = world([stuck("cart_1", ALERT_AFTER_MINUTES + 5)], { cart_1: { order_ids: ["order_1"] } })
    await runPickupRetry(old.ops, NOW)
    expect(old.errors).toHaveLength(1)
    // names both carts and what to do
    expect(old.errors[0]).toContain("cart_1")
    expect(old.errors[0]).toContain("cart_1_pickup")
    expect(old.errors[0]).toContain("/store/carts/cart_1/complete-split")
  })

  it("a throwing completion is reported, loud only past the alert age, and does not stop the others", async () => {
    const w = world(
      [stuck("cart_old", ALERT_AFTER_MINUTES + 1), stuck("cart_new", 5), stuck("cart_ok", 10)],
      {
        cart_old: new Error("stripe down"),
        cart_new: new Error("db timeout"),
        cart_ok: { order_ids: ["a", "b"] },
      }
    )
    const report = await runPickupRetry(w.ops, NOW)
    expect(report).toEqual({ finished: ["cart_ok"], pending: [], failed: ["cart_old", "cart_new"] })
    expect(w.errors).toHaveLength(1)
    expect(w.errors[0]).toContain("stripe down")
    expect(w.infos.join(" ")).toContain("db timeout")
  })

  it("nothing stuck: nothing called, nothing logged", async () => {
    const w = world([], {})
    expect(await runPickupRetry(w.ops, NOW)).toEqual({ finished: [], pending: [], failed: [] })
    expect(w.calls).toEqual([])
    expect(w.infos).toEqual([])
    expect(w.errors).toEqual([])
  })
})

/**
 * barracuda's note on #592: a cart that can never be finished must not write an
 * ERROR line every ten minutes for seven days. What must fail: a second line
 * ten minutes after the first for the same cart; no second line an hour later
 * (the cart would go quiet while still stuck); one cart's line silencing
 * another's; the memory growing with carts that are long gone.
 */
describe("the repeated ERROR line", () => {
  const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60 * 1000)
  const pendingWorld = (ids: string[]) =>
    world(
      ids.map((id) => stuck(id, ALERT_AFTER_MINUTES + 5)),
      Object.fromEntries(ids.map((id) => [id, { order_ids: ["order_1"] }]))
    )

  it("writes the line once, stays quiet for the repeat interval, then writes it again", async () => {
    const memory: AlertMemory = new Map()
    const w = pendingWorld(["cart_1"])
    await runPickupRetry(w.ops, NOW, memory)
    expect(w.errors).toHaveLength(1)
    await runPickupRetry(w.ops, later(10), memory)
    await runPickupRetry(w.ops, later(ALERT_REPEAT_MINUTES - 1), memory)
    expect(w.errors).toHaveLength(1)
    await runPickupRetry(w.ops, later(ALERT_REPEAT_MINUTES), memory)
    expect(w.errors).toHaveLength(2)
  })

  it("still retries every run: only the line is throttled, not the work", async () => {
    const memory: AlertMemory = new Map()
    const w = pendingWorld(["cart_1"])
    await runPickupRetry(w.ops, NOW, memory)
    await runPickupRetry(w.ops, later(10), memory)
    expect(w.calls).toEqual(["cart_1", "cart_1"])
  })

  it("keeps a separate clock per cart", async () => {
    const memory: AlertMemory = new Map()
    const first = pendingWorld(["cart_1"])
    await runPickupRetry(first.ops, NOW, memory)
    const both = pendingWorld(["cart_1", "cart_2"])
    await runPickupRetry(both.ops, later(10), memory)
    expect(both.errors).toHaveLength(1)
    expect(both.errors[0]).toContain("cart_2")
  })

  it("forgets a cart that is no longer stuck, so the memory stays as small as the list", async () => {
    const memory: AlertMemory = new Map()
    await runPickupRetry(pendingWorld(["cart_1", "cart_2"]).ops, NOW, memory)
    expect(Array.from(memory.keys()).sort()).toEqual(["cart_1", "cart_2"])
    await runPickupRetry(pendingWorld(["cart_2"]).ops, later(10), memory)
    expect(Array.from(memory.keys())).toEqual(["cart_2"])
  })

  it("the alert tells how to leave the cart alone when the shop does not fulfil it", async () => {
    const w = pendingWorld(["cart_1"])
    await runPickupRetry(w.ops, NOW, new Map())
    expect(w.errors[0]).toContain("/admin/order-attention/pickup-skip")
  })
})
