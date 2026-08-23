import { readFileSync } from "fs"
import { resolve } from "path"

import { PaymentSessionStatus } from "@medusajs/framework/utils"

import { CASH_ON_DELIVERY_PROVIDER_ID } from "../../index"
import AcroporaCashOnDeliveryService, {
  CASH_ON_DELIVERY_OUTCOMES,
  CASH_ON_DELIVERY_REMITTANCE_KEY,
  CASH_ON_DELIVERY_STAGE_KEY,
  CASH_ON_DELIVERY_STAGES,
  readCashOnDeliveryRemittance,
} from "../../service"
import { planCashOnDeliveryFee } from "../../../../workflows/utils/cod-fee-reconciliation"
import { resolveCashOnDeliveryFeeAmount } from "../../../../workflows/utils/cod-fee"
import {
  ACROPORA_FEE_TYPE_METADATA_KEY,
  CASH_ON_DELIVERY_FEE_TYPE,
} from "../../../../workflows/utils/cod-fee-line-item"
import { ACROPORA_LINE_ITEM_KIND_METADATA_KEY } from "../../../../workflows/utils/goods-total"
import { allowedPaymentRolesFor } from "../../../../workflows/utils/payment-eligibility"
import {
  buildProviderRoleMap,
  resolvePaymentRole,
} from "../../../../workflows/utils/payment-providers"

const provider = () => new AcroporaCashOnDeliveryService({}, {})

const remittance = { reference: "GLS-2026-08-23-0042", received_at: "2026-08-23" }

const withRemittance = (data: Record<string, unknown> = {}) => ({
  ...data,
  [CASH_ON_DELIVERY_REMITTANCE_KEY]: remittance,
})

/** A cart that selected cash on delivery through the real provider id. */
const envWithCodProvider = {
  ACROPORA_PP_COD: CASH_ON_DELIVERY_PROVIDER_ID,
  ACROPORA_PP_ONLINE_CARD: "pp_simplepay_simplepay",
} as NodeJS.ProcessEnv

