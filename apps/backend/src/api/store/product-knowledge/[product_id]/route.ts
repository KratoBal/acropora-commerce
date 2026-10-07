import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { productKnowledgeOf } from "../../../admin/product-knowledge/helpers"
import { PUBLIC_PRODUCT_KNOWLEDGE_STATUSES } from "../../../admin/product-knowledge/validators"

/**
 * The product knowledge for the product page, read only, same shape as the
 * admin route (PD-014). Only a PUBLISHED product answers with its rows: a
 * draft's copy is not customer copy yet. Anything else answers "no
 * knowledge", the same as a product that has none, so the route does not
 * tell which ids exist.
 *
 * Only VERIFIED facts leave here (D5, card 4622f1ac). The OS already sends no
 * other kind, so this is the second gate: a row written by hand, or left from
 * before the gate, still does not reach the page or the JSON-LD. The copy is
 * filtered in the OS, where its basedOn is.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const product_id = req.params.product_id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: product_id, status: "published" },
  })

  if (!products.length) {
    res.json({ product_knowledge: { product_id, facts: [], copy: [] } })
    return
  }
  const knowledge = await productKnowledgeOf(req.scope, product_id)
  res.json({
    product_knowledge: {
      ...knowledge,
      facts: knowledge.facts.filter((fact) => PUBLIC_PRODUCT_KNOWLEDGE_STATUSES.includes(fact.status)),
    },
  })
}
