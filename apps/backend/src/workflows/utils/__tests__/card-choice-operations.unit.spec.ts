const runs: { workflow: string; input: unknown }[] = []
jest.mock("@medusajs/medusa/core-flows", () => {
  const fake = (workflow: string) => () => ({
    run: async ({ input }: { input: unknown }) => {
      runs.push({ workflow, input })
      return { result: {} }
    },
  })
  return new Proxy({}, { get: (_t, name: string) => fake(name) })
})

jest.mock("../../reconcile-cart-cod-fee", () => ({ reconcileCartCashOnDeliveryFeeWorkflow: () => ({}) }))

const feeState = jest.fn()
jest.mock("../load-cart-cod-fee-state", () => ({
  loadCartCashOnDeliveryFeeState: (...a: unknown[]) => feeState(...a),
}))

import { buildCashOnDeliveryFeeLineItem } from "../cod-fee-line-item"
import { sharedPaymentOperations } from "../split-completion-operations"

const feeLine = (id: string) => ({ id, unit_price: 450, metadata: buildCashOnDeliveryFeeLineItem(450).metadata })

const container = (sessions: { id: string }[]) =>
  ({
    resolve: () => ({
      graph: async () => ({ data: [{ id: "cart_1", payment_collection: { id: "pc_1", payment_sessions: sessions } }] }),
      warn: jest.fn(),
      info: jest.fn(),
    }),
  }) as never

beforeEach(() => {
  runs.length = 0
  feeState.mockReset()
})

/**
 * THE MEDUSA SIDE OF CHOOSING CARD PAYMENT (P4-4). What must fail: the fee
 * left on a card cart; an ordinary line taken for the fee; the old session
 * left; a workflow run when there is nothing to remove.
 */
describe("dropping the fee and the old session for a card payment", () => {
  it("removes only the cash-on-delivery fee lines", async () => {
    feeState.mockResolvedValue({ cart: { items: [{ id: "l1", unit_price: 1000, metadata: {} }, feeLine("fee1")] } })
    await sharedPaymentOperations(container([]), { storePickupOptionId: "so" }).dropCashOnDeliveryFee("cart_1")
    expect(runs).toEqual([{ workflow: "deleteLineItemsWorkflow", input: { cart_id: "cart_1", ids: ["fee1"] } }])
  })

  it("runs nothing on a cart without the fee", async () => {
    feeState.mockResolvedValue({ cart: { items: [{ id: "l1", unit_price: 1000, metadata: {} }] } })
    await sharedPaymentOperations(container([]), { storePickupOptionId: "so" }).dropCashOnDeliveryFee("cart_1")
    expect(runs).toEqual([])
  })

  it("deletes the cart's payment sessions, and runs nothing without one", async () => {
    await sharedPaymentOperations(container([{ id: "payses_1" }]), { storePickupOptionId: "so" }).clearPayment("cart_1")
    expect(runs).toEqual([{ workflow: "deletePaymentSessionsWorkflow", input: { ids: ["payses_1"] } }])

    runs.length = 0
    await sharedPaymentOperations(container([]), { storePickupOptionId: "so" }).clearPayment("cart_1")
    expect(runs).toEqual([])
  })
})
