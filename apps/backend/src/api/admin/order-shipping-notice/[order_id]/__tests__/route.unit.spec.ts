const deliverShopMail = jest.fn()
jest.mock("../../../../../workflows/utils/webshop-mail/deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))
jest.mock("../../../../../workflows/utils/webshop-mail/operations", () => ({ shippedMailOperations: () => ({}) }))
jest.mock("../../../../../workflows/utils/webshop-mail/shipped", () => ({
  prepareShippedMail: async () => ({ status: "send", mail: { idempotency_key: "order-shipped:order_42" } }),
}))

import { POST } from "../route"

const call = async () => {
  const json = jest.fn()
  const info = jest.fn()
  await POST(
    {
      params: { order_id: "order_42" },
      validatedBody: { carrier: "gls", tracking_number: "1" },
      scope: { resolve: () => ({ info }) },
    } as never,
    { json } as never
  )
  return { json, info }
}

describe("POST /admin/order-shipping-notice/:order_id, the delivery's answer", () => {
  afterEach(() => deliverShopMail.mockReset())

  it("sent: the OS hears sent, and the log says so", async () => {
    deliverShopMail.mockResolvedValue({ sent: true })
    const { json, info } = await call()
    expect(json).toHaveBeenCalledWith({ sent: true })
    expect(info).toHaveBeenCalled()
  })

  it("waiting in the outbox: the OS hears queued with the reason, not sent and not an error", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "Az OS nem válaszolt időben." })
    const { json, info } = await call()
    expect(json).toHaveBeenCalledWith({ sent: false, reason: "queued", message: "Az OS nem válaszolt időben." })
    expect(info).not.toHaveBeenCalled()
  })
})
