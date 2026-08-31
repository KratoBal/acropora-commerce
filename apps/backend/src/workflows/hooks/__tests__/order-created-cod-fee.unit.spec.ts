import { ACROPORA_LINE_ITEM_KIND_METADATA_KEY } from "../../utils/goods-total"
import {
  ACROPORA_FEE_TYPE_METADATA_KEY,
  CASH_ON_DELIVERY_FEE_TYPE,
} from "../../utils/cod-fee-line-item"

/**
 * The hook registers itself at import time, so the only way to reach the
 * handler is to capture it as it is registered. Mocking the workflow does that
 * and nothing else: the handler under test is the real one.
 */
const registered: {
  handler?: (input: unknown, context: { container: unknown }) => Promise<void>
} = {}

jest.mock("@medusajs/medusa/core-flows", () => ({
  createOrderWorkflow: {
    hooks: {
      orderCreated: (
        handler: (input: unknown, context: { container: unknown }) => Promise<void>
      ) => {
        registered.handler = handler
      },
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("../order-created-cod-fee")

const feeLine = (id: string) => ({
  id,
  metadata: {
    [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee",
    [ACROPORA_FEE_TYPE_METADATA_KEY]: CASH_ON_DELIVERY_FEE_TYPE,
  },
})

const merchandise = (id: string) => ({ id, metadata: null })

const run = async (order: unknown) => {
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() }
  const container = { resolve: () => logger }

  await registered.handler!({ order }, { container })

  return logger
}

describe("the order-created cash-on-delivery fee alarm", () => {
  it("registers itself on the workflow", () => {
    expect(typeof registered.handler).toBe("function")
  })

  it("says nothing when the order carries one fee", async () => {
    const logger = await run({
      id: "order_1",
      items: [merchandise("item_1"), feeLine("item_2")],
    })

    expect(logger.error).not.toHaveBeenCalled()
  })

  it("says nothing when the order carries no fee", async () => {
    // A missing fee is NOT something this hook can judge: it cannot see the
    // payment method. Silence here is the documented limit, not an oversight.
    const logger = await run({ id: "order_1", items: [merchandise("item_1")] })

    expect(logger.error).not.toHaveBeenCalled()
  })

  it("reports an order that carries the fee twice, naming the lines", async () => {
    const logger = await run({
      id: "order_42",
      items: [merchandise("item_1"), feeLine("fee_a"), feeLine("fee_b")],
    })

    expect(logger.error).toHaveBeenCalledTimes(1)

    const message = logger.error.mock.calls[0][0] as string
    expect(message).toContain("order_42")
    expect(message).toContain("fee_a")
    expect(message).toContain("fee_b")
  })

  it("says in the warning itself what it does not watch", async () => {
    // Whoever reads this line is reading a warning, not the source file. If it
    // did not name its own limit, a reader would reasonably conclude that the
    // order path is checked for a MISSING fee too. It is not, and it cannot be.
    const logger = await run({
      id: "order_42",
      items: [feeLine("fee_a"), feeLine("fee_b")],
    })

    const message = logger.error.mock.calls[0][0] as string
    expect(message).toContain("duplicates ONLY")
    expect(message).toContain("MISSING")
  })

  it("does not throw when the order is unusable, and says it could not check", async () => {
    // The order already exists by now. An exception escaping this hook would
    // compensate a completed creation because a CHECK could not run, so the
    // failure has to stay inside and be written down.
    const logger = await run({
      id: "order_1",
      get items(): never {
        throw new Error("items unavailable")
      },
    })

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error.mock.calls[0][0]).toContain("could not run")
  })

  it("survives an order with no items at all", async () => {
    const logger = await run({ id: "order_1" })

    expect(logger.error).not.toHaveBeenCalled()
  })
})
