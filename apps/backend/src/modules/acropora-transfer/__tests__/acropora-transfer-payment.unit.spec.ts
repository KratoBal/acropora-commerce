import { readFileSync } from "fs"
import { resolve } from "path"

import { PaymentSessionStatus } from "@medusajs/framework/utils"

import { BANK_TRANSFER_PROVIDER_ID } from "../index"
import AcroporaBankTransferService, {
  BANK_TRANSFER_RECEIPT_KEY,
  BANK_TRANSFER_STAGE_KEY,
  BANK_TRANSFER_STAGES,
  readBankTransferReceipt,
} from "../service"
import {
  buildProviderRoleMap,
  resolvePaymentRole,
} from "../../../workflows/utils/payment-providers"

/*
  PREPAYMENT BY BANK TRANSFER (card bb3a6bd5). WHAT TURNS THIS RED:
  - placing the order counts as paying (the order would look paid without money);
  - a recorded transfer does not make the session received, or a capture or a
    refund goes through with nothing received;
  - a receipt without a reference is accepted (it could not be traced back);
  - the provider id the role map is told about is not the one Medusa registers;
  - the transfer provider takes the role of pay-at-store, or the other way round.
*/
const provider = () => new AcroporaBankTransferService({}, {})

const receipt = { reference: "OTP-2026-10-07-0013", received_at: "2026-10-07" }
const withReceipt = (data: Record<string, unknown> = {}) => ({
  ...data,
  [BANK_TRANSFER_RECEIPT_KEY]: receipt,
})

describe("the bank transfer provider", () => {
  it("is registered as pp_acropora_transfer: identifier acropora, id transfer in medusa-config", () => {
    expect(AcroporaBankTransferService.identifier).toBe("acropora")
    const config = readFileSync(resolve(__dirname, "../../../../medusa-config.ts"), "utf8")
    expect(config).toMatch(
      /resolve: "\.\/src\/modules\/acropora-transfer",\s*id: "transfer",/
    )
    expect(BANK_TRANSFER_PROVIDER_ID).toBe(
      `pp_${AcroporaBankTransferService.identifier}_transfer`
    )
  })

  it("placing the order is not paying: initiated and authorized as awaiting the transfer", async () => {
    const started = await provider().initiatePayment({
      amount: 1000,
      currency_code: "huf",
    } as never)
    expect(started.data?.[BANK_TRANSFER_STAGE_KEY]).toBe(
      BANK_TRANSFER_STAGES.AWAITING_TRANSFER
    )
    const authorized = await provider().authorizePayment({ data: {} } as never)
    expect(authorized.status).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
    expect(authorized.data?.[BANK_TRANSFER_STAGE_KEY]).toBe(
      BANK_TRANSFER_STAGES.AWAITING_TRANSFER
    )
    const status = await provider().getPaymentStatus({ data: {} } as never)
    expect(status.status).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
  })

  it("a recorded transfer makes it received", async () => {
    const authorized = await provider().authorizePayment({
      data: withReceipt(),
    } as never)
    expect(authorized.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(authorized.data?.[BANK_TRANSFER_STAGE_KEY]).toBe(
      BANK_TRANSFER_STAGES.RECEIVED
    )
    expect(authorized.data?.[BANK_TRANSFER_RECEIPT_KEY]).toEqual(receipt)
    const status = await provider().getPaymentStatus({
      data: withReceipt(),
    } as never)
    expect(status.status).toBe(PaymentSessionStatus.AUTHORIZED)
  })

  it("no capture and no refund while nothing has been received", async () => {
    await expect(
      provider().capturePayment({ data: {} } as never)
    ).rejects.toThrow(/Nothing has been received/)
    await expect(
      provider().refundPayment({ data: {}, amount: 1000 } as never)
    ).rejects.toThrow(/nothing to refund/)
    await expect(
      provider().capturePayment({ data: withReceipt() } as never)
    ).resolves.toEqual({ data: withReceipt() })
  })

  it("refuses a receipt without a reference, and one that is not an object", () => {
    expect(() =>
      readBankTransferReceipt({ [BANK_TRANSFER_RECEIPT_KEY]: { reference: "  " } })
    ).toThrow(/non-empty reference/)
    expect(() =>
      readBankTransferReceipt({ [BANK_TRANSFER_RECEIPT_KEY]: "OTP-1" })
    ).toThrow(/must be an object/)
    expect(readBankTransferReceipt({})).toBeNull()
  })

  it("a cancelled session says so", async () => {
    const cancelled = await provider().cancelPayment({ data: {} } as never)
    expect(cancelled.data?.[BANK_TRANSFER_STAGE_KEY]).toBe(
      BANK_TRANSFER_STAGES.CANCELED
    )
  })

  it("its id maps to BANK_TRANSFER, apart from pay-at-store's system provider", () => {
    const map = buildProviderRoleMap({
      ACROPORA_PP_PAY_AT_STORE: "pp_system_default",
      ACROPORA_PP_BANK_TRANSFER: BANK_TRANSFER_PROVIDER_ID,
    } as NodeJS.ProcessEnv)
    expect(resolvePaymentRole(BANK_TRANSFER_PROVIDER_ID, map)).toBe("BANK_TRANSFER")
    expect(resolvePaymentRole("pp_system_default", map)).toBe("PAY_AT_STORE")
  })
})
