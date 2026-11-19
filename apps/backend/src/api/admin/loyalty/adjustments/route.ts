import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { adjustLoyalty, adminEntryView, loyaltyOperations } from "../../../../workflows/utils/loyalty/loyalty"
import type { AdminPostLoyaltyAdjustmentType } from "../validators"

/**
 * POST /admin/loyalty/adjustments
 *
 * A manual credit (positive) or debit (negative) of a customer's points, from the OS. 201: stored; 200: the same
 * `reference` was already stored for the same movement (a retry), answered with that row; 404: no such customer;
 * 409: the key is used by a DIFFERENT movement, or a debit would take the balance below zero (the balance is in the body).
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminPostLoyaltyAdjustmentType>, res: MedusaResponse) => {
  const result = await adjustLoyalty(loyaltyOperations(req.scope), req.validatedBody, req.auth_context.actor_id)
  if (result.status === "customer_not_found") {
    res.status(404).json({ type: "not_found", message: "Nincs ilyen vevő." })
    return
  }
  if (result.status === "reference_conflict") {
    res.status(409).json({ type: "conflict", code: "reference_conflict", message: "Ez a hivatkozás már egy másik mozgáshoz tartozik." })
    return
  }
  if (result.status === "overdraw") {
    res.status(409).json({ type: "conflict", code: "overdraw", message: "A levonás a vevő egyenlege alá menne.", balance: result.balance })
    return
  }
  res.status(result.status === "created" ? 201 : 200).json({ balance: result.balance, entry: adminEntryView(result.entry) })
}
