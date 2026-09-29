import { MedusaError } from "@medusajs/framework/utils"

const cartOfSimplePayTransaction = jest.fn()
const rejoinSharedSplit = jest.fn(async () => ({ rejoined: true }))
jest.mock("../simplepay-cart", () => ({
  cartOfSimplePayTransaction: (...a: unknown[]) => cartOfSimplePayTransaction(...a),
}))
jest.mock("../split-completion", () => ({ rejoinSharedSplit: (...a: unknown[]) => (rejoinSharedSplit as any)(...a) }))
jest.mock("../split-completion-operations", () => ({ splitCompletionOperations: () => ({}) }))

import { rejoinAfterUnpaidSimplePay } from "../simplepay-rejoin"

beforeEach(() => {
  cartOfSimplePayTransaction.mockReset()
  rejoinSharedSplit.mockClear()
})

/**
 * AFTER AN UNPAID TRANSACTION (P4-3c3). What must fail: a transaction whose
 * session a newer start replaced touching the cart; any other lookup error
 * swallowed; the split of the transaction's cart not put back.
 */
describe("putting the split back after an unpaid SimplePay transaction", () => {
  it("puts back the split of the transaction's cart", async () => {
    cartOfSimplePayTransaction.mockResolvedValue("cart_1")
    expect(await rejoinAfterUnpaidSimplePay({} as never, "payses_1-x", 7)).toEqual({ rejoined: true, cart_id: "cart_1" })
    expect((rejoinSharedSplit.mock.calls[0] as unknown[])[0]).toBe("cart_1")
  })

  it("a replaced session finds nothing and changes nothing; other errors are not swallowed", async () => {
    cartOfSimplePayTransaction.mockRejectedValueOnce(new MedusaError(MedusaError.Types.NOT_FOUND, "gone"))
    expect(await rejoinAfterUnpaidSimplePay({} as never, "payses_1-x", 7)).toEqual({ rejoined: false, cart_id: null })

    cartOfSimplePayTransaction.mockRejectedValueOnce(new MedusaError(MedusaError.Types.INVALID_DATA, "another transaction"))
    await expect(rejoinAfterUnpaidSimplePay({} as never, "payses_1-x", 7)).rejects.toThrow("another transaction")
    expect(rejoinSharedSplit).not.toHaveBeenCalled()
  })
})
