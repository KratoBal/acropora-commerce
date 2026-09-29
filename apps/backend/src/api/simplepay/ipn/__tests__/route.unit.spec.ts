const finishSimplePayOrder = jest.fn()
jest.mock("../../../../workflows/utils/simplepay-finish", () => ({
  finishSimplePayOrder: (...args: unknown[]) => finishSimplePayOrder(...args),
}))

import middlewares from "../../../middlewares"
import { signSimplePay } from "../../../../modules/simplepay/signature"
import { POST } from "../route"

const KEY = "teszt-kulcs-nem-valodi"
const savedEnv = { ...process.env }
beforeEach(() => {
  process.env.SIMPLEPAY_MERCHANT = "TESZTMERCHANT"
  process.env.SIMPLEPAY_SECRET_KEY = KEY
  finishSimplePayOrder.mockReset()
})
afterAll(() => {
  process.env = savedEnv
})

const ipn = (status: string) =>
  JSON.stringify({ salt: "s".repeat(32), orderRef: "payses_1-x", method: "CARD", merchant: "TESZTMERCHANT", transactionId: 501234567, status })

const call = async (body: string, signature: string) => {
  const logger = { error: jest.fn() }
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    sent: undefined as unknown,
    status(code: number) { this.statusCode = code; return this },
    json(b: unknown) { this.sent = b },
    send(b: unknown) { this.sent = b },
    setHeader(name: string, value: string) { this.headers[name] = value },
  }
  await POST(
    {
      rawBody: Buffer.from(body),
      // A parsed body that differs from the raw one must not matter.
      body: { status: "FINISHED", merchant: "TESZTMERCHANT" },
      headers: { signature },
      scope: { resolve: () => logger },
    } as never,
    res as never
  )
  return { res, logger }
}

/**
 * THE IPN ROUTE (P4-3b). What must fail: a FINISHED IPN not making the order;
 * a failed order answered as success (SimplePay would stop retrying); another
 * status making an order; an unsigned IPN acted on; the raw body not kept.
 */
describe("POST /simplepay/ipn", () => {
  it("a FINISHED IPN makes the order, and the answer is signed", async () => {
    finishSimplePayOrder.mockResolvedValue({ order_ids: ["order_1"] })
    const body = ipn("FINISHED")
    const { res } = await call(body, signSimplePay(body, KEY))
    expect(finishSimplePayOrder).toHaveBeenCalledTimes(1)
    expect(finishSimplePayOrder.mock.calls[0][1]).toMatchObject({ transactionId: 501234567 })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(String(res.sent))).toMatchObject({ status: "FINISHED", receiveDate: expect.any(String) })
    expect(res.headers.Signature).toBe(signSimplePay(String(res.sent), KEY))
  })

  it("a failed order is an error, so SimplePay retries", async () => {
    finishSimplePayOrder.mockRejectedValue(new Error("the cart is mixed"))
    const body = ipn("FINISHED")
    const { res, logger } = await call(body, signSimplePay(body, KEY))
    expect(res.statusCode).toBe(500)
    expect(res.headers.Signature).toBeUndefined()
    expect(logger.error.mock.calls[0][0]).toContain("the cart is mixed")
  })

  it("another status is acknowledged, and makes no order", async () => {
    const body = ipn("CANCELLED")
    const { res } = await call(body, signSimplePay(body, KEY))
    expect(finishSimplePayOrder).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
  })

  it("an IPN whose raw body does not match its signature is refused, whatever the parsed body says", async () => {
    const { res } = await call(ipn("FINISHED"), "rossz")
    expect(res.statusCode).toBe(401)
    expect(finishSimplePayOrder).not.toHaveBeenCalled()
  })

  it("the route keeps the raw body", () => {
    const route = middlewares.routes?.find((r) => r.matcher === "/simplepay/ipn") as
      | { bodyParser?: { preserveRawBody?: boolean } }
      | undefined
    expect(route?.bodyParser?.preserveRawBody).toBe(true)
  })
})
