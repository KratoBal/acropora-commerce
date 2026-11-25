import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { confirmOrderEditRequestWorkflow } from "@medusajs/medusa/core-flows"

import {
  confirmKeepingHold,
  orderEditHoldDecision,
} from "../workflows/utils/order-edit-hold"
import { editHoldOperations } from "../workflows/utils/order-edit-hold-operations"
import { orderPaymentLock } from "../workflows/utils/order-payment/lock"
import { onlineCardProviderIds } from "../workflows/utils/payment-providers"

/**
 * THE ADMIN ORDER EDIT CONFIRM, KEEPING AN UNCAPTURED CARD HOLD
 * (order-edit-hold.ts). A refused edit stops with 400 and Medusa's confirm
 * does not run. An edit of an uncaptured Stripe order runs Medusa's OWN
 * confirm workflow here, with the collection in AWAITING, and answers as
 * Medusa's route does (`{ order_preview }`, @medusajs/medusa 2.23.0
 * api/admin/order-edits/[id]/confirm/route.js). Every other edit runs the
 * same workflow here too, as Medusa's route would, so that it is under the
 * order's payment lock (below); Medusa's route is not reached.
 */
export const orderEditConfirmKeepsHold = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  _next: MedusaNextFunction
) => {
  const ops = editHoldOperations(req.scope)
  /*
    UNDER THE ORDER'S PAYMENT LOCK (card f3b62beb; barracuda on commerce #907): the decision reads the hold, the confirm moves its
    collection, and the other open collections are closed. All of it changes the order's payment, so it runs one at a time with the
    switch to bank transfer, the capture, the hold's release and the transfer receipt (`lock.ts`, keyed by the payment's owner).
    THE "PASS" ANSWER TOO (no card hold to keep: transfer, cash on delivery, pay in store; barracuda on commerce #910): Medusa's
    confirm moves the payment collection to the edited amount, so a transfer receipt recorded meanwhile would match the old one.
    Express's next() cannot be awaited, so the lock cannot be carried through it: the confirm Medusa's route runs (the same
    workflow, the same input, the same answer) runs here, under the lock.
  */
  const outcome = await orderPaymentLock(req.scope)(req.params.id, async () => {
    const decision = await orderEditHoldDecision(req.params.id, ops, onlineCardProviderIds())
    if (decision.action === "refuse") return { kind: "refused" as const, message: decision.message }
    const confirm = () =>
      confirmOrderEditRequestWorkflow(req.scope).run({
        input: { order_id: req.params.id, confirmed_by: req.auth_context.actor_id },
      })
    if (decision.action === "pass") return { kind: "confirmed" as const, result: (await confirm()).result }
    const { result } = await confirmKeepingHold(decision.collectionId, ops, confirm)
    // a difference link sent before this edit is for an amount the order no longer owes
    await ops.closeOtherOpenCollections(req.params.id, decision.collectionId)
    return { kind: "confirmed" as const, result }
  })

  if (outcome.kind === "refused") {
    res.status(400).json({ type: "not_allowed", message: outcome.message })
    return
  }
  res.json({ order_preview: outcome.result })
}
