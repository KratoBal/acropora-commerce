import { assertCardShare, ShareView, cardShareProblem } from "../assert-card-share"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "../split-completion"

const T = "pi_1"
const view = (id: string, total: number, facts: ShareView["facts"], metadata: Record<string, unknown> = {}): ShareView => ({
  id,
  total,
  metadata,
  facts,
})
const shipped = (total = 4950, facts: Partial<NonNullable<ShareView["facts"]>> = {}) =>
  view("cart_1", total, { transactionId: T, total: 13450, own: 4950, ...facts })
const pickup = (total = 8500, facts: Partial<NonNullable<ShareView["facts"]>> = {}) =>
  view("cart_p", total, { transactionId: T, total: 13450, own: 8500, joined: true, ...facts })

/**
 * WHAT A CARD PAYMENT MUST COVER BEFORE A CART BECOMES AN ORDER (P4-3c2b).
 * What must fail: a cart completed on a card payment for another amount; the
 * shipped cart of a split whose PaymentIntent is not the two carts' sum, or
 * whose pickup pair carries another intent; a pickup cart carrying an intent
 * that is not its shipped cart's.
 */
describe("the card payment against the carts", () => {
  it("passes a cart without card payment, a single payment for its total, and a correct split", () => {
    expect(cardShareProblem(view("c", 100, null), null)).toBeNull()
    expect(cardShareProblem(view("c", 4950, { transactionId: T, total: 4950 }), null)).toBeNull()
    expect(cardShareProblem(shipped(), pickup())).toBeNull()
    expect(cardShareProblem(pickup(), shipped())).toBeNull()
  })

  it("refuses a payment whose own amount is not the cart's total", () => {
    expect(cardShareProblem(view("c", 5000, { transactionId: T, total: 4950 }), null)).toContain(
      "cart's total is 5000"
    )
    expect(cardShareProblem(shipped(5200), pickup())).toContain("cart's total")
  })

  it("refuses a shipped cart whose intent is not the two carts' sum, or whose pair is another intent", () => {
    expect(cardShareProblem(shipped(), pickup(9000, { own: 9000 }))).toContain("two carts' sum")
    expect(cardShareProblem(shipped(), pickup(8500, { transactionId: "pi_other" }))).toContain("two carts' sum")
    expect(cardShareProblem(shipped(), null)).toContain("two carts' sum")
  })

  it("refuses a pickup cart whose intent is not its shipped cart's", () => {
    expect(cardShareProblem(pickup(), shipped(4950, { transactionId: "pi_other" }))).toContain("not its shipped cart's")
    expect(cardShareProblem(pickup(), pickup())).toContain("not its shipped cart's")
    expect(cardShareProblem(pickup(), null)).toContain("not its shipped cart's")
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
    payment_collection: { payment_sessions: [{ data: { id: "pi_1", stripe_share: facts } }] },
  })

  it("finds the pair through the metadata link, and throws on a wrong sum", async () => {
    const good = {
      cart_1: raw("cart_1", 4950, shipped().facts, { [PICKUP_CART_METADATA_KEY]: "cart_p" }),
      cart_p: raw("cart_p", 8500, pickup().facts, { [PARENT_CART_METADATA_KEY]: "cart_1" }),
    }
    await expect(assertCardShare("cart_1", container(good))).resolves.toBeUndefined()
    await expect(assertCardShare("cart_p", container(good))).resolves.toBeUndefined()

    const grown = { ...good, cart_p: raw("cart_p", 9000, { ...pickup().facts, own: 9000 }, { [PARENT_CART_METADATA_KEY]: "cart_1" }) }
    await expect(assertCardShare("cart_1", container(grown))).rejects.toThrow("two carts' sum")
  })

  /*
    SIMPLEPAY IS GONE (Balázs 2026-10-05): a session still carrying its old
    facts is not a card share any more, so it neither passes nor fails a split
    by them. What must fail: the old key still being read.
  */
  it("does not read the removed SimplePay facts", async () => {
    const old = {
      cart_1: {
        id: "cart_1",
        total: 5000,
        metadata: {},
        payment_collection: {
          payment_sessions: [{ data: { simplepay: { transactionId: 501234567, total: 4950 } } }],
        },
      },
    }
    await expect(assertCardShare("cart_1", container(old))).resolves.toBeUndefined()
  })
})
