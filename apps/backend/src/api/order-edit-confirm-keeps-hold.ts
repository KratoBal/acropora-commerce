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
import { onlineCardProviderIds } from "../workflows/utils/payment-providers"

/**
 * THE ADMIN ORDER EDIT CONFIRM, KEEPING AN UNCAPTURED CARD HOLD
 * (order-edit-hold.ts). A refused edit stops with 400 and Medusa's confirm
 * does not run. An edit of an uncaptured Stripe order runs Medusa's OWN
 * confirm workflow here, with the collection in AWAITING, and answers as
 * Medusa's route does (`{ order_preview }`, @medusajs/medusa 2.20.1
 * api/admin/order-edits/[id]/confirm/route.js). Everything else goes on to
 * Medusa's route unchanged.
 */
export const orderEditConfirmKeepsHold = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const ops = editHoldOperations(req.scope)
  const decision = await orderEditHoldDecision(req.params.id, ops, onlineCardProviderIds())

  if (decision.action === "refuse") {
    res.status(400).json({ type: "not_allowed", message: decision.message })
    return
  }

  if (decision.action === "pass") {
    next()
    return
  }

  const { result } = await confirmKeepingHold(decision.collectionId, ops, () =>
    confirmOrderEditRequestWorkflow(req.scope).run({
      input: { order_id: req.params.id, confirmed_by: req.auth_context.actor_id },
    })
  )
  res.json({ order_preview: result })
}
