import ShippingAttribute from "../shipping-attribute"

/**
 * The model is asserted rather than the service: without a database a service
 * test would only restate the factory. What matters here is the shape the
 * migration will be generated from, and the unique index that enforces "at most
 * one shipping-attributes record per product".
 *
 * This file deliberately does NOT live in `src/modules/shipping-attributes/__tests__/`:
 * that path is also matched by the `test:integration:modules` pattern in
 * jest.config.js, which needs a live PostgreSQL.
 */
describe("ShippingAttribute model", () => {
  const parsed = ShippingAttribute.parse()

  it("is registered as ShippingAttribute", () => {
    expect(parsed.name).toBe("ShippingAttribute")
  })

  it("defines the product key and the three flags", () => {
    // created_at, updated_at and deleted_at are added by the DML layer itself.
    expect(Object.keys(parsed.schema).sort()).toEqual([
      "created_at",
      "deleted_at",
      "foxpost_forbidden",
      "id",
      "is_frozen",
      "is_heavy",
      "pickup_only",
      "product_id",
      "updated_at",
    ])
  })

  it("enforces at most one record per product, ignoring soft-deleted rows", () => {
    const index = parsed.indexes.find(
      (i) => JSON.stringify(i.on) === JSON.stringify(["product_id"])
    )

    expect(index).toBeDefined()
    expect(index!.unique).toBe(true)
    expect(String(index!.where)).toContain("deleted_at IS NULL")
  })

  it("defaults every flag to false, so missing data is never a restriction", () => {
    for (const flag of [
      "pickup_only",
      "foxpost_forbidden",
      "is_heavy",
      "is_frozen",
    ]) {
      const property = parsed.schema[flag] as unknown as {
        parse: (name: string) => { defaultValue?: unknown; nullable?: boolean }
      }
      const definition = property.parse(flag)

      expect(definition.defaultValue).toBe(false)
      expect(definition.nullable).toBe(false)
    }
  })

  it("carries no weight column: heavy is a hand-set flag, not a measurement", () => {
    expect(Object.keys(parsed.schema)).not.toContain("weight")
    expect(Object.keys(parsed.schema)).toContain("is_heavy")
  })
})
