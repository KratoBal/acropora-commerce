import { Modules } from "@medusajs/framework/utils"

import { splitCompletionOperations, toSplitCart } from "../split-completion-operations"

/**
 * THE CART AS THE SHARED PAYMENT READS IT (P4-3c2b). What must fail: a split
 * paid together not recognised (its completion would move lines and restart
 * the payment); a single payment taken for a shared one; the removed
 * SimplePay facts still read.
 */
describe("the cart's shared payment", () => {
  const withSession = (data: unknown) => ({ id: "c", items: [], payment_collection: { payment_sessions: [{ provider_id: "pp_stripe_stripe", data }] } })

  it("a session sharing its intent marks the cart; a single one does not", () => {
    expect(toSplitCart(withSession({ id: "pi_1", stripe_share: { transactionId: "pi_1", total: 13450, own: 4950 } })).shared_payment).toBe(true)
    expect(toSplitCart(withSession({ id: "pi_1", stripe_share: { transactionId: "pi_1", total: 13450, own: 8500, joined: true } })).shared_payment).toBe(true)
    expect(toSplitCart(withSession({ id: "pi_1", stripe_share: { transactionId: "pi_1", total: 4950, own: 4950 } })).shared_payment).toBe(false)
    expect(toSplitCart(withSession({})).shared_payment).toBe(false)
    expect(toSplitCart(withSession({ simplepay: { transactionId: 1, total: 13450, own: 4950 } })).shared_payment).toBe(false)
  })
})

describe("the split's lock", () => {
  it("runs the job through Medusa's locking module, under the split key, waiting up to a minute", async () => {
    const execute = jest.fn(async (_key: string, job: () => Promise<unknown>) => job())
    const container = {
      resolve: (key: string) => (key === Modules.LOCKING ? { execute } : { warn: jest.fn(), info: jest.fn() }),
    }
    const ops = splitCompletionOperations(container as never, { storePickupOptionId: "so_1" })

    expect(await ops.withLock("cart_1", async () => "kesz")).toBe("kesz")
    expect(execute.mock.calls[0][0]).toBe("split:cart_1")
    expect((execute.mock.calls[0] as unknown[])[2]).toEqual({ timeout: 60 })
  })
})
