import { asValue } from "@medusajs/framework/awilix"
import { createMedusaContainer } from "@medusajs/framework/utils"

import { ensureInitialBusinessStatus } from "../ensure-initial-business-status"

const containerWith = (existing: unknown[]) => {
  const service = {
    listOrderBusinessStatusModels: jest.fn().mockResolvedValue(existing),
    transitionOrderBusinessStatus: jest.fn().mockResolvedValue({}),
  }
  const container = createMedusaContainer()
  container.register({ order_business_status: asValue(service) })
  return { container, service }
}

describe("a new order's first business status", () => {
  it("creates Feldolgozásra vár when the order has no status yet", async () => {
    const { container, service } = containerWith([])

    await expect(
      ensureInitialBusinessStatus(container, "order_1"),
    ).resolves.toBe("created")
    expect(service.listOrderBusinessStatusModels).toHaveBeenCalledWith({
      order_id: "order_1",
    })
    expect(service.transitionOrderBusinessStatus).toHaveBeenCalledWith({
      order_id: "order_1",
      to: "pending_processing",
      actor: "system",
      source: "order_created",
    })
  })

  it("writes nothing when the order already has a status", async () => {
    const { container, service } = containerWith([
      { id: "ordbst_1", order_id: "order_1", status: "pending_processing" },
    ])

    await expect(
      ensureInitialBusinessStatus(container, "order_1"),
    ).resolves.toBe("exists")
    expect(service.transitionOrderBusinessStatus).not.toHaveBeenCalled()
  })
})
