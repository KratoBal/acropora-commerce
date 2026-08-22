import {
  CASH_ON_DELIVERY_FEE_SETTING_KEY,
  DEFAULT_CASH_ON_DELIVERY_FEE_HUF,
  getCashOnDeliveryFee,
  normalizeCashOnDeliveryFee,
  resolveCashOnDeliveryFeeAmount,
} from "../cod-fee"
import {
  CASH_ON_DELIVERY_FEE_MARKER,
  planCashOnDeliveryFee,
} from "../cod-fee-adjustment"

const containerWith = (rows: { key: string; value: unknown }[]) => ({
  resolve: () => ({
    listCommerceSettings: async (filters: { key: string }) =>
      rows.filter((r) => r.key === filters.key),
  }),
})

describe("cash-on-delivery fee configuration", () => {
  it("defaults to 450 HUF when nothing is stored", async () => {
    expect(DEFAULT_CASH_ON_DELIVERY_FEE_HUF).toBe(450)
    await expect(getCashOnDeliveryFee(containerWith([]))).resolves.toBe(450)
  })

  it("reads the stored value instead of the default", async () => {
    await expect(
      getCashOnDeliveryFee(
        containerWith([{ key: CASH_ON_DELIVERY_FEE_SETTING_KEY, value: "690" }])
      )
    ).resolves.toBe(690)
  })

  it("accepts zero, which waives the fee", async () => {
    await expect(
      getCashOnDeliveryFee(
        containerWith([{ key: CASH_ON_DELIVERY_FEE_SETTING_KEY, value: "0" }])
      )
    ).resolves.toBe(0)
    expect(normalizeCashOnDeliveryFee(0)).toBe(0)
  })

  it("rejects a negative fee", () => {
    expect(() => normalizeCashOnDeliveryFee(-1)).toThrow(/must not be negative/)
    expect(() => normalizeCashOnDeliveryFee("-450")).toThrow(
      /must not be negative/
    )
  })

  it("rejects a fractional fee, because HUF has no minor unit", () => {
    expect(() => normalizeCashOnDeliveryFee(450.5)).toThrow(/whole number/)
  })

  it("rejects a value that is not a number at all", () => {
    expect(() => normalizeCashOnDeliveryFee("nem szam")).toThrow(/must be a number/)
    expect(() => normalizeCashOnDeliveryFee(null)).toThrow(/must be a number/)
    expect(() => normalizeCashOnDeliveryFee(undefined)).toThrow(/must be a number/)
  })

  it("fails loudly on a stored but invalid value", async () => {
    // Charging a different amount than the one on the record is worse than
    // failing.
    await expect(
      getCashOnDeliveryFee(
        containerWith([{ key: CASH_ON_DELIVERY_FEE_SETTING_KEY, value: "-5" }])
      )
    ).rejects.toThrow(/must not be negative/)
  })
})

describe("when the fee applies", () => {
  const allowed = ["ONLINE_CARD", "COD"] as const

  it("applies when cash on delivery is selected and allowed", () => {
    expect(
      resolveCashOnDeliveryFeeAmount({
        selectedPaymentRole: "COD",
        allowedPaymentRoles: [...allowed],
        feeHuf: 450,
      })
    ).toBe(450)
  })

  it("does not apply to online card", () => {
    expect(
      resolveCashOnDeliveryFeeAmount({
        selectedPaymentRole: "ONLINE_CARD",
        allowedPaymentRoles: [...allowed],
        feeHuf: 450,
      })
    ).toBe(0)
  })

  it("does not apply to pay at store", () => {
    expect(
      resolveCashOnDeliveryFeeAmount({
        selectedPaymentRole: "PAY_AT_STORE",
        allowedPaymentRoles: ["ONLINE_CARD", "PAY_AT_STORE"],
        feeHuf: 450,
      })
    ).toBe(0)
  })

  it("does not apply when nothing is selected", () => {
    expect(
      resolveCashOnDeliveryFeeAmount({
        selectedPaymentRole: null,
        allowedPaymentRoles: [...allowed],
        feeHuf: 450,
      })
    ).toBe(0)
  })

  it("does not apply when shipping no longer allows cash on delivery", () => {
    // The customer picked COD, then switched to heavy delivery.
    expect(
      resolveCashOnDeliveryFeeAmount({
        selectedPaymentRole: "COD",
        allowedPaymentRoles: ["ONLINE_CARD"],
        feeHuf: 450,
      })
    ).toBe(0)
  })
})

