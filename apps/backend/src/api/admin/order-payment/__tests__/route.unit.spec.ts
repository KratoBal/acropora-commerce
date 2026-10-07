import { getHttpResponseFromError } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GET } from "../[order_id]/route"
import { POST as RELEASE } from "../[order_id]/release-hold/route"
import { POST as LINK } from "../[order_id]/payment-link/route"
import { POST as TRANSFER } from "../[order_id]/transfer-receipt/route"
import { loadOrderPaymentSide } from "../../../../workflows/utils/order-payment/operations"
import { releaseHold } from "../../../../workflows/utils/order-payment/release-hold"
import { sendPaymentLink } from "../../../../workflows/utils/order-payment/payment-link"
import { recordTransferReceipt } from "../../../../workflows/utils/order-payment/transfer-receipt"
import { notifyHoldReleased } from "../../../../workflows/utils/webshop-mail/payment-notify"

jest.mock("../../../../workflows/utils/order-payment/operations", () => ({
  loadOrderPaymentSide: jest.fn(),
  releaseHoldOperations: jest.fn(() => "ops"),
  paymentLinkOperations: jest.fn(() => "link-ops"),
}))
jest.mock("../../../../workflows/utils/order-payment/payment-link", () => ({ sendPaymentLink: jest.fn() }))
jest.mock("../../../../workflows/utils/order-payment/link-config", () => ({
  requirePaymentLinkConfig: () => ({ secret: "s", baseUrl: "https://example.test" }),
}))
jest.mock("../../../../workflows/utils/order-payment/release-hold", () => ({ releaseHold: jest.fn() }))
jest.mock("../../../../workflows/utils/order-payment/transfer-receipt", () => ({ recordTransferReceipt: jest.fn() }))
jest.mock("../../../../workflows/utils/order-payment/transfer-receipt-operations", () => ({
  transferReceiptOperations: jest.fn(() => "transfer-ops"),
}))
jest.mock("../../../../workflows/utils/webshop-mail/payment-notify", () => ({
  notifyHoldReleased: jest.fn(async () => ({ sent: true })),
}))

/**
 * THE OS'S TWO CALLS (nautilus 26484 bound them as agreed). What must fail:
 * the GET not in the agreed `{ state, hold, link, paid_at }` shape, or 200 for
 * an unknown order; the release mailing when "Vevő értesítése" is unticked;
 * a mixed cart's mail going from the pickup half, or not naming it; the
 * answer missing `state` or `notification`.
 */
const respond = () => {
  const sent: unknown[] = []
  const statuses: number[] = []
  const res = {
    json: (body: unknown) => void sent.push(body),
    status: (code: number) => {
      statuses.push(code)
      return res
    },
  }
  return { sent, statuses, res }
}

beforeEach(() => jest.clearAllMocks())

describe("GET /admin/order-payment/:order_id", () => {
  it("answers the agreed shape", async () => {
    ;(loadOrderPaymentSide as jest.Mock).mockResolvedValue({
      order_id: "order_1",
      display_id: 44,
      metadata: null,
      payments: [
        {
          id: "pay_1",
          provider_id: "pp_stripe_stripe",
          amount: 22150,
          created_at: "2026-10-05T08:00:00.000Z",
          canceled_at: null,
          captured: 0,
          data: null,
          collection_id: "col_1",
          collection_status: "authorized",
        },
      ],
    })
    const { sent, res } = respond()
    await GET({ params: { order_id: "order_1" }, scope: {} } as never, res as never)
    expect(sent).toEqual([
      {
        state: "hold",
        hold: { authorized_at: "2026-10-05T08:00:00.000Z", expires_at: "2026-10-12T08:00:00.000Z", amount: 22150 },
        link: null,
        paid_at: null,
        due: null,
      },
    ])
  })

  it("an unknown order is a 404", async () => {
    ;(loadOrderPaymentSide as jest.Mock).mockResolvedValue(null)
    await expect(GET({ params: { order_id: "nope" }, scope: {} } as never, respond().res as never)).rejects.toMatchObject({
      type: MedusaError.Types.NOT_FOUND,
    })
  })
})

