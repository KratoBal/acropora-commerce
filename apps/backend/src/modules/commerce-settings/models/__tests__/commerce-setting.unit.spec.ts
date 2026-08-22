import CommerceSetting from "../commerce-setting"

/**
 * Not in `src/modules/commerce-settings/__tests__/`: that path is also matched
 * by the `test:integration:modules` pattern in jest.config.js, which needs a
 * live PostgreSQL.
 */
describe("CommerceSetting model", () => {
  const parsed = CommerceSetting.parse()

  it("is registered as CommerceSetting", () => {
    expect(parsed.name).toBe("CommerceSetting")
  })

  it("stores a key, a value and a description", () => {
    expect(Object.keys(parsed.schema).sort()).toEqual([
      "created_at",
      "deleted_at",
      "description",
      "id",
      "key",
      "updated_at",
      "value",
    ])
  })

  it("allows one row per key, ignoring soft-deleted rows", () => {
    const index = parsed.indexes.find(
      (i) => JSON.stringify(i.on) === JSON.stringify(["key"])
    )

    expect(index).toBeDefined()
    expect(index!.unique).toBe(true)
    expect(String(index!.where)).toContain("deleted_at IS NULL")
  })

  it("keeps the value as text, so a scalar needs no cast", () => {
    const value = parsed.schema.value as unknown as {
      parse: (name: string) => { dataType: { name: string }; nullable: boolean }
    }
    const definition = value.parse("value")

    expect(definition.dataType.name).toBe("text")
    expect(definition.nullable).toBe(false)
  })
})
