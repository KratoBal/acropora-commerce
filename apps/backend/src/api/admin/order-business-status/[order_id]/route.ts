import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { transitionOrderBusinessStatusWorkflow } from "../../../../workflows/transition-order-business-status"
import { AdminTransitionOrderBusinessStatusType } from "../validators"
import { adminStatusDetail } from "../admin-business-status"

/** The order's business status, its history and the admin's next steps (the OS reads it). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { order_id } = req.params
  const business_status = await adminStatusDetail(req.scope, order_id)
  if (!business_status)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No business status exists for order ${order_id}`,
    )
  res.json({ business_status })
}

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
