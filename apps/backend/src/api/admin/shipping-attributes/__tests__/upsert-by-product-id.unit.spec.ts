import { POST as listPost } from "../route"
import { POST as itemPost } from "../[id]/route"
import { upsertByProductId } from "../helpers"

/*
  WHAT TURNS THIS RED (card c603774e, barracuda #724). Two writes for one product (an OS round and a widget save) both reading the
  row before either writes: the later one would decide from an old row, and a hand-set value would be marked as the OS's. A failed
  write blocking the next write for the product. The adoption flag stored on the row, or lost on the way from either route to the
  rule, so the reviewed adoption could not mark an older value.
*/
type Row = Record<string, unknown> & { id: string; product_id: string }

const fakeScope = (rows: Row[], readDelay = true) => {
  const updates: unknown[] = []
  const creates: unknown[] = []
  const service = {
    listShippingAttributes: async (filter: { product_id: string }) => {
      const found = rows.filter((r) => r.product_id === filter.product_id).map((r) => ({ ...r }))
      // the row is read, and only a later tick writes: two unserialized writes both see the old row
      if (readDelay) await new Promise((resolve) => setTimeout(resolve, 5))
      return found
    },
    createShippingAttributes: async ([data]: Row[]) => {
      creates.push(data)
      const row = { id: `sa_${rows.length + 1}`, ...data }
      rows.push(row)
      return [row]
    },
    updateShippingAttributes: async ([data]: Row[]) => {
      updates.push(data)
      const row = rows.find((r) => r.id === data.id)!
      Object.assign(row, data)
      return [row]
    },
  }
  return { scope: { resolve: () => service } as never, rows, updates, creates, service }
}

describe("upsertByProductId", () => {
  it("runs two writes for one product one after the other: the OS never marks a value the widget set first", async () => {
    const { scope, rows } = fakeScope([])
    const byHand = upsertByProductId(scope, "prod_1", { pickup_only: true })
    const byOs = upsertByProductId(scope, "prod_1", { pickup_only: true, pickup_only_derived: true })
    await Promise.all([byHand, byOs])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ pickup_only: true, pickup_only_derived: false })
  })

  it("a write that failed does not block the next write for the same product", async () => {
    const { scope, rows, service } = fakeScope([])
    const real = service.createShippingAttributes
    service.createShippingAttributes = async () => {
      throw new Error("boom")
    }
    await expect(upsertByProductId(scope, "prod_1", { pickup_only: true })).rejects.toThrow("boom")
    service.createShippingAttributes = real
    await upsertByProductId(scope, "prod_1", { pickup_only: true, pickup_only_derived: true })
    expect(rows[0]).toMatchObject({ pickup_only: true, pickup_only_derived: true })
  })

  it("the adoption claims an older value that is on, and the flag is not stored", async () => {
    const { scope, rows, updates } = fakeScope([
      { id: "sa_1", product_id: "prod_1", pickup_only: true, pickup_only_derived: false },
    ])
    await upsertByProductId(scope, "prod_1", { pickup_only: true, pickup_only_derived: true }, { adopt: true })
    expect(rows[0]!.pickup_only_derived).toBe(true)
    expect(JSON.stringify(updates)).not.toContain("adopt")
  })
})

describe("the routes carry the adoption flag to the rule and keep it off the row", () => {
  const body = { pickup_only: true, pickup_only_derived: true }
  const older = () => [{ id: "sa_1", product_id: "prod_1", pickup_only: true, pickup_only_derived: false }]

  for (const [name, call] of [
    [
      "POST /admin/shipping-attributes",
      (scope: never, extra: object) =>
        listPost({ scope, validatedBody: { product_id: "prod_1", ...body, ...extra } } as never, { json: jest.fn() } as never),
    ],
    [
      "POST /admin/shipping-attributes/:id",
      (scope: never, extra: object) =>
        itemPost({ scope, params: { id: "prod_1" }, validatedBody: { ...body, ...extra } } as never, { json: jest.fn() } as never),
    ],
  ] as const) {
    it(`${name}: without the flag a hand-set value stays unmarked, with it the value is adopted`, async () => {
      const without = fakeScope(older(), false)
      await call(without.scope, {})
      expect(without.rows[0]!.pickup_only_derived).toBe(false)

      const withFlag = fakeScope(older(), false)
      await call(withFlag.scope, { adopt_pickup_only_derived: true })
      expect(withFlag.rows[0]!.pickup_only_derived).toBe(true)
      expect(JSON.stringify(withFlag.updates)).not.toContain("adopt")
    })
  }
})
