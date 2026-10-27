import { type AttentionOperations, attentionOperations, computeAttention } from "../order-attention"
import { ALERT_AFTER_MINUTES } from "../pickup-retry"

/**
 * THE ORDERS THAT NEED SOMEONE'S EYES (audit P1/6). What must fail: a pickup
 * order missing for less than the alert age listed (the retry job is still on
 * it); one missing for longer not listed; the list not oldest first; a report
 * that closes, cancels or changes anything (the operations have no writing
 * method at all); the shipped order's number lost; a cart whose order cannot
 * be found dropped instead of listed; a cart whose retry a person stopped
 * dropped from the list (the card may still be held for it).
 */
const NOW = new Date("2026-10-27T16:00:00.000Z")
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60 * 1000)

const ops = (parts: Partial<AttentionOperations>): AttentionOperations => ({
  stuckPickups: async () => [],
  orderOfCart: async () => null,
  ...parts,
})

describe("the attention list", () => {
  it("lists a pickup order missing past the alert age, with the shipped order's number", async () => {
    const items = await computeAttention(
      ops({
        stuckPickups: async () => [
          { pickup_cart_id: "cart_p", parent_cart_id: "cart_s", parent_completed_at: minutesAgo(ALERT_AFTER_MINUTES + 5) },
        ],
        orderOfCart: async () => ({ order_id: "order_1", display_id: 57 }),
      }),
      NOW
    )
    expect(items).toEqual([
      {
        kind: "pickup_missing",
        order_id: "order_1",
        display_id: 57,
        parent_cart_id: "cart_s",
        pickup_cart_id: "cart_p",
        since: minutesAgo(ALERT_AFTER_MINUTES + 5).toISOString(),
        minutes: ALERT_AFTER_MINUTES + 5,
        retry_stopped: null,
      },
    ])
  })

  // acrobot, 2026-10-27 20:51 UTC: the mark stops only the retry, the card may still be held
  it("still lists a cart whose retry a person stopped, with the mark", async () => {
    const mark = { at: "2026-10-27T13:00:00.000Z", reason: "customer cancelled", by: "user_1" }
    const items = await computeAttention(
      ops({
        stuckPickups: async () => [
          {
            pickup_cart_id: "cart_p",
            parent_cart_id: "cart_s",
            parent_completed_at: minutesAgo(ALERT_AFTER_MINUTES + 5),
            retry_stopped: mark,
          },
        ],
      }),
      NOW
    )
    expect(items).toHaveLength(1)
    expect(items[0].retry_stopped).toEqual(mark)
  })

  it("does not list a pickup order the retry job is still working on", async () => {
    const items = await computeAttention(
      ops({
        stuckPickups: async () => [
          { pickup_cart_id: "cart_p", parent_cart_id: "cart_s", parent_completed_at: minutesAgo(ALERT_AFTER_MINUTES - 1) },
        ],
      }),
      NOW
    )
    expect(items).toEqual([])
  })

  it("still lists a stuck pickup whose shipped order cannot be found, without a number", async () => {
    const items = await computeAttention(
      ops({
        stuckPickups: async () => [
          { pickup_cart_id: "cart_p", parent_cart_id: "cart_s", parent_completed_at: minutesAgo(ALERT_AFTER_MINUTES + 1) },
        ],
        orderOfCart: async () => null,
      }),
      NOW
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ order_id: null, display_id: null })
  })

  it("puts the longest wait first", async () => {
    const items = await computeAttention(
      ops({
        stuckPickups: async () => [
          { pickup_cart_id: "p2", parent_cart_id: "s2", parent_completed_at: minutesAgo(90) },
          { pickup_cart_id: "p1", parent_cart_id: "s1", parent_completed_at: minutesAgo(600) },
        ],
      }),
      NOW
    )
    expect(items.map((i) => i.parent_cart_id)).toEqual(["s1", "s2"])
  })

  it("is a read: the operations offer no way to write", () => {
    expect(Object.keys(ops({})).sort()).toEqual(["orderOfCart", "stuckPickups"])
  })
})

describe("the real operations on a fake container", () => {
  it("asks the order link for the cart's order and its display number", async () => {
    const asked: unknown[] = []
    const container = {
      resolve: (key: string) =>
        key === "query"
          ? {
              graph: async (q: unknown) => {
                asked.push(q)
                return { data: [{ order_id: "order_1", order: { display_id: 57 } }] }
              },
            }
          : { info: jest.fn(), error: jest.fn() },
    }
    const found = await attentionOperations(container as never).orderOfCart("cart_s")
    expect(found).toEqual({ order_id: "order_1", display_id: 57 })
    expect(asked[0]).toMatchObject({ entity: "order_cart", filters: { cart_id: "cart_s" } })
  })

  it("a cart that became no order gives null", async () => {
    const container = {
      resolve: (key: string) =>
        key === "query" ? { graph: async () => ({ data: [] }) } : { info: jest.fn(), error: jest.fn() },
    }
    expect(await attentionOperations(container as never).orderOfCart("cart_x")).toBeNull()
  })
})
