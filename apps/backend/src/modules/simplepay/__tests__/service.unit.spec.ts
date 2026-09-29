import { PaymentSessionStatus } from "@medusajs/framework/utils"

import { SimplePayClient } from "../client"
import SimplePayProviderService, {
  SIMPLEPAY_DATA_KEY,
  simplePayStatusToSession,
} from "../service"
import { sessionIdOfOrderRef } from "../ipn"
import { signSimplePay } from "../signature"

const KEY = "teszt-kulcs-nem-valodi"
const OPTIONS = {
  merchant: "TESZTMERCHANT",
  secretKey: KEY,
  backUrl: "https://shop-staging.acropora.hu/hu/checkout/simplepay",
}

/** A fake SimplePay: answers per endpoint, signed like the real one. */
const bolt = (answers: Record<string, object>) => {
  const calls: { endpoint: string; body: Record<string, unknown> }[] = []
  const fetcher = async (url: string, init: { body: string }) => {
    const endpoint = url.split("/").pop()!
    calls.push({ endpoint, body: JSON.parse(init.body) })
    const text = JSON.stringify(answers[endpoint] ?? {})
    return {
      ok: true,
      status: 200,
      text: async () => text,
      headers: { get: () => signSimplePay(text, KEY) },
    }
  }
  const service = new SimplePayProviderService({}, OPTIONS).withClient(
    new SimplePayClient({ merchant: OPTIONS.merchant, secretKey: KEY, sandbox: true }, fetcher as never)
  )
  return { service, calls }
}

const INVOICE = {
  name: "Teszt Elek",
  country: "HU",
  city: "Budapest",
  zip: "1111",
  address: "Minta utca 1.",
}
const STARTED = {
  transactionId: 501234567,
  paymentUrl: "https://sandbox.simplepay.hu/pay/pay/pspHU/abc",
  timeout: "2026-09-29T20:30:00+02:00",
  total: 4950,
}
const withTransaction = (status?: string) => ({
  [SIMPLEPAY_DATA_KEY]: { transactionId: 501234567, orderRef: "payses_1-x", total: 4950, status },
})

/**
 * THE SIMPLEPAY PROVIDER (P4-3a). What must fail: a start with the amount or
 * the back URL taken from anywhere but ours; a start without the billing data
 * 3DS needs; a HUF amount that is not whole; a payment believed without a
 * FINISHED status; a cancel that tries to cancel paid money; an unconfigured
 * provider that calls out.
 */
describe("starting a SimplePay payment", () => {
  it("starts with our amount, back URL and one-step card payment, and keeps the facts", async () => {
    const { service, calls } = bolt({ start: STARTED })

    const result = await service.initiatePayment({
      amount: 4950,
      currency_code: "huf",
      data: {
        session_id: "payses_1",
        customer_email: "vevo@example.hu",
        invoice: INVOICE,
        url: "https://tamado.example/elvisz",
      },
    } as never)

    expect(calls[0].endpoint).toBe("start")
    expect(calls[0].body).toMatchObject({
      currency: "HUF",
      customerEmail: "vevo@example.hu",
      language: "HU",
      methods: ["CARD"],
      total: "4950",
      url: OPTIONS.backUrl,
      twoStep: false,
      invoice: { ...INVOICE, country: "hu" },
    })
    // The IPN finds the session again from this orderRef (P4-3b).
    expect(sessionIdOfOrderRef(String(calls[0].body.orderRef))).toBe("payses_1")
    expect(String(calls[0].body.timeout)).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+00:00$/)
    expect(result.id).toBe("501234567")
    expect(result.data?.[SIMPLEPAY_DATA_KEY]).toMatchObject({
      transactionId: 501234567,
      paymentUrl: STARTED.paymentUrl,
    })
  })

  it("takes the email from the logged-in customer when the data has none", async () => {
    const { service, calls } = bolt({ start: STARTED })
    await service.initiatePayment({
      amount: 1000,
      currency_code: "huf",
      data: { session_id: "payses_2", invoice: INVOICE },
      context: { customer: { email: "fiok@example.hu" } },
    } as never)
    expect(calls[0].body.customerEmail).toBe("fiok@example.hu")
  })

  it("refuses without the billing address, with a non-whole amount, or without a back URL", async () => {
    const { service, calls } = bolt({ start: STARTED })
    await expect(
      service.initiatePayment({ amount: 1000, currency_code: "huf", data: { customer_email: "a@b.hu" } } as never)
    ).rejects.toThrow("billing address")
    await expect(
      service.initiatePayment({
        amount: 1000.5,
        currency_code: "huf",
        data: { customer_email: "a@b.hu", invoice: INVOICE },
      } as never)
    ).rejects.toThrow("whole number")
    const noBack = new SimplePayProviderService({}, { ...OPTIONS, backUrl: "" })
    await expect(
      noBack.initiatePayment({ amount: 1000, currency_code: "huf", data: { customer_email: "a@b.hu", invoice: INVOICE } } as never)
    ).rejects.toThrow("back URL")
    expect(calls).toEqual([])
  })

  it("an unconfigured provider refuses before calling anyone", async () => {
    const service = new SimplePayProviderService({}, { backUrl: OPTIONS.backUrl })
    await expect(
      service.initiatePayment({ amount: 1000, currency_code: "huf", data: { customer_email: "a@b.hu", invoice: INVOICE } } as never)
    ).rejects.toThrow("not configured")
  })

  it("the live URL needs sandbox set to exactly false", () => {
    expect(SimplePayProviderService.configOf({ ...OPTIONS })?.sandbox).toBe(true)
    expect(SimplePayProviderService.configOf({ ...OPTIONS, sandbox: "true" })?.sandbox).toBe(true)
    expect(SimplePayProviderService.configOf({ ...OPTIONS, sandbox: "no" })?.sandbox).toBe(true)
    expect(SimplePayProviderService.configOf({ ...OPTIONS, sandbox: "false" })?.sandbox).toBe(false)
  })
})

