import {
  ACROPORA_FEE_TYPE_METADATA_KEY,
  CASH_ON_DELIVERY_FEE_TYPE,
  buildCashOnDeliveryFeeLineItem,
  findCashOnDeliveryFeeLineItems,
} from "../cod-fee-line-item"
import {
  ReconcilableLineItem,
  assertCashOnDeliveryFeeMatchesPayment,
  planCashOnDeliveryFee,
} from "../cod-fee-reconciliation"
import { resolveCashOnDeliveryFeeAmount } from "../cod-fee"
import {
  ACROPORA_LINE_ITEM_KIND_METADATA_KEY,
  calculateGoodsTotal,
} from "../goods-total"
import { PaymentRole, allowedPaymentRolesFor } from "../payment-eligibility"
import { ShippingOptionRole } from "../shipping-eligibility"
import { calculateShippingPrice } from "../shipping-pricing"

const feeLine = (id: string, unit_price: number): ReconcilableLineItem => ({
  id,
  unit_price,
  metadata: {
    [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee",
    [ACROPORA_FEE_TYPE_METADATA_KEY]: CASH_ON_DELIVERY_FEE_TYPE,
  },
})

const goodsLine = (unit_price: number, quantity = 1) => ({
  id: `item_${unit_price}_${quantity}`,
  unit_price,
  quantity,
  is_tax_inclusive: true,
})

const otherFeeLine = (id: string): ReconcilableLineItem => ({
  id,
  unit_price: 990,
  metadata: {
    [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee",
    [ACROPORA_FEE_TYPE_METADATA_KEY]: "gift_wrapping",
  },
})

describe("planning the cash-on-delivery fee", () => {
  describe("when the fee is due", () => {
    it("adds one when the cart carries none", () => {
      const plan = planCashOnDeliveryFee({
        dueHuf: 450,
        items: [goodsLine(10_000)],
      })

      expect(plan.action).toBe("add")
      expect(plan.amount).toBe(450)
    })

    it("does nothing when the cart already carries it", () => {
      const plan = planCashOnDeliveryFee({
        dueHuf: 450,
        items: [goodsLine(10_000), feeLine("cali_fee", 450)],
      })

      expect(plan.action).toBe("none")
      expect(plan.staleAmount).toBeNull()
    })

    it("keeps the earliest fee and removes the rest", () => {
      // Ordering by id rather than by arrival: the query makes no promise, and
      // two runs must not delete different lines.
      const plan = planCashOnDeliveryFee({
        dueHuf: 450,
        items: [feeLine("cali_b", 450), feeLine("cali_a", 450)],
      })

      expect(plan.action).toBe("remove")
      expect(plan.removeIds).toEqual(["cali_b"])
    })

    it("reports a fee charged at another amount without rewriting it", () => {
      const plan = planCashOnDeliveryFee({
        dueHuf: 550,
        items: [feeLine("cali_fee", 450)],
      })

      expect(plan.action).toBe("none")
      expect(plan.staleAmount).toEqual({
        id: "cali_fee",
        current: 450,
        configured: 550,
      })
    })

    it("reads a fee amount that arrives as a string", () => {
      // Query results carry big numbers as strings often enough that a strict
      // comparison here would report every cart as stale.
      const plan = planCashOnDeliveryFee({
        dueHuf: 450,
        items: [{ ...feeLine("cali_fee", 450), unit_price: "450" }],
      })

      expect(plan.action).toBe("none")
      expect(plan.staleAmount).toBeNull()
    })
  })

  describe("when no fee is due", () => {
    it("removes the fee lines the cart carries", () => {
      const plan = planCashOnDeliveryFee({
        dueHuf: 0,
        items: [goodsLine(10_000), feeLine("cali_fee", 450)],
      })

      expect(plan.action).toBe("remove")
      expect(plan.removeIds).toEqual(["cali_fee"])
    })

    it("does nothing when the cart carries none", () => {
      const plan = planCashOnDeliveryFee({
        dueHuf: 0,
        items: [goodsLine(10_000)],
      })

      expect(plan.action).toBe("none")
    })

    it("leaves other fees alone", () => {
      const plan = planCashOnDeliveryFee({
        dueHuf: 0,
        items: [otherFeeLine("cali_wrap")],
      })

      expect(plan.action).toBe("none")
    })
  })
})

describe("refusing to complete a mismatched cart", () => {
  it("refuses a cart that pays cash on delivery without the fee", () => {
    expect(() =>
      assertCashOnDeliveryFeeMatchesPayment({
        dueHuf: 450,
        items: [goodsLine(10_000)],
      })
    ).toThrow(/carries no handling fee/)
  })

  it("refuses a cart that carries the fee without paying cash on delivery", () => {
    expect(() =>
      assertCashOnDeliveryFeeMatchesPayment({
        dueHuf: 0,
        items: [feeLine("cali_fee", 450)],
      })
    ).toThrow(/does not pay cash on delivery/)
  })

  it("refuses a cart carrying more than one fee", () => {
    expect(() =>
      assertCashOnDeliveryFeeMatchesPayment({
        dueHuf: 450,
        items: [feeLine("cali_a", 450), feeLine("cali_b", 450)],
      })
    ).toThrow(/carries 2 cash-on-delivery fees/)
  })

  it("accepts a fee charged at an amount that has since changed", () => {
    // An admin price change must not turn live checkouts into failed orders.
    expect(() =>
      assertCashOnDeliveryFeeMatchesPayment({
        dueHuf: 550,
        items: [feeLine("cali_fee", 450)],
      })
    ).not.toThrow()
  })

  it("accepts a matching cart", () => {
    expect(() =>
      assertCashOnDeliveryFeeMatchesPayment({
        dueHuf: 450,
        items: [goodsLine(10_000), feeLine("cali_fee", 450)],
      })
    ).not.toThrow()
  })
})

/**
 * The four cases from the task description, composed from the same functions
 * the runtime uses: the goods total, the shipping policy and the fee decision.
 * Nothing here mocks an amount into place.
 */
describe("checkout arithmetic", () => {
  const settings = {
    shipping_gls_normal_huf: 3_500,
    shipping_gls_heavy_huf: 6_900,
    shipping_foxpost_huf: 1_590,
    free_shipping_threshold_huf: 50_000,
  }

  const FEE_HUF = 450

  /**
   * A cart the tests can act on more than once. `settle` runs one round of the
   * real decision: goods total, shipping policy, fee due, plan, apply.
   */
  const cart = (goods: { unit_price: number; quantity?: number }[]) => {
    let items: ReconcilableLineItem[] = goods.map((g) =>
      goodsLine(g.unit_price, g.quantity)
    )

    const feeLines = () => findCashOnDeliveryFeeLineItems(items)

    const settle = ({
      role,
      paymentRole,
    }: {
      role: ShippingOptionRole
      paymentRole: PaymentRole | null
    }) => {
      const goodsTotal = calculateGoodsTotal(items as any)
      const shipping = calculateShippingPrice({
        role,
        goodsTotalHuf: goodsTotal,
        settings,
      })
      const due = resolveCashOnDeliveryFeeAmount({
        selectedPaymentRole: paymentRole,
        allowedPaymentRoles: allowedPaymentRolesFor([role]),
        feeHuf: FEE_HUF,
      })
      const plan = planCashOnDeliveryFee({ dueHuf: due, items })

      if (plan.action === "add") {
        items = [
          ...items,
          {
            id: `cali_fee_${items.length}`,
            ...buildCashOnDeliveryFeeLineItem(plan.amount),
          },
        ]
      }

      if (plan.action === "remove") {
        items = items.filter(
          (item) => !plan.removeIds.includes(item.id as string)
        )
      }

      const fee = feeLines().reduce(
        (sum, item) => sum + Number(item.unit_price ?? 0),
        0
      )

      return {
        plan,
        goodsTotal,
        shipping,
        fee,
        total: goodsTotal + shipping + fee,
        feeLineCount: feeLines().length,
      }
    }

    return { settle, items: () => items }
  }

  it("online payment: 10 000 goods and 3 500 shipping make 13 500", () => {
    const result = cart([{ unit_price: 10_000 }]).settle({
      role: "GLS_NORMAL",
      paymentRole: "ONLINE_CARD",
    })

    expect(result.plan.action).toBe("none")
    expect(result.fee).toBe(0)
    expect(result.total).toBe(13_500)
  })

  it("cash on delivery: the same cart makes 13 950", () => {
    const result = cart([{ unit_price: 10_000 }]).settle({
      role: "GLS_NORMAL",
      paymentRole: "COD",
    })

    expect(result.plan.action).toBe("add")
    expect(result.fee).toBe(450)
    expect(result.total).toBe(13_950)
  })

  describe("free shipping with cash on delivery: 50 000 goods make 50 450", () => {
    // Two rules meet in this one case, and a failure here means one of them
    // moved. They are asserted separately so the failure says which.
    const subject = cart([{ unit_price: 50_000 }])
    const result = subject.settle({ role: "GLS_NORMAL", paymentRole: "COD" })

    it("charges no shipping at exactly the threshold", () => {
      expect(result.goodsTotal).toBe(50_000)
      expect(result.shipping).toBe(0)
    })

    it("keeps the fee out of the goods total, so it cannot take free shipping away", () => {
      const goodsTotalAfterFee = calculateGoodsTotal(subject.items() as any)

      expect(goodsTotalAfterFee).toBe(50_000)
      expect(
        calculateShippingPrice({
          role: "GLS_NORMAL",
          goodsTotalHuf: goodsTotalAfterFee,
          settings,
        })
      ).toBe(0)
    })

    it("adds up to 50 450", () => {
      expect(result.fee).toBe(450)
      expect(result.total).toBe(50_450)
    })
  })

  it("selecting cash on delivery twice leaves one fee line", () => {
    const subject = cart([{ unit_price: 10_000 }])

    const first = subject.settle({ role: "GLS_NORMAL", paymentRole: "COD" })
    const second = subject.settle({ role: "GLS_NORMAL", paymentRole: "COD" })

    expect(first.plan.action).toBe("add")
    expect(second.plan.action).toBe("none")
    expect(second.feeLineCount).toBe(1)
    expect(second.total).toBe(13_950)
  })

  it("switching away from cash on delivery takes the fee back off", () => {
    const subject = cart([{ unit_price: 10_000 }])

    subject.settle({ role: "GLS_NORMAL", paymentRole: "COD" })
    const afterSwitch = subject.settle({
      role: "GLS_NORMAL",
      paymentRole: "ONLINE_CARD",
    })

    expect(afterSwitch.plan.action).toBe("remove")
    expect(afterSwitch.feeLineCount).toBe(0)
    expect(afterSwitch.total).toBe(13_500)
  })

  it("switching to a delivery that may not be paid on delivery takes the fee off too", () => {
    // The selection never changed; the shipping method made it ineligible.
    const subject = cart([{ unit_price: 10_000 }])

    subject.settle({ role: "GLS_NORMAL", paymentRole: "COD" })

    expect(allowedPaymentRolesFor(["GLS_HEAVY"])).not.toContain("COD")

    const afterHeavy = subject.settle({
      role: "GLS_HEAVY",
      paymentRole: "COD",
    })

    expect(afterHeavy.plan.action).toBe("remove")
    expect(afterHeavy.fee).toBe(0)
    expect(afterHeavy.total).toBe(16_900)
  })
})
