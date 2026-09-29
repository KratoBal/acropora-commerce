import { asValue } from "@medusajs/framework/awilix"
import {
  ContainerRegistrationKeys,
  createMedusaContainer,
} from "@medusajs/framework/utils"

import orderPlacedBusinessStatus, {
  config,
} from "../order-placed-business-status"

const setup = (service: Record<string, jest.Mock>) => {
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() }
  const container = createMedusaContainer()
  container.register({
    [ContainerRegistrationKeys.LOGGER]: asValue(logger),
    order_business_status: asValue(service),
  })
  return { container, logger }
}

const handle = (container: unknown, data: unknown) =>
  orderPlacedBusinessStatus({
    event: { name: "order.placed", data },
    container,
    pluginOptions: {},
  } as never)

describe("the order.placed business status subscriber", () => {
  it("listens to order.placed, the event the store checkout emits", () => {
    expect(config.event).toBe("order.placed")
  })

  it("gives a placed order Feldolgozásra vár", async () => {
    const service = {
      listOrderBusinessStatusModels: jest.fn().mockResolvedValue([]),
      transitionOrderBusinessStatus: jest.fn().mockResolvedValue({}),
    }
    const { container, logger } = setup(service)

    await handle(container, { id: "order_1" })

    expect(service.transitionOrderBusinessStatus).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: "order_1", to: "pending_processing" }),
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("does not write a second status for an order that has one", async () => {
    const service = {
      listOrderBusinessStatusModels: jest
        .fn()
        .mockResolvedValue([{ id: "ordbst_1", order_id: "order_1" }]),
      transitionOrderBusinessStatus: jest.fn(),
    }
    const { container } = setup(service)

    await handle(container, { id: "order_1" })

    expect(service.transitionOrderBusinessStatus).not.toHaveBeenCalled()
  })

  it("logs a failure with the order id instead of throwing", async () => {
    const service = {
      listOrderBusinessStatusModels: jest
        .fn()
        .mockRejectedValue(new Error("db down")),
      transitionOrderBusinessStatus: jest.fn(),
    }
    const { container, logger } = setup(service)

    await expect(handle(container, { id: "order_9" })).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error.mock.calls[0][0]).toContain("order_9")
  })

  it("says so when the event carries no order id", async () => {
    const service = {
      listOrderBusinessStatusModels: jest.fn(),
      transitionOrderBusinessStatus: jest.fn(),
    }
    const { container, logger } = setup(service)

    await handle(container, {})

    expect(service.listOrderBusinessStatusModels).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})

/**
 * WHY THE SUBSCRIBER EXISTS, PINNED TO THE MEDUSA SOURCE. The store checkout
 * (`completeCartWorkflow`) creates the order with `createOrdersStep` and emits
 * `order.placed`; it never runs `createOrderWorkflow`, so a hook on that
 * workflow does not see store orders. If a Medusa upgrade changes either fact,
 * this goes red and the two paths have to be looked at again.
 */
describe("the store checkout path in @medusajs/core-flows", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require("fs")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { dirname, join } = require("path")
  const medusaCoreFlows = require.resolve("@medusajs/medusa/core-flows")
  const coreFlowsEntry = require.resolve("@medusajs/core-flows", {
    paths: [dirname(medusaCoreFlows)],
  })
  const source = readFileSync(
    join(dirname(coreFlowsEntry), "cart", "workflows", "complete-cart.js"),
    "utf8",
  ) as string

  it("is the complete-cart workflow file", () => {
    expect(source).toContain("completeCartWorkflowId")
  })

  it("emits order.placed and does not run createOrderWorkflow", () => {
    expect(source).toContain("OrderWorkflowEvents.PLACED")
    expect(source).toContain("createOrdersStep")
    expect(source).not.toMatch(/createOrderWorkflow\b/)
  })
})