describe("materializing the fee on the cart", () => {
  const feeAdjustment = (id: string, amount: number) => ({
    id,
    amount,
    code: null,
    provider_id: CASH_ON_DELIVERY_FEE_MARKER,
  })

  const promotionAdjustment = (id: string, amount: number) => ({
    id,
    amount,
    code: "SUMMER10",
    provider_id: null,
  })

  it("creates one negative adjustment, because Medusa subtracts adjustments", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [{ id: "sm_1", adjustments: [] }],
      feeAmount: 450,
    })

    expect(plan.toRemoveIds).toEqual([])
    expect(plan.toCreate).toHaveLength(1)
    expect(plan.toCreate[0]).toMatchObject({
      shipping_method_id: "sm_1",
      amount: -450,
      provider_id: CASH_ON_DELIVERY_FEE_MARKER,
    })
  })

  it("never sets a code, or the promotion engine would delete it", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [{ id: "sm_1", adjustments: [] }],
      feeAmount: 450,
    })

    expect("code" in plan.toCreate[0]).toBe(false)
  })

  it("is idempotent: a second pass changes nothing", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [
        { id: "sm_1", adjustments: [feeAdjustment("adj_1", -450)] },
      ],
      feeAmount: 450,
    })

    expect(plan).toEqual({ toRemoveIds: [], toCreate: [] })
  })

  it("applies once even if a duplicate slipped in", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [
        {
          id: "sm_1",
          adjustments: [feeAdjustment("adj_1", -450), feeAdjustment("adj_2", -450)],
        },
      ],
      feeAmount: 450,
    })

    expect(plan.toRemoveIds).toEqual(["adj_2"])
    expect(plan.toCreate).toEqual([])
  })

  it("puts the fee on exactly one shipping method", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [
        { id: "sm_b", adjustments: [] },
        { id: "sm_a", adjustments: [] },
      ],
      feeAmount: 450,
    })

    expect(plan.toCreate).toHaveLength(1)
    // Deterministic by id, so repeated runs do not move it around.
    expect(plan.toCreate[0].shipping_method_id).toBe("sm_a")
  })

  it("removes the fee when the amount drops to zero", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [
        { id: "sm_1", adjustments: [feeAdjustment("adj_1", -450)] },
      ],
      feeAmount: 0,
    })

    expect(plan.toRemoveIds).toEqual(["adj_1"])
    expect(plan.toCreate).toEqual([])
  })

  it("replaces the adjustment when the configured fee changes", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [
        { id: "sm_1", adjustments: [feeAdjustment("adj_1", -450)] },
      ],
      feeAmount: 690,
    })

    expect(plan.toRemoveIds).toEqual(["adj_1"])
    expect(plan.toCreate[0].amount).toBe(-690)
  })

  it("never touches a promotion adjustment", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [
        {
          id: "sm_1",
          adjustments: [promotionAdjustment("adj_promo", 300)],
        },
      ],
      feeAmount: 0,
    })

    expect(plan.toRemoveIds).toEqual([])
    expect(plan.toCreate).toEqual([])
  })

  it("removes an orphaned fee when the shipping method is gone", () => {
    const plan = planCashOnDeliveryFee({ shippingMethods: [], feeAmount: 450 })
    expect(plan).toEqual({ toRemoveIds: [], toCreate: [] })
  })

  it("survives null entries from the query layer", () => {
    const plan = planCashOnDeliveryFee({
      shippingMethods: [null, { id: "sm_1", adjustments: [null] }],
      feeAmount: 450,
    })

    expect(plan.toCreate[0].shipping_method_id).toBe("sm_1")
  })
})
