import { MedusaError } from "@medusajs/framework/utils"

import { redeemCartGiftCard } from "../redeem-cart-gift-card"

/*
  THE COMPLETION TAKES THE GIFT CARD'S SHARE (card 495c0007). WHAT TURNS RED: a credit larger than what the cart pays
  before credits is taken anyway (the cap was skipped somewhere: barracuda, #818, point A); a credit that fits is
  refused; a cart without a gift card reaches the service.
*/
const credit = (amount: number) => ({
  id: "cl_1",
  amount,
  reference: "gift_card",
  reference_id: "gcard_1",
  metadata: { cart_id: "cart_1" },
})

/** The gift card service, and the query that reads the cart's totals now (not the hook's cart). */
const container = (cartRow: Record<string, unknown> | null) => {
  const redeemGiftCard = jest.fn(async () => ({ balance: 0, repeated: false }))
  const graph = jest.fn(async () => ({ data: cartRow ? [cartRow] : [] }))
  return {
    redeemGiftCard,
    container: { resolve: (key: string) => (key === "query" ? { graph } : { redeemGiftCard }) } as never,
  }
}

describe("redeemCartGiftCard", () => {
  it("refuses when the cart's total cannot be read, instead of reading it as 0", async () => {
    for (const row of [null, { total: null, credit_line_total: 6000 }]) {
      const { redeemGiftCard, container: c } = container(row)
      await expect(redeemCartGiftCard({ id: "cart_1", credit_lines: [credit(6000)] }, c)).rejects.toThrow(
        /could not be read/
      )
      expect(redeemGiftCard).not.toHaveBeenCalled()
    }
  })

  it("refuses a credit larger than the cart pays before credits, before taking anything", async () => {
    // the cart pays 5 000 before credits (total -1 000 with the 6 000 credit): the cap was skipped
    const { redeemGiftCard, container: c } = container({ total: -1000, credit_line_total: 6000 })
    await expect(redeemCartGiftCard({ id: "cart_1", credit_lines: [credit(6000)] }, c)).rejects.toThrow(MedusaError)
    expect(redeemGiftCard).not.toHaveBeenCalled()
  })

  it("takes a credit that fits, keyed by the cart", async () => {
    const { redeemGiftCard, container: c } = container({ total: 700, credit_line_total: 6000 })
    await expect(redeemCartGiftCard({ id: "cart_1", credit_lines: [credit(6000)] }, c)).resolves.toEqual({ gift_card_id: "gcard_1", reference: "cart_1", amount: 6000, repeated: false })
    expect(redeemGiftCard).toHaveBeenCalledWith({ gift_card_id: "gcard_1", amount: 6000, reference: "cart_1" })
  })

  it("takes nothing from an already completed cart: a second completion of a finished cart reaches the hook too", async () => {
    const { redeemGiftCard, container: c } = container({
      completed_at: "2026-11-19T04:00:00Z",
      total: 700,
      credit_line_total: 6000,
    })
    expect(await redeemCartGiftCard({ id: "cart_1", credit_lines: [credit(4000)] }, c)).toBeNull()
    expect(redeemGiftCard).not.toHaveBeenCalled()
  })

  it("does nothing for a cart without a gift card", async () => {
    const { redeemGiftCard, container: c } = container({ total: 5000, credit_line_total: 0 })
    expect(await redeemCartGiftCard({ id: "cart_1", credit_lines: [] }, c)).toBeNull()
    expect(redeemGiftCard).not.toHaveBeenCalled()
  })
})
