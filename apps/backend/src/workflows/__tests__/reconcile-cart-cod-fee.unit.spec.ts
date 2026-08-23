import { WorkflowManager } from "@medusajs/framework/orchestration"

import { reconcileCartCashOnDeliveryFeeWorkflowId } from "../reconcile-cart-cod-fee"

/**
 * A workflow definition is executable code that runs at import time, and a
 * mistake in it (a condition built on a plain value, a transform that never
 * runs) type-checks and builds cleanly, then fails when the application boots
 * or when the route is first called. Importing the module here forces the
 * composition and asks the registry whether it produced anything.
 */
describe("the cash-on-delivery fee workflow", () => {
  it("composes and registers itself", () => {
    expect(
      WorkflowManager.getWorkflow(reconcileCartCashOnDeliveryFeeWorkflowId)
    ).toBeDefined()
  })
})