describe("the transaction status", () => {
  it.each([
    ["FINISHED", PaymentSessionStatus.CAPTURED],
    ["AUTHORIZED", PaymentSessionStatus.AUTHORIZED],
    ["INIT", PaymentSessionStatus.PENDING],
    ["INPAYMENT", PaymentSessionStatus.PENDING],
    ["TIMEOUT", PaymentSessionStatus.CANCELED],
    ["CANCELLED", PaymentSessionStatus.CANCELED],
    ["NOTAUTHORIZED", PaymentSessionStatus.CANCELED],
    ["UJ_ISMERETLEN", PaymentSessionStatus.ERROR],
  ])("%s reads as %s", (status, expected) => {
    expect(simplePayStatusToSession(status)).toBe(expected)
  })

  it("authorizing asks SimplePay, and only FINISHED is money", async () => {
    const { service, calls } = bolt({
      query: { transactions: [{ transactionId: 501234567, status: "FINISHED" }] },
    })
    const result = await service.authorizePayment({ data: withTransaction() } as never)
    expect(calls[0]).toMatchObject({ endpoint: "query", body: { transactionIds: ["501234567"] } })
    expect(result.status).toBe(PaymentSessionStatus.CAPTURED)

    const { service: unpaid } = bolt({
      query: { transactions: [{ transactionId: 501234567, status: "INIT" }] },
    })
    expect((await unpaid.authorizePayment({ data: withTransaction() } as never)).status).toBe(
      PaymentSessionStatus.PENDING
    )
  })

  it("capturing an unpaid transaction is refused", async () => {
    const { service } = bolt({
      query: { transactions: [{ transactionId: 501234567, status: "INIT" }] },
    })
    await expect(service.capturePayment({ data: withTransaction() } as never)).rejects.toThrow(
      "not FINISHED"
    )
  })
})

describe("refund, cancel and a changed amount", () => {
  it("refunds the given whole amount on the transaction, and keeps the record", async () => {
    const answer = { refundTransactionId: 777, refundTotal: 1000, remainingTotal: 3950 }
    const { service, calls } = bolt({ refund: answer })
    const result = await service.refundPayment({ data: withTransaction("FINISHED"), amount: 1000 } as never)
    expect(calls[0]).toMatchObject({
      endpoint: "refund",
      body: { transactionId: "501234567", refundTotal: 1000, currency: "HUF" },
    })
    expect(result.data?.simplepay_refunds).toEqual([answer])
  })

  it("cancels an unpaid (INIT) transaction, and never a paid one", async () => {
    const init = bolt({ query: { transactions: [{ transactionId: 501234567, status: "INIT" }] } })
    await init.service.cancelPayment({ data: withTransaction() } as never)
    expect(init.calls.map((c) => c.endpoint)).toEqual(["query", "transactioncancel"])

    const paid = bolt({ query: { transactions: [{ transactionId: 501234567, status: "FINISHED" }] } })
    await paid.service.cancelPayment({ data: withTransaction() } as never)
    expect(paid.calls.map((c) => c.endpoint)).toEqual(["query"])
  })

  it("the same amount keeps the transaction; a changed one starts a new one", async () => {
    const same = bolt({ start: STARTED })
    await same.service.updatePayment({ data: withTransaction(), amount: 4950, currency_code: "huf" } as never)
    expect(same.calls).toEqual([])

    const changed = bolt({ start: { ...STARTED, total: 6000 } })
    await changed.service.updatePayment({
      data: { ...withTransaction(), session_id: "payses_1", customer_email: "a@b.hu", invoice: INVOICE },
      amount: 6000,
      currency_code: "huf",
    } as never)
    expect(changed.calls.map((c) => c.endpoint)).toEqual(["start"])
    expect(changed.calls[0].body.total).toBe("6000")
  })
})
