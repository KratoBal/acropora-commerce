import {
  StepResponse,
  WorkflowData,
  WorkflowResponse,
  createStep,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import {
  ORDER_BUSINESS_STATUS_MODULE,
} from "../modules/order-business-status"
import {
  TransitionOrderBusinessStatusInput,
} from "../modules/order-business-status/service"
import OrderBusinessStatusModuleService from "../modules/order-business-status/service"
import { captureOnTransition } from "./utils/shared-stripe-capture"
import { sharedCaptureOperations } from "./utils/shared-stripe-capture-operations"

export const transitionOrderBusinessStatusStep = createStep(
  "transition-order-business-status",
  async (input: TransitionOrderBusinessStatusInput, { container }) => {
    const service = container.resolve<OrderBusinessStatusModuleService>(
      ORDER_BUSINESS_STATUS_MODULE,
    )
    const status = await service.transitionOrderBusinessStatus(input)

    return new StepResponse(status)
  },
)

/**
 * "KISZÁLLÍTÁS" CAPTURES THE SHARED STRIPE PAYMENT (Balázs 2026-10-01, variant
 * 1; acrobot 25523): when an order goes `out_for_delivery`, a mixed cart's one
 * Stripe payment is captured for both orders' current amounts
 * (`captureSharedStripePayment`). It runs BEFORE the status changes: if the
 * capture fails (an expired hold, a refused card), the status does not change
 * and the admin sees why, instead of the goods leaving with no money taken.
 * A plain card order's own Stripe payment is captured the same way, for the
 * order's current total (`capturePlainStripePayment`, C2). Any other status,
 * and an order paid otherwise (cash on delivery, at the store), passes.
 * The transition rules are checked BEFORE the capture (`captureOnTransition`).
 */
export const captureSharedStripePaymentStep = createStep(
  "capture-shared-stripe-payment",
  async (input: TransitionOrderBusinessStatusInput, { container }) => {
    const service = container.resolve<OrderBusinessStatusModuleService>(
      ORDER_BUSINESS_STATUS_MODULE,
    )
    const result = await captureOnTransition(
      input,
      sharedCaptureOperations(container),
      () => service.assertTransitionAllowed(input),
    )
    return new StepResponse({ captured: result?.captured ?? false })
  },
)

export const transitionOrderBusinessStatusWorkflowId =
  "transition-order-business-status"

/**
 * The sole status-transition entry point. Manual admin changes and future
 * carrier callbacks both run this workflow, so they cannot bypass the
 * transition rules, history record, or the later email notification hook.
 */
export const transitionOrderBusinessStatusWorkflow = createWorkflow(
  transitionOrderBusinessStatusWorkflowId,
  (
    input: WorkflowData<TransitionOrderBusinessStatusInput>,
  ): WorkflowResponse<unknown> => {
    captureSharedStripePaymentStep(input)
    const status = transitionOrderBusinessStatusStep(input)

    return new WorkflowResponse(status)
  },
)
