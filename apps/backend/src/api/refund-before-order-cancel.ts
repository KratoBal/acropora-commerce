import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"

import { prepareOrderCancel } from "../workflows/utils/order-cancel-guard"
import { orderCancelOperations } from "../workflows/utils/order-cancel-guard-operations"

/**
 * Before Medusa cancels an order, its captured money is refunded with a call
 * that fails loudly (Medusa's own refund inside the cancel swallows a failure),
 * and a mixed cart's shipped order is not canceled while the pickup part still
 * rides on its hold. See `prepareOrderCancel`.
 */
export const refundBeforeOrderCancel = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  let result: Awaited<ReturnType<typeof prepareOrderCancel>>
  try {
    result = await prepareOrderCancel(
      req.params.id,
      orderCancelOperations(req.scope, req.auth_context?.actor_id)
    )
  } catch (error) {
    res.status(400).json({
      type: "not_allowed",
      message: `A rendelés nincs törölve: ${(error as Error)?.message ?? error}`,
    })
    return
  }
  if (result.action === "refuse") {
    res.status(400).json({ type: "not_allowed", message: result.message })
    return
  }
  next()
}
