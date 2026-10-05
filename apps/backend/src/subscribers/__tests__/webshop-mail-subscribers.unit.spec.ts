import { asValue } from "@medusajs/framework/awilix"
import { ContainerRegistrationKeys, createMedusaContainer } from "@medusajs/framework/utils"

import orderPlacedMail, { config as orderConfig } from "../order-placed-mail"
import paymentRefundedMail, { config as refundConfig } from "../payment-refunded-mail"

/**
 * MI PIROSÍT: ha a levél-feliratkozók rossz eseményre figyelnének; ha
 * kikapcsolt állapotban bármit lekérdeznének (a split-befejezést is beleértve);
 * ha egy hiba a rendelést vagy a visszatérítést dobná vissza a naplózás helyett.
 */
const KEYS = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "client",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "refresh",
}

const setup = () => {
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() }
  const graph = jest.fn(async () => {
    throw new Error("query down")
  })
  const container = createMedusaContainer()
  container.register({
    [ContainerRegistrationKeys.LOGGER]: asValue(logger),
    [ContainerRegistrationKeys.QUERY]: asValue({ graph }),
  })
  return { logger, graph, container }
}

const run = (fn: typeof orderPlacedMail, name: string, container: unknown, id: string) =>
  fn({ event: { name, data: { id } }, container, pluginOptions: {} } as never)

describe("the shop mail subscribers", () => {
  afterEach(() => {
    for (const key of Object.keys(KEYS)) delete process.env[key]
  })

  it("listen to order.placed and payment.refunded", () => {
    expect(orderConfig.event).toBe("order.placed")
    expect(refundConfig.event).toBe("payment.refunded")
  })

  it("switched off: nothing is read, nothing is logged", async () => {
    const { logger, graph, container } = setup()
    await run(orderPlacedMail, "order.placed", container, "order_1")
    await run(paymentRefundedMail, "payment.refunded", container, "pay_1")
    expect(graph).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("switched on: a failure is logged with the id, and not thrown", async () => {
    Object.assign(process.env, KEYS)
    const { logger, container } = setup()
    await expect(run(orderPlacedMail, "order.placed", container, "order_1")).resolves.toBeUndefined()
    await expect(run(paymentRefundedMail, "payment.refunded", container, "pay_1")).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("order_1"))
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("pay_1"))
  })
})
