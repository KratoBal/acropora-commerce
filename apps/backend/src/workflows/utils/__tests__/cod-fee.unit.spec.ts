import {
  CASH_ON_DELIVERY_FEE_SETTING_KEY,
  DEFAULT_CASH_ON_DELIVERY_FEE_HUF,
  getCashOnDeliveryFee,
  normalizeCashOnDeliveryFee,
  resolveCashOnDeliveryFeeAmount,
} from "../cod-fee"

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