const feeLine = (id: string, unit_price = 450) => ({
  id,
  unit_price,
  metadata: {
    [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee",
    [ACROPORA_FEE_TYPE_METADATA_KEY]: CASH_ON_DELIVERY_FEE_TYPE,
  },
})

const goodsLine = { id: "cali_goods", unit_price: 10_000, quantity: 1 }

/**
 * What a cart owes when it selected `providerId` and ships with `role`.
 * This is the same chain the runtime walks: provider id, payment role,
 * eligibility, amount.
 */
const feeDueFor = (providerId: string | null, role: "GLS_NORMAL" | "PICKUP") =>
  resolveCashOnDeliveryFeeAmount({
    selectedPaymentRole: resolvePaymentRole(
      providerId,
      buildProviderRoleMap(envWithCodProvider)
    ),
    allowedPaymentRoles: allowedPaymentRolesFor([role]),
    feeHuf: 450,
  })

describe("1. the provider id", () => {
  it("is composed from the service identifier and the configured id", () => {
    // Medusa builds `pp_${identifier}${id ? "_" + id : ""}` in the payment
    // module's provider loader. Both halves are asserted: the identifier here,
    // the configured id in the next test.
    expect(AcroporaCashOnDeliveryService.identifier).toBe("acropora")
    expect(CASH_ON_DELIVERY_PROVIDER_ID).toBe(
      `pp_${AcroporaCashOnDeliveryService.identifier}_cod`
    )
    expect(CASH_ON_DELIVERY_PROVIDER_ID).toBe("pp_acropora_cod")
  })

  it("is registered under that id, and not as the shared system provider", () => {
    // The provider id is historical: every cash-on-delivery order ever placed
    // carries it. A silent edit to this registration would change it for all
    // future orders while every constant above kept claiming the old one.
    const config = readFileSync(
      resolve(__dirname, "../../../../../medusa-config.ts"),
      "utf8"
    )

    expect(config).toContain('resolve: "./src/modules/acropora-payment"')
    expect(config).toMatch(
      /resolve: "\.\/src\/modules\/acropora-payment",\s*\n\s*id: "cod",/
    )
    // The built-in system provider must not be registered a second time under
    // our id either: its behaviour is fixed (it authorizes everything on the
    // spot), which is exactly the model this provider exists to avoid.
    expect(config).not.toMatch(/resolve: "[^"]*system[^"]*"/)
  })
})

describe("2. authorizing at checkout", () => {
  it("reports the payment as pending authorization", async () => {
    const result = await provider().authorizePayment({ data: {} })

    expect(result.status).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
  })

  it("marks the session as waiting for the remittance", async () => {
    const result = await provider().authorizePayment({ data: {} })

    expect(result.data?.[CASH_ON_DELIVERY_STAGE_KEY]).toBe(
      CASH_ON_DELIVERY_STAGES.AWAITING_REMITTANCE
    )
  })

  it("reports the payment as received once a remittance is recorded", async () => {
    const result = await provider().authorizePayment({
      data: withRemittance(),
    })

    expect(result.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(result.data?.[CASH_ON_DELIVERY_STAGE_KEY]).toBe(
      CASH_ON_DELIVERY_STAGES.REMITTED
    )
  })
})

describe("3. no payment record is created at checkout", () => {
  /**
   * Medusa creates the payment record only for `authorized` or `captured`.
   * On `pending_authorization` the module writes the session and returns null,
   * and cart completion carries on without a payment. So the guarantee that no
   * order is born looking paid rests on this provider never reporting either
   * of those two statuses before a remittance exists.
   */
  it("never reports authorized or captured before a remittance", async () => {
    const withoutRemittance = [
      {},
      { [CASH_ON_DELIVERY_STAGE_KEY]: CASH_ON_DELIVERY_STAGES.AWAITING_REMITTANCE },
      { unrelated: "value" },
    ]

    for (const data of withoutRemittance) {
      const result = await provider().authorizePayment({ data })

      expect(result.status).not.toBe(PaymentSessionStatus.AUTHORIZED)
      expect(result.status).not.toBe(PaymentSessionStatus.CAPTURED)
      expect(result.status).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
    }
  })

  it("refuses to capture money that has not arrived", async () => {
    await expect(provider().capturePayment({ data: {} })).rejects.toThrow(
      /only be captured once a remittance has been recorded/
    )
  })

  it("reports the session as still pending when asked", async () => {
    const status = await provider().getPaymentStatus({ data: {} })

    expect(status.status).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
  })

  it("refuses a remittance that cannot be traced to a settlement", async () => {
    expect(() =>
      readCashOnDeliveryRemittance({
        [CASH_ON_DELIVERY_REMITTANCE_KEY]: { reference: "  " },
      })
    ).toThrow(/non-empty reference/)

    expect(() =>
      readCashOnDeliveryRemittance({
        [CASH_ON_DELIVERY_REMITTANCE_KEY]: "GLS-0042",
      })
    ).toThrow(/must be an object/)
  })
})

describe("4. a cart that does not pay on delivery owes no fee", () => {
  it("owes nothing when the card provider is selected", () => {
    expect(feeDueFor("pp_simplepay_simplepay", "GLS_NORMAL")).toBe(0)
  })

  it("owes nothing when no payment method is selected yet", () => {
    expect(feeDueFor(null, "GLS_NORMAL")).toBe(0)
  })

  it("owes nothing when an unmapped provider is selected", () => {
    // An unknown provider is not guessed into a role. Guessing here would
    // charge a handling fee to a card payment.
    expect(feeDueFor("pp_system_default", "GLS_NORMAL")).toBe(0)
  })
})

describe("5. a cart that pays on delivery owes the fee", () => {
  it("owes the configured fee through the new provider id", () => {
    expect(feeDueFor(CASH_ON_DELIVERY_PROVIDER_ID, "GLS_NORMAL")).toBe(450)
  })

  it("adds the fee line to a cart that carries none", () => {
    const plan = planCashOnDeliveryFee({
      dueHuf: feeDueFor(CASH_ON_DELIVERY_PROVIDER_ID, "GLS_NORMAL"),
      items: [goodsLine],
    })

    expect(plan.action).toBe("add")
    expect(plan.amount).toBe(450)
  })

  it("owes nothing on a shipping method that may not be paid on delivery", () => {
    // Store pickup offers card and pay-at-store, never cash on delivery.
    expect(feeDueFor(CASH_ON_DELIVERY_PROVIDER_ID, "PICKUP")).toBe(0)
  })
})

describe("6. the duplicate protection still holds with the new provider", () => {
  it("adds nothing to a cart that already carries the fee", () => {
    const plan = planCashOnDeliveryFee({
      dueHuf: feeDueFor(CASH_ON_DELIVERY_PROVIDER_ID, "GLS_NORMAL"),
      items: [goodsLine, feeLine("cali_fee")],
    })

    expect(plan.action).toBe("none")
  })

  it("keeps one fee and removes the rest", () => {
    const plan = planCashOnDeliveryFee({
      dueHuf: feeDueFor(CASH_ON_DELIVERY_PROVIDER_ID, "GLS_NORMAL"),
      items: [feeLine("cali_b"), feeLine("cali_a")],
    })

    expect(plan.action).toBe("remove")
    expect(plan.removeIds).toEqual(["cali_b"])
  })

  it("takes the fee off when the payment method changes away", () => {
    const plan = planCashOnDeliveryFee({
      dueHuf: feeDueFor("pp_simplepay_simplepay", "GLS_NORMAL"),
      items: [goodsLine, feeLine("cali_fee")],
    })

    expect(plan.action).toBe("remove")
    expect(plan.removeIds).toEqual(["cali_fee"])
  })
})

describe("7. an undelivered parcel is not a refund", () => {
  it("names the three ways a cash-on-delivery order can end", () => {
    expect(Object.values(CASH_ON_DELIVERY_OUTCOMES)).toEqual([
      "remitted",
      "failed_delivery",
      "returned_after_payment",
    ])
  })

  it("refuses to refund an order where nothing was ever collected", async () => {
    await expect(
      provider().refundPayment({ data: {}, amount: 13_950 })
    ).rejects.toThrow(/nothing to refund/)
  })

  it("says which state an undelivered parcel ends in", async () => {
    // The message has to name the state, because whoever meets this error is
    // one click away from treating a failed delivery as a refund.
    await expect(
      provider().refundPayment({ data: {}, amount: 13_950 })
    ).rejects.toThrow(new RegExp(CASH_ON_DELIVERY_OUTCOMES.FAILED_DELIVERY))
  })

  it("cancels without pretending money moved", async () => {
    const result = await provider().cancelPayment({ data: {} })

    expect(result.data?.[CASH_ON_DELIVERY_STAGE_KEY]).toBe(
      CASH_ON_DELIVERY_STAGES.CANCELED
    )
  })

  it("refunds an order whose money did arrive", async () => {
    const result = await provider().refundPayment({
      data: withRemittance(),
      amount: 13_950,
    })

    expect(result.data?.[CASH_ON_DELIVERY_REMITTANCE_KEY]).toEqual(remittance)
  })
})
