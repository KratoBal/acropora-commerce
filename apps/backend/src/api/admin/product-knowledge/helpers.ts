import { MedusaContainer } from "@medusajs/framework"

import { PRODUCT_KNOWLEDGE_MODULE } from "../../../modules/product-knowledge"
import ProductKnowledgeModuleService from "../../../modules/product-knowledge/service"

export const resolveService = (
  scope: MedusaContainer
): ProductKnowledgeModuleService => scope.resolve(PRODUCT_KNOWLEDGE_MODULE)

const BLOCK_ORDER = ["lead", "body"]

/**
 * The contract shape (PD-014), shared by the admin and the store routes. A
 * product with no rows answers with empty lists, not 404: "no knowledge" is a
 * valid state, and the OS diffs against it.
 */
export const productKnowledgeOf = async (
  scope: MedusaContainer,
  product_id: string
) => {
  const service = resolveService(scope)
  const [facts, copy] = await Promise.all([
    service.listProductKnowledgeFacts({ product_id }),
    service.listProductKnowledgeCopies({ product_id }),
  ])
  return {
    product_id,
    facts: facts
      .map(({ field, value, unit, status, source_type, revision, public: p }) => ({
        field,
        value: value ?? null,
        unit: unit ?? null,
        status,
        source_type: source_type ?? null,
        revision,
        public: p,
      }))
      .sort((a, b) => a.field.localeCompare(b.field)),
    copy: copy
      .map(({ block, body, revision }) => ({ block, body, revision }))
      .sort(
        (a, b) => BLOCK_ORDER.indexOf(a.block) - BLOCK_ORDER.indexOf(b.block)
      ),
  }
}
