import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { productKnowledgeOf } from "../../../admin/product-knowledge/helpers"

/**
 * The product knowledge for the product page, read only, same shape as the
 * admin route (PD-014). Only a PUBLISHED product answers with its rows: a
 * draft's copy is not customer copy yet. Anything else answers "no
 * knowledge", the same as a product that has none, so the route does not
 * tell which ids exist.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const product_id = req.params.product_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: product_id, status: "published" },
  })

  res.json({
    product_knowledge: products.length
      ? await productKnowledgeOf(req.scope, product_id)
      : { product_id, facts: [], copy: [] },
  })
}
