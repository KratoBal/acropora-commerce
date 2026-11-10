import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolveService, upsertByProductId } from "./helpers"
import { AdminUpsertShippingAttributeType } from "./validators"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveService(req.scope)
  const { product_id } = req.validatedQuery as { product_id?: string | string[] }

  const filters = product_id ? { product_id } : {}
  // `take: null`: a Medusa lista alapbol csak egy lapot ad, es az OS ebbol keresi a
  // boltban maradt elo allat fajtakat: egy csonka lista ott nullat mutatna, mintha nem lenne mit javitani
  const shipping_attributes = await service.listShippingAttributes(filters, {
    take: null,
  })

  res.json({ shipping_attributes })
}

export const POST = async (
  req: MedusaRequest<AdminUpsertShippingAttributeType>,
  res: MedusaResponse
) => {
  const { product_id, ...flags } = req.validatedBody

  const shipping_attribute = await upsertByProductId(
    req.scope,
    product_id,
    flags
  )

  res.json({ shipping_attribute })
}
