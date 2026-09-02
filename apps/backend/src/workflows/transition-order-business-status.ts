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
    const status = transitionOrderBusinessStatusStep(input)

    return new WorkflowResponse(status)
  },
)
