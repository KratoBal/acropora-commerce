import { PICKUP_RETRY_SKIP_METADATA_KEY, pickupRetryOperations } from "../pickup-retry"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "../split-completion"

/**
 * THE CANDIDATE QUERY (barracuda's notes on #592). What must fail: the query
 * starting from every open cart again (it must start from the COMPLETED carts of
 * the window); a one-sided link
 * listed; a pickup cart that already has its order listed; a completed cart
 * that names no pickup cart listed; the second query asking for more than the
 * pickup carts the first one named.
 */
const SINCE = new Date("2026-10-20T12:00:00.000Z")
const DONE = "2026-10-27T10:00:00.000Z"

const fake = (completed: unknown[], open: unknown[]) => {
  const asked: { entity: string; filters: Record<string, unknown>; fields: string[] }[] = []
  const container = {
    resolve: (key: string) =>
      key === "query"
        ? {
            graph: async (q: { entity: string; filters: Record<string, unknown>; fields: string[] }) => {
              asked.push(q)
              return { data: asked.length === 1 ? completed : open }
            },
          }
        : { info: jest.fn(), error: jest.fn() },
  }
  return { ops: pickupRetryOperations(container as never), asked }
}

const parent = (id: string, pickup: string | null, extra: Record<string, unknown> = {}) => ({
  id,
  completed_at: DONE,
  metadata: pickup ? { [PICKUP_CART_METADATA_KEY]: pickup, ...extra } : { ...extra },
})
const pickupCart = (id: string, parentId: string) => ({ id, metadata: { [PARENT_CART_METADATA_KEY]: parentId } })

describe("the pickup retry's candidate query", () => {
  it("starts from the carts completed since the window, then asks only for the pickup carts they name", async () => {
    const { ops, asked } = fake([parent("p1", "k1"), parent("p2", "k2")], [pickupCart("k1", "p1")])
    const found = await ops.stuck(SINCE)
    expect(asked[0]).toMatchObject({ entity: "cart", filters: { completed_at: { $gte: SINCE } } })
    expect(asked[1]).toMatchObject({ entity: "cart", filters: { id: ["k1", "k2"], completed_at: null } })
    expect(found).toEqual([
      { pickup_cart_id: "k1", parent_cart_id: "p1", parent_completed_at: new Date(DONE), retry_stopped: null },
    ])
  })

  it("keeps a shipped cart marked 'do not retry' in the list, with the mark; a cleared mark is not a mark", async () => {
    const mark = { at: DONE, reason: "customer cancelled", by: "user_1" }
    const marked = parent("p1", "k1", { [PICKUP_RETRY_SKIP_METADATA_KEY]: mark })
    const cleared = parent("p2", "k2", { [PICKUP_RETRY_SKIP_METADATA_KEY]: null })
    const plain = parent("p3", "k3")
    const { ops } = fake(
      [marked, cleared, plain],
      [pickupCart("k1", "p1"), pickupCart("k2", "p2"), pickupCart("k3", "p3")]
    )
    const found = await ops.stuck(SINCE)
    expect(found.map((item) => [item.parent_cart_id, item.retry_stopped])).toEqual([
      ["p1", mark],
      ["p2", null],
      ["p3", null],
    ])
  })

  it("leaves out a one-sided link, a finished pickup cart and a cart that names no pickup cart", async () => {
    const { ops } = fake(
      [parent("p1", "k1"), parent("p2", "k2"), parent("p3", null)],
      // k1 names another parent; k2 is not among the open carts (it has its order)
      [pickupCart("k1", "someone_else")]
    )
    expect(await ops.stuck(SINCE)).toEqual([])
  })

  it("asks nothing more when no completed cart names a pickup cart", async () => {
    const { ops, asked } = fake([parent("p3", null)], [])
    expect(await ops.stuck(SINCE)).toEqual([])
    expect(asked).toHaveLength(1)
  })
})
