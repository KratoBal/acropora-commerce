import { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"

import ProductKnowledgeCopy from "./models/product-knowledge-copy"
import ProductKnowledgeFact from "./models/product-knowledge-fact"

export type ProductKnowledgeFactInput = {
  field: string
  value: string | null
  unit: string | null
  status: string
  source_type: string | null
  revision: number
}

export type ProductKnowledgeCopyInput = {
  block: string
  body: string
  revision: number
}

type ProductKnowledgeInput = {
  facts: ProductKnowledgeFactInput[]
  copy: ProductKnowledgeCopyInput[]
}

class ProductKnowledgeModuleService extends MedusaService({
  ProductKnowledgeFact,
  ProductKnowledgeCopy,
}) {
  /**
   * FULL REPLACE for one product, in one transaction: the OS sends the whole
   * accepted state, so a field it no longer sends must disappear. Empty
   * `facts` and `copy` clear the product. Rows are deleted, not soft-deleted:
   * this is a projection, the history lives in the OS.
   */
  @InjectManager()
  async replaceProductKnowledge(
    product_id: string,
    input: ProductKnowledgeInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    await this.replaceProductKnowledge_(product_id, input, sharedContext)
  }

  @InjectTransactionManager()
  protected async replaceProductKnowledge_(
    product_id: string,
    input: ProductKnowledgeInput,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const facts = await this.listProductKnowledgeFacts(
      { product_id },
      { select: ["id"] },
      sharedContext
    )
    const copy = await this.listProductKnowledgeCopies(
      { product_id },
      { select: ["id"] },
      sharedContext
    )
    if (facts.length)
      await this.deleteProductKnowledgeFacts(
        facts.map((f) => f.id),
        sharedContext
      )
    if (copy.length)
      await this.deleteProductKnowledgeCopies(
        copy.map((c) => c.id),
        sharedContext
      )
    if (input.facts.length)
      await this.createProductKnowledgeFacts(
        input.facts.map((f) => ({ product_id, ...f })),
        sharedContext
      )
    if (input.copy.length)
      await this.createProductKnowledgeCopies(
        input.copy.map((c) => ({ product_id, ...c })),
        sharedContext
      )
  }
}

export default ProductKnowledgeModuleService
