import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  beginOrderEditOrderWorkflow,
  cancelBeginOrderEditWorkflow,
  confirmOrderEditRequestWorkflow,
  requestOrderEditRequestWorkflow,
} from "@medusajs/medusa/core-flows"

import { confirmKeepingHold, orderEditHoldDecision } from "./order-edit-hold"
import { editHoldOperations } from "./order-edit-hold-operations"
import { onlineCardProviderIds } from "./payment-providers"

/**
 * ONE ORDER EDIT, RUN BY OUR OWN CODE (the split, C/3; the shipping method
 * change, C/2): begin, the caller's actions, request, and the confirm on the
 * admin's hold-keeping path (`order-edit-confirm-keeps-hold.ts`: an
 * uncaptured card hold stays; a refused edit throws NOT_ALLOWED with the
 * rules' own message).
 *
 * IF ANYTHING FAILS BEFORE THE CONFIRM IS DONE, THE EDIT IS CANCELED: an order
 * takes one active edit at a time, so an edit left open would make every
 * later attempt (the same request sent again, or the OS's own item edit) fail
 * at its begin.
 */
export const runOrderEdit = async (
  container: MedusaContainer,
  input: { order_id: string; actor: string; description: string },
  actions: () => Promise<void>
): Promise<void> => {
  await beginOrderEditOrderWorkflow(container).run({
    input: { order_id: input.order_id, created_by: input.actor, description: input.description },
  })
  try {
    await actions()
    await requestOrderEditRequestWorkflow(container).run({ input: { order_id: input.order_id, requested_by: input.actor } })

    const ops = editHoldOperations(container)
    const decision = await orderEditHoldDecision(input.order_id, ops, onlineCardProviderIds())
    if (decision.action === "refuse") throw new MedusaError(MedusaError.Types.NOT_ALLOWED, decision.message)
    const confirm = () =>
      confirmOrderEditRequestWorkflow(container).run({ input: { order_id: input.order_id, confirmed_by: input.actor } })
    if (decision.action === "pass") {
      await confirm()
      return
    }
    await confirmKeepingHold(decision.collectionId, ops, confirm)
    // a difference link sent before this edit is for an amount the order no longer owes
    await ops.closeOtherOpenCollections(input.order_id, decision.collectionId)
  } catch (error) {
    await cancelBeginOrderEditWorkflow(container)
      .run({ input: { order_id: input.order_id } })
      .catch(() => undefined) // nothing active left to cancel: the error below is the one that matters
    throw error
  }
}
