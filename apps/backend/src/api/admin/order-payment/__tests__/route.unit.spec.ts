import { MedusaError } from "@medusajs/framework/utils"

import { GET } from "../[order_id]/route"
import { POST as RELEASE } from "../[order_id]/release-hold/route"
import { loadOrderPaymentSide } from "../../../../workflows/utils/order-payment/operations"
import { releaseHold } from "../../../../workflows/utils/order-payment/release-hold"
import { notifyHoldReleased } from "../../../../workflows/utils/webshop-mail/payment-notify"

jest.mock("../../../../workflows/utils/order-payment/operations", () => ({
  loadOrderPaymentSide: jest.fn(),
  releaseHoldOperations: jest.fn(() => "ops"),
}))
jest.mock("../../../../workflows/utils/order-payment/release-hold", () => ({ releaseHold: jest.fn() }))
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
  return { sent, res: { json: (body: unknown) => void sent.push(body) } }
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

  it("a refused release is the caller's error, and no mail goes", async () => {
    ;(releaseHold as jest.Mock).mockRejectedValue(new MedusaError(MedusaError.Types.CONFLICT, "már levontuk"))
    await expect(call({})).rejects.toMatchObject({ type: MedusaError.Types.CONFLICT })
    expect(notifyHoldReleased).not.toHaveBeenCalled()
  })
})
