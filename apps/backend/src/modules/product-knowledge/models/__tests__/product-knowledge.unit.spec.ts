import ProductKnowledgeCopy from "../product-knowledge-copy"
import ProductKnowledgeFact from "../product-knowledge-fact"
import ProductKnowledgeModuleService from "../../service"

/**
 * The models and the full replace, without a database. Lives under `models/`
 * for the same reason as the shipping-attributes test: `src/modules/<m>/__tests__/`
 * is matched by `test:integration:modules`, which needs a live PostgreSQL.
 */
describe("product knowledge models", () => {
  const nullable = (parsed: ReturnType<typeof ProductKnowledgeFact.parse>, key: string) =>
    (
      parsed.schema[key] as unknown as {
        parse: (name: string) => { nullable?: boolean }
      }
    ).parse(key).nullable

  it("a fact is keyed by product and field name, with no field list of its own", () => {
    const parsed = ProductKnowledgeFact.parse()
    expect(Object.keys(parsed.schema).sort()).toEqual([
      "created_at",
      "deleted_at",
      "field",
      "id",
      "product_id",
      "public",
      "revision",
      "source_type",
      "status",
      "unit",
      "updated_at",
      "value",
    ])
    const index = parsed.indexes.find(
      (i) => JSON.stringify(i.on) === JSON.stringify(["product_id", "field"])
    )
    expect(index?.unique).toBe(true)
    expect(String(index?.where)).toContain("deleted_at IS NULL")
    // a conflict carries no value, so value must be nullable; status must not be
    expect([nullable(parsed, "value"), nullable(parsed, "status")]).toEqual([
      true,
      false,
    ])
  })

  it("a copy block is unique per product and block", () => {
    const parsed = ProductKnowledgeCopy.parse()
    const index = parsed.indexes.find(
      (i) => JSON.stringify(i.on) === JSON.stringify(["product_id", "block"])
    )
    expect(index?.unique).toBe(true)
  })
})

/*
  THE FULL REPLACE. What turns it red: an old row surviving the replace, a write
  outside the one transaction, or a create running before the delete (the
  unique index would then refuse the same field).
*/
describe("replaceProductKnowledge", () => {
  const fake = (existing: { facts: string[]; copy: string[] }) => {
    const calls: string[] = []
    const trx = { name: "trx" }
    const seen = (what: string, context: { transactionManager?: unknown }) =>
      calls.push(`${what}${context?.transactionManager === trx ? "" : " OUTSIDE"}`)
    const self = {
      baseRepository_: {
        getFreshManager: () => ({ name: "manager" }),
        transaction: async (fn: (t: unknown) => Promise<unknown>) => {
          calls.push("begin")
          const result = await fn(trx)
          calls.push("commit")
          return result
        },
      },
      listProductKnowledgeFacts: async (_: unknown, __: unknown, c: never) => {
        seen("list facts", c)
        return existing.facts.map((id) => ({ id }))
      },
      listProductKnowledgeCopies: async (_: unknown, __: unknown, c: never) => {
        seen("list copy", c)
        return existing.copy.map((id) => ({ id }))
      },
      deleteProductKnowledgeFacts: async (ids: string[], c: never) =>
        seen(`delete facts ${ids.join(",")}`, c),
      deleteProductKnowledgeCopies: async (ids: string[], c: never) =>
        seen(`delete copy ${ids.join(",")}`, c),
      createProductKnowledgeFacts: async (rows: { field: string; product_id: string }[], c: never) =>
        seen(`create facts ${rows.map((r) => `${r.product_id}/${r.field}`).join(",")}`, c),
      createProductKnowledgeCopies: async (rows: { block: string; product_id: string }[], c: never) =>
        seen(`create copy ${rows.map((r) => `${r.product_id}/${r.block}`).join(",")}`, c),
    }
    // the inner, transactional half is a method of the same object
    Object.assign(self, {
      replaceProductKnowledge_: (
        ProductKnowledgeModuleService.prototype as unknown as {
          replaceProductKnowledge_: unknown
        }
      ).replaceProductKnowledge_,
    })
    const replace = (input: Parameters<ProductKnowledgeModuleService["replaceProductKnowledge"]>[1]) =>
      ProductKnowledgeModuleService.prototype.replaceProductKnowledge.call(
        self as never,
        "prod_1",
        input
      )
    return { calls, replace }
  }

  it("deletes every old row, then writes the new ones, in one transaction", async () => {
    const { calls, replace } = fake({ facts: ["f1", "f2"], copy: ["c1"] })
    await replace({
      facts: [
        {
          field: "dosing",
          value: null,
          unit: null,
          status: "CONFLICTING_SOURCES",
          source_type: null,
          revision: 1,
          public: true,
        },
      ],
      copy: [{ block: "lead", body: "x", revision: 1 }],
    })
    expect(calls).toEqual([
      "begin",
      "list facts",
      "list copy",
      "delete facts f1,f2",
      "delete copy c1",
      "create facts prod_1/dosing",
      "create copy prod_1/lead",
      "commit",
    ])
  })

  it("empty facts and copy clear the product and write nothing", async () => {
    const { calls, replace } = fake({ facts: ["f1"], copy: [] })
    await replace({ facts: [], copy: [] })
    expect(calls).toEqual([
      "begin",
      "list facts",
      "list copy",
      "delete facts f1",
      "commit",
    ])
  })
})
