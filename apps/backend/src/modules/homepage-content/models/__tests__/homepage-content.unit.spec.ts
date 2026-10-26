import HomepageContent from "../homepage-content"

/** The model, without a database (same placement reason as the landing page test). */
describe("homepage content model", () => {
  it("HPC-MODEL: a key, the texts and the slides, unique by key among the live rows", () => {
    const parsed = HomepageContent.parse()
    expect(Object.keys(parsed.schema).sort()).toEqual([
      "blocks",
      "created_at",
      "deleted_at",
      "featured_handles",
      "footer",
      "id",
      "key",
      "slides",
      "texts",
      "updated_at",
    ])
    const unique = parsed.indexes.find(
      (i) => JSON.stringify(i.on) === JSON.stringify(["key"])
    )
    expect(unique?.unique).toBe(true)
    expect(String(unique?.where)).toContain("deleted_at IS NULL")
  })
})
