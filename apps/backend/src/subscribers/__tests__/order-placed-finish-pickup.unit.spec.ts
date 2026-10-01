import { asValue } from "@medusajs/framework/awilix"
import { ContainerRegistrationKeys, createMedusaContainer } from "@medusajs/framework/utils"

import orderPlacedFinishPickup, { config } from "../order-placed-finish-pickup"

/**
 * MI PIROSÍT: ha a feliratkozó nem az order.placed-re figyelne; ha egy hiba
 * a rendelés leadását dobná vissza a naplózás helyett.
 */
describe("the order.placed pickup subscriber", () => {
  it("listens to order.placed", () => {
    expect(config.event).toBe("order.placed")
  })

  it("logs a failure with the order's id, and does not throw", async () => {
    const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() }
    const container = createMedusaContainer()
    container.register({
      [ContainerRegistrationKeys.LOGGER]: asValue(logger),
      [ContainerRegistrationKeys.QUERY]: asValue({
        graph: jest.fn(async () => {
          throw new Error("query down")
        }),
      }),
    })
    await expect(
      orderPlacedFinishPickup({
        event: { name: "order.placed", data: { id: "order_1" } },
        container,
        pluginOptions: {},
      } as never)
    ).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("order_1"))
  })
})
