import { PICKUP_RETRY_SKIP_METADATA_KEY } from "../pickup-retry"
import { setPickupRetrySkip } from "../pickup-retry-skip"
import { PICKUP_CART_METADATA_KEY } from "../split-completion"

/**
 * "DO NOT RETRY" (barracuda's note on #592). What must fail: a mark on a cart
 * that is not the shipped half of a completed mixed cart; a mark that drops the
 * cart's other metadata; a mark without who and when; clearing that leaves the
 * old reason; a write for an unknown cart.
 */
const NOW = new Date("2026-10-27T18:00:00.000Z")

const fake = (cart: unknown) => {
  const updates: unknown[][] = []
  const container = {
    resolve: (key: string) =>
      key === "query"
        ? { graph: async () => ({ data: cart ? [cart] : [] }) }
        : { updateCarts: async (...args: unknown[]) => void updates.push(args) },
  }
  return { container: container as never, updates }
}

const shipped = {
  id: "cart_s",
  completed_at: "2026-10-27T10:00:00.000Z",
  metadata: { [PICKUP_CART_METADATA_KEY]: "cart_p", other: "kept" },
}

describe("marking a pickup order 'do not retry'", () => {
  it("writes who, when and why on the shipped cart and keeps the other keys", async () => {
    const { container, updates } = fake(shipped)
    const result = await setPickupRetrySkip(container, "cart_s", { skip: true, reason: "customer cancelled", by: "user_1" }, NOW)
    const marker = { at: NOW.toISOString(), reason: "customer cancelled", by: "user_1" }
    expect(result).toEqual({ status: "saved", skipped: true, marker })
    expect(updates).toEqual([
      ["cart_s", { metadata: { [PICKUP_CART_METADATA_KEY]: "cart_p", other: "kept", [PICKUP_RETRY_SKIP_METADATA_KEY]: marker } }],
    ])
  })

  it("clearing writes null over the mark and keeps the other keys", async () => {
    const marked = {
      ...shipped,
      metadata: { ...shipped.metadata, [PICKUP_RETRY_SKIP_METADATA_KEY]: { at: "x", reason: "old", by: null } },
    }
    const { container, updates } = fake(marked)
    const result = await setPickupRetrySkip(container, "cart_s", { skip: false }, NOW)
    expect(result).toEqual({ status: "saved", skipped: false, marker: null })
    expect((updates[0][1] as { metadata: Record<string, unknown> }).metadata).toEqual({
      [PICKUP_CART_METADATA_KEY]: "cart_p",
      other: "kept",
      [PICKUP_RETRY_SKIP_METADATA_KEY]: null,
    })
  })

  it("refuses an unknown cart, an open cart and a cart that names no pickup cart, writing nothing", async () => {
    const unknown = fake(null)
    expect(await setPickupRetrySkip(unknown.container, "nope", { skip: true, reason: "abc" })).toEqual({ status: "not_found" })
    const open = fake({ ...shipped, completed_at: null })
    expect(await setPickupRetrySkip(open.container, "cart_s", { skip: true, reason: "abc" })).toEqual({ status: "not_a_mixed_cart" })
    const plain = fake({ id: "c", completed_at: "2026-10-27T10:00:00.000Z", metadata: {} })
    expect(await setPickupRetrySkip(plain.container, "c", { skip: true, reason: "abc" })).toEqual({ status: "not_a_mixed_cart" })
    expect([...unknown.updates, ...open.updates, ...plain.updates]).toEqual([])
  })
})
