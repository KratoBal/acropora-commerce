import LandingPage from "../landing-page"

/**
 * The model, without a database. Lives under `models/` for the same reason as
 * the brand test: `src/modules/<m>/__tests__/` is matched by
 * `test:integration:modules`, which needs a live PostgreSQL.
 */
const uniqueOn = (
  parsed: ReturnType<typeof LandingPage.parse>,
  column: string
) =>
  parsed.indexes.find((i) => JSON.stringify(i.on) === JSON.stringify([column]))

describe("landing page model", () => {
  it("LP-MODEL: the OS id, the page fields and the filter, unique by OS id and by handle", () => {
    const parsed = LandingPage.parse()
    expect(Object.keys(parsed.schema).sort()).toEqual([
      "created_at",
      "deleted_at",
      "filter",
      "handle",
      "id",
      "intro",
      "is_published",
      "meta_description",
      "os_landing_id",
      "seo_title",
      "title",
      "updated_at",
    ])
    for (const column of ["os_landing_id", "handle"]) {
      expect(uniqueOn(parsed, column)?.unique).toBe(true)
      expect(String(uniqueOn(parsed, column)?.where)).toContain(
        "deleted_at IS NULL"
      )
    }
  })
})
