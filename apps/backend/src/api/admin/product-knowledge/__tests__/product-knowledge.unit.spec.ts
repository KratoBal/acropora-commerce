import { GET as storeGet } from "../../../store/product-knowledge/[product_id]/route"
import { GET as adminGet, PUT as adminPut } from "../[product_id]/route"
import { AdminPutProductKnowledge } from "../validators"

/*
  THE CONTRACT ROUTES (KZ Amino slice, PD-014). What turns these red: a conflict
  accepted WITH a value; an unknown status, block or key let through; a field or
  block sent twice reaching the database; the response not in the contract
  shape; the store route answering for a draft product.
*/
const fact = (over: Record<string, unknown> = {}) => ({
  field: "dosing",
  value: "1 drop/100 L/day",
  unit: null,
  status: "VERIFIED",
  source_type: "MANUFACTURER_PAGE",
  revision: 1,
  public: true,
  ...over,
})

describe("AdminPutProductKnowledge", () => {
  const ok = (body: unknown) => AdminPutProductKnowledge.safeParse(body).success

  it("takes the contract's own example", () => {
    expect(
      ok({
        facts: [
          fact(),
          fact({
            field: "packSize",
            value: null,
            status: "CONFLICTING_SOURCES",
            source_type: null,
          }),
        ],
        copy: [
          { block: "lead", body: "Lead.", revision: 1 },
          { block: "body", body: "One.\n\nTwo.", revision: 1 },
        ],
      })
    ).toBe(true)
    expect(ok({ facts: [], copy: [] })).toBe(true)
  })

  it("refuses a conflict that carries a value", () => {
    expect(
      ok({ facts: [fact({ status: "CONFLICTING_SOURCES" })], copy: [] })
    ).toBe(false)
  })

  it("passes every JEV status through, and nothing else", () => {
    for (const status of [
      "VERIFIED",
      "SUGGESTED",
      "MISSING",
      "UNVERIFIED",
      "POSSIBLE_WRONG_VALUE",
    ])
      expect(ok({ facts: [fact({ status })], copy: [] })).toBe(true)
    expect(ok({ facts: [fact({ status: "ACCEPTED" })], copy: [] })).toBe(false)
  })

  it("refuses a field or a block twice, an unknown block and an unknown key", () => {
    expect(ok({ facts: [fact(), fact()], copy: [] })).toBe(false)
    const lead = { block: "lead", body: "x", revision: 1 }
    expect(ok({ facts: [], copy: [lead, lead] })).toBe(false)
    expect(
      ok({ facts: [], copy: [{ block: "seoTitle", body: "x", revision: 1 }] })
    ).toBe(false)
    expect(ok({ facts: [fact({ conflict: ["a", "b"] })], copy: [] })).toBe(false)
  })
})

const row = (o: Record<string, unknown>) => ({ id: "x", product_id: "prod_1", ...o })

function scope(published: boolean, extraFacts: Record<string, unknown>[] = []) {
  const replaced: unknown[] = []
  const service = {
    listProductKnowledgeFacts: async () => [
      row(fact({ field: "packSize", value: "100 ml", source_type: undefined })),
      row(fact()),
      ...extraFacts.map(row),
    ],
    listProductKnowledgeCopies: async () => [
      row({ block: "body", body: "B", revision: 2 }),
      row({ block: "lead", body: "L", revision: 2 }),
    ],
    replaceProductKnowledge: async (id: string, body: unknown) =>
      void replaced.push([id, body]),
  }
  const query = {
    graph: async ({ filters }: { filters: { status: string } }) => ({
      data: published && filters.status === "published" ? [{ id: "prod_1" }] : [],
    }),
  }
  return {
    replaced,
    scope: {
      resolve: (key: string) => (key === "query" ? query : service),
    },
  }
}

const call = async (
  handler: (req: never, res: never) => Promise<void>,
  scopeOf: unknown,
  validatedBody?: unknown
) => {
  let body: unknown
  await handler(
    { scope: scopeOf, params: { product_id: "prod_1" }, validatedBody } as never,
    { json: (b: unknown) => (body = b) } as never
  )
  return body as { product_knowledge: Record<string, unknown> }
}

