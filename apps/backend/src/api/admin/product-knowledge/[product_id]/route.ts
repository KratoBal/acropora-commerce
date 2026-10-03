import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { productKnowledgeOf, resolveService } from "../helpers"
import { AdminPutProductKnowledgeType } from "../validators"

/**
 * THE PRODUCT KNOWLEDGE OF ONE PRODUCT (KZ Amino slice, PD-014). `product_id`
 * is the Medusa product id. The only writer is the Acropora OS projection:
 * direction OS -> Medusa, full replace.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    product_knowledge: await productKnowledgeOf(
      req.scope,
      req.params.product_id
    ),
  })
}

export const PUT = async (
  req: MedusaRequest<AdminPutProductKnowledgeType>,
  res: MedusaResponse
) => {
  const product_id = req.params.product_id
  await resolveService(req.scope).replaceProductKnowledge(
    product_id,
    req.validatedBody
  )
  res.json({
    product_knowledge: await productKnowledgeOf(req.scope, product_id),
  })
}
