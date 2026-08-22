import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  defaultFlags,
  resolveService,
  upsertByProductId,
} from "../helpers"
import { AdminShippingAttributeFlagsType } from "../validators"

/**
 * `id` is the PRODUCT id, not the record id.
 *
 * The resource is "the shipping attributes of a product": there is at most one
 * record per product, the admin widget knows the product id rather than the
 * record id, and the later Acropora OS synchronization addresses products too.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveService(req.scope)
  const product_id = req.params.id

  const [shipping_attribute] = await service.listShippingAttributes(
    { product_id },
    { take: 1 }
  )

  res.json({ shipping_attribute: shipping_attribute ?? defaultFlags(product_id) })
}

export const POST = async (
  req: MedusaRequest<AdminShippingAttributeFlagsType>,
  res: MedusaResponse
) => {
  const shipping_attribute = await upsertByProductId(
    req.scope,
    req.params.id,
    req.validatedBody
  )

  res.json({ shipping_attribute })
}