const SHAPE = {
  product_id: "prod_1",
  facts: [
    fact(),
    fact({ field: "packSize", value: "100 ml", source_type: null }),
  ],
  copy: [
    { block: "lead", body: "L", revision: 2 },
    { block: "body", body: "B", revision: 2 },
  ],
}

describe("the routes", () => {
  it("admin GET answers in the contract shape, facts by field, lead before body", async () => {
    expect((await call(adminGet, scope(true).scope)).product_knowledge).toEqual(
      SHAPE
    )
  })

  it("admin PUT replaces through the module and answers with the stored state", async () => {
    const s = scope(true)
    const body = { facts: [], copy: [] }
    const answer = await call(adminPut, s.scope, body)
    expect(s.replaced).toEqual([["prod_1", body]])
    expect(answer.product_knowledge).toEqual(SHAPE)
  })

  it("store GET answers for a published product only", async () => {
    expect((await call(storeGet, scope(true).scope)).product_knowledge).toEqual(
      SHAPE
    )
    expect((await call(storeGet, scope(false).scope)).product_knowledge).toEqual(
      { product_id: "prod_1", facts: [], copy: [] }
    )
  })

  /*
    THE SECOND GATE (D5, card 4622f1ac). What turns it red: a SUGGESTED, a
    conflict or any other non-VERIFIED row reaching the buyer; or the admin
    route filtering too, which would hide a stale row from the OS diff so the
    full replace never removes it.
  */
  it("store GET hands out VERIFIED facts only; admin GET keeps every row", async () => {
    const others = [
      fact({ field: "flowRate", value: "3000", unit: "l/h", status: "SUGGESTED" }),
      fact({ field: "power", value: null, status: "CONFLICTING_SOURCES", source_type: null }),
      fact({ field: "voltage", value: "230", unit: "V AC", status: "UNVERIFIED" }),
      fact({ field: "weight", value: "1", unit: "g", status: "POSSIBLE_WRONG_VALUE" }),
    ]
    expect((await call(storeGet, scope(true, others).scope)).product_knowledge).toEqual(SHAPE)
    const admin = (await call(adminGet, scope(true, others).scope)).product_knowledge as {
      facts: { field: string }[]
    }
    expect(admin.facts.map((f) => f.field)).toEqual([
      "dosing",
      "flowRate",
      "packSize",
      "power",
      "voltage",
      "weight",
    ])
  })
})

/*
  THE PUBLIC GATE (SEO P0 PR 2c). What turns it red: a VERIFIED fact whose OS
  definition is not public reaching the buyer; the admin route filtering it (the
  OS diff would never see the row); a PUT without the flag accepted (an old OS
  would store hidden facts without a word).
*/
describe("the public flag", () => {
  it("the validator requires a boolean public on every fact", () => {
    const ok = (f: unknown) =>
      AdminPutProductKnowledge.safeParse({ facts: [f], copy: [] }).success
    expect(ok(fact())).toBe(true)
    expect(ok(fact({ public: false }))).toBe(true)
    const { public: _p, ...nincs } = fact()
    expect(ok(nincs)).toBe(false)
    expect(ok(fact({ public: "true" }))).toBe(false)
  })

  it("store GET hides a VERIFIED but non-public fact; admin GET keeps it with its flag", async () => {
    const rejtett = [fact({ field: "warranty", value: "2 év", public: false })]
    expect(
      (await call(storeGet, scope(true, rejtett).scope)).product_knowledge
    ).toEqual(SHAPE)
    const admin = (await call(adminGet, scope(true, rejtett).scope))
      .product_knowledge as { facts: { field: string; public: boolean }[] }
    expect(admin.facts.map((f) => [f.field, f.public])).toEqual([
      ["dosing", true],
      ["packSize", true],
      ["warranty", false],
    ])
  })
})

