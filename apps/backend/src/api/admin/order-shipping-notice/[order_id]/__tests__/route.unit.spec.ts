const deliverShopMail = jest.fn()
const saveShippingTracking = jest.fn()
const prepareShippedMail = jest.fn()
jest.mock("../../../../../workflows/utils/webshop-mail/deliver", () => ({
  deliverShopMail: (...args: unknown[]) => deliverShopMail(...args),
}))
jest.mock("../../../../../workflows/utils/webshop-mail/operations", () => ({ shippedMailOperations: () => ({}) }))
jest.mock("../../../../../workflows/utils/webshop-mail/shipped", () => ({
  prepareShippedMail: (...args: unknown[]) => prepareShippedMail(...args),
}))
jest.mock("../../../../../workflows/utils/order-tracking", () => ({
  saveShippingTracking: (...args: unknown[]) => saveShippingTracking(...args),
}))

import { POST } from "../route"

const NOTICE = { carrier: "gls", tracking_number: "1" }

const call = async () => {
  const json = jest.fn()
  const info = jest.fn()
  const warn = jest.fn()
  const done = POST(
    {
      params: { order_id: "order_42" },
      validatedBody: NOTICE,
      auth_context: { actor_id: "user_7" },
      scope: { resolve: () => ({ info, warn }) },
    } as never,
    { json } as never
  )
  return { json, info, warn, done }
}

beforeEach(() => {
  prepareShippedMail.mockResolvedValue({ status: "send", mail: { idempotency_key: "order-shipped:order_42" } })
  saveShippingTracking.mockResolvedValue("saved")
})

describe("POST /admin/order-shipping-notice/:order_id, the delivery's answer", () => {
  afterEach(() => {
    deliverShopMail.mockReset()
    saveShippingTracking.mockReset()
    prepareShippedMail.mockReset()
  })

  it("sent: the OS hears sent, and the log says so", async () => {
    deliverShopMail.mockResolvedValue({ sent: true })
    const { json, info, done } = await call()
    await done
    expect(json).toHaveBeenCalledWith({ sent: true })
    expect(info).toHaveBeenCalled()
  })

  it("waiting in the outbox: the OS hears queued with the reason, not sent and not an error", async () => {
    deliverShopMail.mockResolvedValue({ sent: false, queued: true, reason: "Az OS nem válaszolt időben." })
    const { json, info, done } = await call()
    await done
    expect(json).toHaveBeenCalledWith({ sent: false, reason: "queued", message: "Az OS nem válaszolt időben." })
    expect(info).not.toHaveBeenCalled()
  })
})

/*
  THE TRACKING STORE (V1.1). MI PIROSIT: ha a tracking nem mentodne, amikor a level kimarad (mail_off,
  already_sent, no_email: az oldalnak a szam akkor is kell); ha a mentes hibaja megallitana a levelet;
  ha a megtalalhatatlan rendeles is mentene; ha a hivo azonositoja nem kerulne at.
*/
describe("POST /admin/order-shipping-notice/:order_id, the tracking store", () => {
  afterEach(() => {
    deliverShopMail.mockReset()
    saveShippingTracking.mockReset()
    prepareShippedMail.mockReset()
  })

  it("stores the tracking under the caller's id", async () => {
    deliverShopMail.mockResolvedValue({ sent: true })
    const { done } = await call()
    await done
    expect(saveShippingTracking).toHaveBeenCalledWith(expect.anything(), "order_42", NOTICE, "user_7")
  })

  it("stores it even when the mail is skipped", async () => {
    prepareShippedMail.mockResolvedValue({ status: "skip", reason: "mail_off" })
    const { json, done } = await call()
    await done
    expect(saveShippingTracking).toHaveBeenCalledTimes(1)
    expect(json).toHaveBeenCalledWith({ sent: false, reason: "mail_off" })
  })

  it("a failed store is logged and the mail still goes", async () => {
    saveShippingTracking.mockRejectedValue(new Error("db down"))
    deliverShopMail.mockResolvedValue({ sent: true })
    const { json, warn, done } = await call()
    await done
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("db down"))
    expect(json).toHaveBeenCalledWith({ sent: true })
  })

  it("an order that is not found is a 404 and nothing is stored", async () => {
    prepareShippedMail.mockResolvedValue({ status: "not_found" })
    const { done } = await call()
    await expect(done).rejects.toThrow("order_42")
    expect(saveShippingTracking).not.toHaveBeenCalled()
  })
})