describe("POST /admin/order-payment/:order_id/release-hold", () => {
  const released = {
    state: "awaiting_payment",
    released: true,
    amount: 21950,
    released_at: "2026-10-05T19:00:00.000Z",
    orders: [
      { order_id: "order_ship", display_id: 45 },
      { order_id: "order_pick", display_id: 46 },
    ],
  }
  const call = async (body: Record<string, unknown>) => {
    const { sent, res } = respond()
    await RELEASE({ params: { order_id: "order_pick" }, scope: "scope", validatedBody: body } as never, res as never)
    return sent[0]
  }
  const callWithStatus = async (body: Record<string, unknown>) => {
    const { sent, statuses, res } = respond()
    await RELEASE({ params: { order_id: "order_pick" }, scope: "scope", validatedBody: body } as never, res as never)
    return { status: statuses[0], body: sent[0] }
  }

  it("releases, then mails from the shipped half naming the pickup one", async () => {
    ;(releaseHold as jest.Mock).mockResolvedValue(released)
    expect(await call({})).toEqual({
      state: "awaiting_payment",
      notification: { sent: true },
      released: true,
      amount: 21950,
      orders: released.orders,
    })
    expect(releaseHold).toHaveBeenCalledWith("order_pick", "ops")
    expect(notifyHoldReleased).toHaveBeenCalledWith("scope", {
      orderId: "order_ship",
      releasedAt: "2026-10-05T19:00:00.000Z",
      amount: 21950,
      pickupDisplayId: 46,
    })
  })

  it("an unticked \"Vevő értesítése\" releases without a mail", async () => {
    ;(releaseHold as jest.Mock).mockResolvedValue({ ...released, orders: [released.orders[0]] })
    expect(await call({ notify_customer: false })).toMatchObject({
      state: "awaiting_payment",
      notification: { sent: false, reason: "not_requested" },
    })
    expect(notifyHoldReleased).not.toHaveBeenCalled()
  })

  it("a refused release is a 409 with its own sentence, and no mail goes", async () => {
    ;(releaseHold as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.CONFLICT, "már levontuk"))
    expect(await callWithStatus({})).toEqual({
      status: 409,
      body: { type: "conflict", code: "refused", message: "már levontuk" },
    })
    expect(notifyHoldReleased).not.toHaveBeenCalled()
  })

  it("an unknown order still goes to the error handler", async () => {
    ;(releaseHold as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.NOT_FOUND, "nincs ilyen"))
    await expect(call({})).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
  })
})

/**
 * THE REFUSAL'S SENTENCE REACHES THE OS (stage trial 2026-10-07, order #56).
 * What must fail: the route letting a CONFLICT go to Medusa's error handler,
 * which answers the fixed English line instead of the Hungarian refusal.
 */
describe("POST /admin/order-payment/:order_id/transfer-receipt", () => {
  const sentence = "Az összeg eltér: a rendelés 5950 HUF, a beérkezés 5900."
  const call = async () => {
    const { sent, statuses, res } = respond()
    await TRANSFER(
      { params: { order_id: "order_56" }, scope: "scope", validatedBody: { reference: "R", received_at: "2026-10-07", amount: 5900 } } as never,
      res as never
    )
    return { status: statuses[0], body: sent[0] }
  }

  it("the handler's own mapping would lose the sentence: this is why the route answers", () => {
    const mapped = getHttpResponseFromError(new MedusaError(MedusaError.Types.CONFLICT, sentence))
    expect(mapped.statusCode).toBe(409)
    expect(mapped.body.message).not.toBe(sentence)
  })

  it("a refusal is a 409 with the Hungarian sentence in the body", async () => {
    ;(recordTransferReceipt as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.CONFLICT, sentence))
    expect(await call()).toEqual({ status: 409, body: { type: "conflict", code: "refused", message: sentence } })
  })

  it("a recorded receipt answers the result as it was", async () => {
    ;(recordTransferReceipt as jest.Mock).mockResolvedValue({ recorded: true, payment_id: "pay_1" })
    expect(await call()).toEqual({ status: undefined, body: { recorded: true, payment_id: "pay_1" } })
    expect(recordTransferReceipt).toHaveBeenCalledWith(
      "order_56",
      { reference: "R", received_at: "2026-10-07", amount: 5900 },
      "transfer-ops"
    )
  })

  it("an unknown order still goes to the error handler", async () => {
    ;(recordTransferReceipt as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.NOT_FOUND, "Order x was not found"))
    await expect(call()).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
  })
})

describe("POST /admin/order-payment/:order_id/payment-link", () => {
  it("a refused link is a 409 with its own sentence", async () => {
    const sentence = "Ehhez a rendeléshez most nem küldhető fizetési link."
    ;(sendPaymentLink as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.CONFLICT, sentence))
    const { sent, statuses, res } = respond()
    await LINK({ params: { order_id: "order_1" }, scope: "scope", validatedBody: {} } as never, res as never)
    expect({ status: statuses[0], body: sent[0] }).toEqual({
      status: 409,
      body: { type: "conflict", code: "refused", message: sentence },
    })
  })
})
