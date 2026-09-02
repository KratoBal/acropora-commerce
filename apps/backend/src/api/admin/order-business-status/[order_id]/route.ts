import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { transitionOrderBusinessStatusWorkflow } from "../../../../workflows/transition-order-business-status"
import { AdminTransitionOrderBusinessStatusType } from "../validators"

/**
 * The current backend has one authenticated administrative boundary but no
 * finer application role model. It records this manual operation as `admin`;
 * future carrier callbacks use the same workflow with actor `carrier`.
 */
export const POST = async (
  req: MedusaRequest<AdminTransitionOrderBusinessStatusType>,
  res: MedusaResponse,
) => {
  const { order_id } = req.params
  const { status } = req.validatedBody

  const { result: business_status } = await transitionOrderBusinessStatusWorkflow(
    req.scope,
  ).run({
    input: {
      order_id,
      to: status,
      actor: "admin",
      source: "admin",
    },
  })

  res.json({ business_status })
}
