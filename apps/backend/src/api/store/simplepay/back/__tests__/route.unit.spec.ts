const finishSimplePayOrder = jest.fn()
const rejoinAfterUnpaidSimplePay = jest.fn()
jest.mock("../../../../../workflows/utils/simplepay-finish", () => ({
  finishSimplePayOrder: (...a: unknown[]) => finishSimplePayOrder(...a),
}))
jest.mock("../../../../../workflows/utils/simplepay-rejoin", () => ({
  rejoinAfterUnpaidSimplePay: (...a: unknown[]) => rejoinAfterUnpaidSimplePay(...a),
}))

import { signSimplePay } from "../../../../../modules/simplepay/signature"
import { POST, simplePayClientFactory } from "../route"

const KEY = "teszt-kulcs-nem-valodi"
const savedEnv = { ...process.env }
const realCreate = simplePayClientFactory.create
let queried: string | undefined
let queriedIds: unknown[] = []

beforeEach(() => {
  process.env.SIMPLEPAY_MERCHANT = "TESZTMERCHANT"
  process.env.SIMPLEPAY_SECRET_KEY = KEY
  finishSimplePayOrder.mockReset()
  rejoinAfterUnpaidSimplePay.mockReset()
  queriedIds = []
  simplePayClientFactory.create = () =>
    ({
      call: async (_endpoint: string, body: { transactionIds: unknown[] }) => {
        queriedIds.push(...body.transactionIds)
        return { transactions: queried ? [{ transactionId: 501234567, status: queried, total: 13450 }] : [] }
      },
    }) as never
})
afterAll(() => {
  process.env = savedEnv
  simplePayClientFactory.create = realCreate
})

/** A return as SimplePay signs it: `s` is the HMAC of the decoded JSON of `r`. */
const back = (event: string, merchant = "TESZTMERCHANT") => {
  const json = JSON.stringify({ r: 0, t: 501234567, e: event, m: merchant, o: "payses_1-x" })
  return { r: Buffer.from(json).toString("base64"), s: signSimplePay(json, KEY) }
}

const call = async (body: unknown) => {
  const res = {
    statusCode: 200,
    sent: undefined as any,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(b: unknown) {
      this.sent = b
    },
  }
  const logger = { warn: jest.fn() }
  await POST({ body, scope: { resolve: () => logger } } as never, res as never)
  return { res, logger }
}

/**
 * THE CUSTOMER'S RETURN FROM SIMPLEPAY (P4-3c3). What must fail: the event
 * believed instead of a query; a split put back while its payment went
 * through; an unpaid split left split; a forged or foreign return acted on.
 */
describe("POST /store/simplepay/back", () => {
  it("a paid transaction makes the orders, whatever the event says", async () => {
    queried = "FINISHED"
    finishSimplePayOrder.mockResolvedValue({ order_ids: ["order_1", "order_2"] })
    const { res } = await call(back("CANCEL"))
    expect(queriedIds).toEqual(["501234567"])
    expect(finishSimplePayOrder.mock.calls[0][1]).toMatchObject({ orderRef: "payses_1-x", transactionId: 501234567 })
    expect(res.sent).toEqual({ event: "CANCEL", status: "paid", order_ids: ["order_1", "order_2"] })
    expect(rejoinAfterUnpaidSimplePay).not.toHaveBeenCalled()
  })

  it("paid, but the orders cannot be made now: still paid, the IPN makes them", async () => {
    queried = "FINISHED"
    finishSimplePayOrder.mockRejectedValue(new Error("locked"))
    const { res, logger } = await call(back("SUCCESS"))
    expect(res.sent).toEqual({ event: "SUCCESS", status: "paid", order_ids: [] })
    expect(logger.warn.mock.calls[0][0]).toContain("locked")
  })

  it.each([
    ["CANCELLED", "CANCEL"],
    ["TIMEOUT", "TIMEOUT"],
    ["NOTAUTHORIZED", "FAIL"],
    ["INIT", "CANCEL"],
  ])("%s after %s puts the split back", async (status, event) => {
    queried = status
    rejoinAfterUnpaidSimplePay.mockResolvedValue({ rejoined: true, cart_id: "cart_1" })
    const { res } = await call(back(event))
    expect(rejoinAfterUnpaidSimplePay.mock.calls[0].slice(1)).toEqual(["payses_1-x", 501234567])
    expect(res.sent).toEqual({ event, status: "not_paid", rejoined: true, cart_id: "cart_1" })
    expect(finishSimplePayOrder).not.toHaveBeenCalled()
  })

  it.each([
    ["INIT", "SUCCESS"],
    ["INPAYMENT", "CANCEL"],
  ])("%s after %s changes nothing: pending", async (status, event) => {
    queried = status
    const { res } = await call(back(event))
    expect(res.sent).toEqual({ event, status: "pending" })
    expect(rejoinAfterUnpaidSimplePay).not.toHaveBeenCalled()
    expect(finishSimplePayOrder).not.toHaveBeenCalled()
  })

  it("refuses a forged, foreign or empty return, and an unconfigured shop, before asking SimplePay", async () => {
    queried = "CANCELLED"
    expect((await call({ ...back("CANCEL"), s: "rossz" })).res.statusCode).toBe(401)
    expect((await call(back("CANCEL", "MASIKBOLT"))).res.statusCode).toBe(400)
    expect((await call({})).res.statusCode).toBe(400)
    delete process.env.SIMPLEPAY_SECRET_KEY
    expect((await call(back("CANCEL"))).res.statusCode).toBe(503)
    expect(queriedIds).toEqual([])
    expect(rejoinAfterUnpaidSimplePay).not.toHaveBeenCalled()
  })
})
