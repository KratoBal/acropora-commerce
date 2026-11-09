const livestockKindsOfOrder = jest.fn()
jest.mock("../webshop-mail/livestock-kinds", () => ({
  livestockKindsOfOrder: (...args: unknown[]) => livestockKindsOfOrder(...args),
}))

import { liveAnimalOfOrder } from "../guest-order/operations"

/*
  WHAT TURNS THIS RED (V0.3, the live animal flag). An order whose products carry a livestock kind not reported as a
  live animal (the withdrawal button would stand where the owner has not said the right applies); an order with no
  kind reported as one (the customer would lose the button); the order's own id not the one asked of the reader.
*/
afterEach(() => livestockKindsOfOrder.mockReset())

describe("liveAnimalOfOrder", () => {
  it("is true when the order has any livestock kind, and asks the reader for THAT order", async () => {
    livestockKindsOfOrder.mockResolvedValue(["CORAL"])
    const container = {} as never
    expect(await liveAnimalOfOrder(container, "ord_a")).toBe(true)
    expect(livestockKindsOfOrder).toHaveBeenCalledWith(container, "ord_a")
  })

  it("is false for an order with no livestock kind (or one the reader could not read: it answers none)", async () => {
    livestockKindsOfOrder.mockResolvedValue([])
    expect(await liveAnimalOfOrder({} as never, "ord_a")).toBe(false)
  })
})
