import { MedusaError } from "@medusajs/framework/utils"
import {
  StepResponse,
  WorkflowData,
  WorkflowResponse,
  createStep,
  createWorkflow,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  addToCartWorkflow,
  deleteLineItemsWorkflow,
} from "@medusajs/medusa/core-flows"

import { buildCashOnDeliveryFeeLineItem } from "./utils/cod-fee-line-item"
import { CashOnDeliveryFeePlan } from "./utils/cod-fee-reconciliation"
import { loadCartCashOnDeliveryFeeState } from "./utils/load-cart-cod-fee-state"

export type ReconcileCartCashOnDeliveryFeeInput = {
  cart_id: string
}

/**
 * Works out what the cart's fee lines should be. Reads only, so it has nothing
 * to compensate.
 */
export const planCartCashOnDeliveryFeeStep = createStep(
  "plan-cart-cash-on-delivery-fee",
  async (input: ReconcileCartCashOnDeliveryFeeInput, { container }) => {
    const state = await loadCartCashOnDeliveryFeeState(input.cart_id, container)

    if (!state) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${input.cart_id} was not found`
      )
    }

    return new StepResponse(state.plan)
  }
)

export const reconcileCartCashOnDeliveryFeeWorkflowId =
  "reconcile-cart-cash-on-delivery-fee"

/**
 * Makes a cart's cash-on-delivery fee lines match the payment method it has
 * selected.
 *
 * The rule itself is pure and lives in `utils/cod-fee-reconciliation`. This
 * workflow is only the hands: it asks what should change and then changes it
 * through the core cart workflows, so a fee line is created and deleted by the
 * same machinery as any other line, with the same refresh, the same tax
 * treatment and the same events.
 *
 * It exists as a workflow rather than as code in the route because the later
 * insertion points, the draft order and our own order creation, need the same
 * operation and must not each rebuild it.
 */
export const reconcileCartCashOnDeliveryFeeWorkflow = createWorkflow(
  reconcileCartCashOnDeliveryFeeWorkflowId,
  (
    input: WorkflowData<ReconcileCartCashOnDeliveryFeeInput>
  ): WorkflowResponse<CashOnDeliveryFeePlan> => {
    const plan = planCartCashOnDeliveryFeeStep(input)

    when(
      "add-cash-on-delivery-fee",
      { plan },
      ({ plan }) => plan.action === "add"
    ).then(() => {
      addToCartWorkflow.runAsStep({
        input: transform({ input, plan }, ({ input, plan }) => ({
          cart_id: input.cart_id,
          items: [buildCashOnDeliveryFeeLineItem(plan.amount)],
        })),
      })
    })

    when(
      "remove-cash-on-delivery-fees",
      { plan },
      ({ plan }) => plan.action === "remove"
    ).then(() => {
      deleteLineItemsWorkflow.runAsStep({
        input: transform({ input, plan }, ({ input, plan }) => ({
          cart_id: input.cart_id,
          ids: plan.removeIds,
        })),
      })
    })

    return new WorkflowResponse(plan)
  }
)
