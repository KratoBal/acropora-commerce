import { MedusaError } from "@medusajs/framework/utils"

import { redeemCartLoyalty, voidCartLoyaltyRedemption } from "../redeem-cart-loyalty"

/*
  THE COMPLETION TAKES THE POINTS (card dfb79916). WHAT TURNS RED: points taken when the redemption is switched off; a
  credit the store route would not have made reaching the ledger (another customer's, an amount that is not the points,
  a cart under the order minimum, a share above the allowed percent); a credit larger than the cart pays; points taken
  from an already completed cart; a cart whose total cannot be read read as 0; a cart with a gift card AND points; two
  points credits; a repeated redemption giving back; a cart without points reaching the ledger.
*/
const credit = (points: number, over: Record<string, unknown> = {}) => ({
  id: "cl_1",
  amount: points,
  reference: "loyalty_points",
  reference_id: "cus_1",
  metadata: { points, cart_id: "cart_1" },
  ...over,
})

const container = (cartRow: Record<string, unknown> | null, redeemed = { balance: 100, repeated: false }) => {
  const redeemPoints = jest.fn(async () => redeemed)
  const voidPointsRedemption = jest.fn(async () => ({ balance: 0, voided: true }))
  const graph = jest.fn(async () => ({ data: cartRow ? [cartRow] : [] }))
  return {
    redeemPoints,
    voidPointsRedemption,
    container: { resolve: (key: string) => (key === "query" ? { graph } : { redeemPoints, voidPointsRedemption }) } as never,
  }
}
const open = { customer_id: "cus_1", total: 25_000, credit_line_total: 10_000 }

beforeEach(() => {
  process.env.LOYALTY_REDEMPTION_ENABLED = "true"
  delete process.env.LOYALTY_POINT_VALUE_HUF
  delete process.env.LOYALTY_MIN_ORDER_HUF
  delete process.env.LOYALTY_MIN_POINTS
  delete process.env.LOYALTY_MAX_PERCENT
})
afterAll(() => {
  delete process.env.LOYALTY_REDEMPTION_ENABLED
})

describe("redeemCartLoyalty", () => {
  it("takes the points a credit that fits stands for, keyed by the cart and the credit's customer", async () => {
    const { redeemPoints, container: c } = container(open)
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).resolves.toEqual({
      customer_id: "cus_1",
      cart_id: "cart_1",
      points: 10_000,
      repeated: false,
    })
    expect(redeemPoints).toHaveBeenCalledWith({ customer_id: "cus_1", points: 10_000, cart_id: "cart_1" })
  })

  it("does nothing for a cart without points", async () => {
    const { redeemPoints, container: c } = container(open)
    expect(await redeemCartLoyalty({ id: "cart_1", credit_lines: [] }, c)).toBeNull()
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses when the redemption was switched off after the credit was made", async () => {
    process.env.LOYALTY_REDEMPTION_ENABLED = "false"
    const { redeemPoints, container: c } = container(open)
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).rejects.toThrow(/nincs bekapcsolva/)
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses a credit that belongs to another customer than the cart's", async () => {
    const { redeemPoints, container: c } = container({ ...open, customer_id: "cus_other" })
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).rejects.toThrow(/nem ennek a kosárnak/)
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses an amount that is not the points at the point value", async () => {
    const { redeemPoints, container: c } = container(open)
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000, { amount: 12_000 })] }, c)).rejects.toThrow(
      /nem egyezik a pontszámmal/
    )
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses a credit larger than what the cart pays before credits (the cap was skipped)", async () => {
    // pays 5 000 before credits (total -5 000 with a 10 000 credit)
    const { redeemPoints, container: c } = container({ ...open, total: -5_000 })
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).rejects.toThrow(MedusaError)
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses a cart under the order minimum, though the credit is there", async () => {
    // 20 000 before credits is under the 30 000 minimum
    const { redeemPoints, container: c } = container({ ...open, total: 10_000, credit_line_total: 10_000 })
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).rejects.toThrow(/fizethet pontból/)
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses a share above the allowed percent", async () => {
    process.env.LOYALTY_MAX_PERCENT = "20"
    const { redeemPoints, container: c } = container(open)
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).rejects.toThrow(/fizethet pontból/)
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses when the cart's total cannot be read, instead of reading it as 0", async () => {
    for (const row of [null, { customer_id: "cus_1", total: null, credit_line_total: 1 }]) {
      const { redeemPoints, container: c } = container(row)
      await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).rejects.toThrow(/could not be read/)
      expect(redeemPoints).not.toHaveBeenCalled()
    }
  })

  it("takes nothing from an already completed cart", async () => {
    const { redeemPoints, container: c } = container({ ...open, completed_at: "2026-11-19T04:00:00Z" })
    expect(await redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).toBeNull()
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses points and a gift card on one cart, before touching the ledger", async () => {
    const gift = { id: "cl_g", amount: 1_000, reference: "gift_card", reference_id: "gc", metadata: {} }
    const { redeemPoints, container: c } = container(open)
    await expect(redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000), gift] }, c)).rejects.toThrow(/Ajándékkártyával együtt/)
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("refuses two points credits", async () => {
    const { redeemPoints, container: c } = container(open)
    await expect(
      redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(5_000), credit(5_000, { id: "cl_2" })] }, c)
    ).rejects.toThrow(/egyszer váltható/)
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it("answers a repeated redemption as repeated", async () => {
    const { container: c } = container(open, { balance: 5, repeated: true })
    expect(await redeemCartLoyalty({ id: "cart_1", credit_lines: [credit(10_000)] }, c)).toMatchObject({ repeated: true })
  })
})

describe("voidCartLoyaltyRedemption", () => {
  it("gives back what the completion took, by customer and cart", async () => {
    const { voidPointsRedemption, container: c } = container(open)
    await voidCartLoyaltyRedemption({ customer_id: "cus_1", cart_id: "cart_1", points: 10_000, repeated: false }, c)
    expect(voidPointsRedemption).toHaveBeenCalledWith({ customer_id: "cus_1", cart_id: "cart_1" })
  })

  it("gives nothing back for a repeated redemption (this run took nothing) or for none at all", async () => {
    const { voidPointsRedemption, container: c } = container(open)
    await voidCartLoyaltyRedemption({ customer_id: "cus_1", cart_id: "cart_1", points: 10_000, repeated: true }, c)
    await voidCartLoyaltyRedemption(null, c)
    await voidCartLoyaltyRedemption(undefined, c)
    expect(voidPointsRedemption).not.toHaveBeenCalled()
  })
})
