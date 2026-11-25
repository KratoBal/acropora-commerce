import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
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
import { orderPaymentLock } from "./utils/order-payment/lock"
import { captureOnTransitionUnderLock } from "./utils/shared-stripe-capture"
import { sharedCaptureOperations } from "./utils/shared-stripe-capture-operations"
import { creditOrderLoyaltyAccrual } from "./utils/loyalty/credit-order-accrual"
import {
  cancelOnUnsuccessfulClose,
  refuseReopenAfterMovement,
  GIVEN_BACK_METADATA_KEY,
  REOPEN_TO_STATUS,
} from "./utils/cancel-on-unsuccessful-close"
import { orderCancelOperations } from "./utils/order-cancel-guard-operations"
import { giveBackGiftCardShare, giveBackLoyaltyPoints } from "./utils/give-back-order-credits"
import { reopenOperations } from "./utils/reopen-operations"

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
 * The transition rules are checked BEFORE the capture (`captureOnTransition`), under the order's payment lock.
 */
export const captureSharedStripePaymentStep = createStep(
  "capture-shared-stripe-payment",
  async (input: TransitionOrderBusinessStatusInput, { container }) => {
    const service = container.resolve<OrderBusinessStatusModuleService>(
      ORDER_BUSINESS_STATUS_MODULE,
    )
    // under the order's payment lock, one at a time with the switch to bank transfer and the hold's release (card efcd5add)
    const result = await captureOnTransitionUnderLock(
      input,
      sharedCaptureOperations(container),
      () => service.assertTransitionAllowed(input),
      orderPaymentLock(container),
    )
    return new StepResponse({ captured: result?.captured ?? false })
  },
)

/**
 * "SIKERTELENÜL LEZÁRT" CANCELS THE ORDER FIRST (card dfb79916; see `cancelOnUnsuccessfulClose`): the refund guard and
 * Medusa's cancel run BEFORE the status changes, so a refusal stops the move, and the points and the gift card come back
 * through `order.canceled`. The same step refuses the way BACK (`closed_unsuccessfully` -> `stocking`) once the close moved something
 * (the order is canceled, or the points or the card went back): see `refuseReopenAfterMovement`. Any other status passes.
 */
type OrderQuery = { graph(args: { entity: string; fields: string[]; filters: Record<string, unknown> }): Promise<{ data: unknown[] }> }

export const cancelOrderOnUnsuccessfulCloseStep = createStep(
  "cancel-order-on-unsuccessful-close",
  async (input: TransitionOrderBusinessStatusInput, { container }) => {
    const service = container.resolve<OrderBusinessStatusModuleService>(
      ORDER_BUSINESS_STATUS_MODULE,
    )
    const result = await cancelOnUnsuccessfulClose(
      input,
      {
        ...orderCancelOperations(container, undefined),
        cancel: async (orderId) => {
          await cancelOrderWorkflow(container).run({ input: { order_id: orderId } })
        },
        giveBackCredits: async (orderId) =>
          (await giveBackLoyaltyPoints(container, orderId, "closed unsuccessfully (not cancelled)")) +
          (await giveBackGiftCardShare(container, orderId, "closed unsuccessfully (not cancelled)")),
        markGivenBack: async (orderId, trace) => {
          const orders = container.resolve(Modules.ORDER) as {
            updateOrders(data: { id: string; metadata: Record<string, unknown> }[]): Promise<unknown>
          }
          const { data } = await container
            .resolve<OrderQuery>(ContainerRegistrationKeys.QUERY)
            .graph({ entity: "order", fields: ["id", "metadata"], filters: { id: orderId } })
          const metadata = ((data[0] as { metadata?: Record<string, unknown> | null } | undefined)?.metadata ?? {}) as Record<string, unknown>
          await orders.updateOrders([
            { id: orderId, metadata: { ...metadata, [GIVEN_BACK_METADATA_KEY]: { ...trace, at: new Date().toISOString() } } },
          ])
        },
      },
      () => service.assertTransitionAllowed(input),
    )
    // the way back: a close that moved something is not reopened (the same step, before the status changes)
    if (input.to === REOPEN_TO_STATUS) {
      await refuseReopenAfterMovement(input, reopenOperations(container))
    }
    if (result.action === "credits_given_back")
      container
        .resolve<{ warn(message: string): void }>(ContainerRegistrationKeys.LOGGER)
        .warn(
          `Order ${input.order_id} closed unsuccessfully WITHOUT a cancel (${result.reason}): its points and gift card share were given back directly; ${result.captured_unrefunded > 0 ? `a captured card payment of ${result.captured_unrefunded} was NOT refunded (a hand refund; the order's metadata ${GIVEN_BACK_METADATA_KEY} carries the amount)` : "no captured card payment was left"}; nothing was freed in the shop.`,
        )
    return new StepResponse({ action: result.action })
  },
)

/**
 * "MEGRENDELÉS LEZÁRVA" CREDITS THE ORDER'S LOYALTY POINTS (card dfb79916; the old shop credits at this status). It runs AFTER the
 * status has changed and never throws: the move stands, a failed credit is logged with what to credit by hand, and the ledger's
 * key (the order) makes a repeated move store nothing twice. Any other status does nothing here. Every way an order becomes
 * closed (an admin, a carrier callback, the payment paths) goes through this workflow, so none of them can skip it.
 */
export const creditLoyaltyAccrualOnClosedStep = createStep(
  "credit-loyalty-accrual-on-closed",
  async (input: TransitionOrderBusinessStatusInput, { container }) => {
    const outcome: { status: string } =
      input.to === "closed" ? await creditOrderLoyaltyAccrual(container, input.order_id) : { status: "not_closed" }
    return new StepResponse(outcome)
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
    cancelOrderOnUnsuccessfulCloseStep(input)
    const status = transitionOrderBusinessStatusStep(input)
    creditLoyaltyAccrualOnClosedStep(input)

    return new WorkflowResponse(status)
  },
)
