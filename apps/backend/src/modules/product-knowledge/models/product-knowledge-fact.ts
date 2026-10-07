import { model } from "@medusajs/framework/utils"

/**
 * One accepted product fact, PROJECTED from Acropora OS (KZ Amino slice,
 * PD-014). The OS owns the knowledge; this table is a read model and nothing
 * reads it back into the OS.
 *
 * There is no field list here: a row is keyed by the OS field name (`dosing`,
 * `packSize`, ...), so a new field in the OS needs no change on this side.
 *
 * `status` is the JEV status, passed through unchanged. A
 * `CONFLICTING_SOURCES` fact carries `value = null`: the competing values and
 * their sources stay in the OS evidence, never here.
 */
export const ProductKnowledgeFact = model
  .define("product_knowledge_fact", {
    id: model.id({ prefix: "pkfact" }).primaryKey(),
    product_id: model.text(),
    field: model.text(),
    value: model.text().nullable(),
    unit: model.text().nullable(),
    status: model.text(),
    source_type: model.text().nullable(),
    revision: model.number(),
    /**
     * The OS definition's `public` flag (SEO P0 PR 2c). The store route hands
     * out a fact only if it is VERIFIED AND public: the second gate, as for
     * the status. Default `false`: a row written before the OS sent the flag
     * stays hidden until the next projection writes it (brief: a full
     * knowledge re-projection right after the deploy).
     */
    public: model.boolean().default(false),
  })
  .indexes([
    {
      name: "IDX_product_knowledge_fact_product_id_field_unique",
      on: ["product_id", "field"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ProductKnowledgeFact
