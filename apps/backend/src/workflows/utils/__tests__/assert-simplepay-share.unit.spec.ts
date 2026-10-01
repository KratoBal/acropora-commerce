import { assertSimplePayShare, ShareView, simplePayShareProblem } from "../assert-simplepay-share"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "../split-completion"

const T = 501234567
const view = (id: string, total: number, facts: ShareView["facts"], metadata: Record<string, unknown> = {}): ShareView => ({
  id,
  total,
  metadata,
  facts,
})
const shipped = (total = 4950, facts: Partial<NonNullable<ShareView["facts"]>> = {}) =>
  view("cart_1", total, { transactionId: T, orderRef: "payses_1-x", total: 13450, own: 4950, ...facts })
const pickup = (total = 8500, facts: Partial<NonNullable<ShareView["facts"]>> = {}) =>
  view("cart_p", total, { transactionId: T, orderRef: "payses_1-x", total: 13450, own: 8500, joined: true, ...facts })

/**
 * WHAT A CARD PAYMENT MUST COVER BEFORE A CART BECOMES AN ORDER (P4-3c2b).
 * What must fail: a cart completed on a card payment for another amount; the
 * shipped cart of a split whose transaction is not the two carts' sum, or
 * whose pickup pair carries another transaction; a pickup cart carrying a
 * transaction that is not its shipped cart's.
 */
describe("the card payment against the carts", () => {
  it("passes a cart without card payment, a single payment for its total, and a correct split", () => {
    expect(simplePayShareProblem(view("c", 100, null), null)).toBeNull()
    expect(simplePayShareProblem(view("c", 4950, { transactionId: T, orderRef: "r", total: 4950 }), null)).toBeNull()
    expect(simplePayShareProblem(shipped(), pickup())).toBeNull()
    expect(simplePayShareProblem(pickup(), shipped())).toBeNull()
  })

  it("refuses a payment whose own amount is not the cart's total", () => {
    expect(simplePayShareProblem(view("c", 5000, { transactionId: T, orderRef: "r", total: 4950 }), null)).toContain(
      "cart's total is 5000"
    )
    expect(simplePayShareProblem(shipped(5200), pickup())).toContain("cart's total")
  })

  it("refuses a shipped cart whose transaction is not the two carts' sum, or whose pair is another transaction", () => {
    expect(simplePayShareProblem(shipped(), pickup(9000, { own: 9000 }))).toContain("two carts' sum")
    expect(simplePayShareProblem(shipped(), pickup(8500, { transactionId: 1 }))).toContain("two carts' sum")
    expect(simplePayShareProblem(shipped(), null)).toContain("two carts' sum")
  })

  it("refuses a pickup cart whose transaction is not its shipped cart's", () => {
    expect(simplePayShareProblem(pickup(), shipped(4950, { transactionId: 1 }))).toContain("not its shipped cart's")
    expect(simplePayShareProblem(pickup(), pickup())).toContain("not its shipped cart's")
    expect(simplePayShareProblem(pickup(), null)).toContain("not its shipped cart's")
  })
})

describe("the completion's check reads both carts", () => {
  const container = (carts: Record<string, any>) => ({
    resolve: () => ({
      graph: async ({ filters }: { filters: { id: string } }) => ({ data: carts[filters.id] ? [carts[filters.id]] : [] }),
    }),
  })
  const raw = (id: string, total: number, facts: unknown, metadata: Record<string, unknown>) => ({
    id,
    total,
    metadata,
    payment_collection: { payment_sessions: [{ data: { simplepay: facts } }] },
  })

  it("finds the pair through the metadata link, and throws on a wrong sum", async () => {
    const good = {
      cart_1: raw("cart_1", 4950, shipped().facts, { [PICKUP_CART_METADATA_KEY]: "cart_p" }),
      cart_p: raw("cart_p", 8500, pickup().facts, { [PARENT_CART_METADATA_KEY]: "cart_1" }),
    }
    await expect(assertSimplePayShare("cart_1", container(good))).resolves.toBeUndefined()
    await expect(assertSimplePayShare("cart_p", container(good))).resolves.toBeUndefined()

    const grown = { ...good, cart_p: raw("cart_p", 9000, { ...pickup().facts, own: 9000 }, { [PARENT_CART_METADATA_KEY]: "cart_1" }) }
    await expect(assertSimplePayShare("cart_1", container(grown))).rejects.toThrow("two carts' sum")
  })

  /*
    THE SHARED STRIPE PAYMENT IS CHECKED THE SAME WAY (Balázs 2026-10-01): its
    facts have SimplePay's shape under their own key. What must fail: a Stripe
    split whose intent is not the two carts' sum passing the completion.
  */
  it("reads a shared Stripe payment the same way", async () => {
    const stripeRaw = (id: string, total: number, facts: unknown, metadata: Record<string, unknown>) => ({
      id,
      total,
      metadata,
      payment_collection: { payment_sessions: [{ data: { id: "pi_1", stripe_share: facts } }] },
    })
    const good = {
      cart_1: stripeRaw("cart_1", 4950, { transactionId: "pi_1", total: 13450, own: 4950 }, { [PICKUP_CART_METADATA_KEY]: "cart_p" }),
      cart_p: stripeRaw("cart_p", 8500, { transactionId: "pi_1", total: 13450, own: 8500, joined: true }, { [PARENT_CART_METADATA_KEY]: "cart_1" }),
    }
    await expect(assertSimplePayShare("cart_1", container(good))).resolves.toBeUndefined()
    await expect(assertSimplePayShare("cart_p", container(good))).resolves.toBeUndefined()

    const grown = {
      ...good,
      cart_p: stripeRaw("cart_p", 9000, { transactionId: "pi_1", total: 13450, own: 9000, joined: true }, { [PARENT_CART_METADATA_KEY]: "cart_1" }),
    }
    await expect(assertSimplePayShare("cart_1", container(grown))).rejects.toThrow("two carts' sum")
  })
})
