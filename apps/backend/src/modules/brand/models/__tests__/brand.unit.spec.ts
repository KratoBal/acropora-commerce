import Brand from "../brand"
import ProductBrand from "../product-brand"
import BrandModuleService from "../../service"

/**
 * The models and the two upserts, without a database. Lives under `models/`
 * for the same reason as the shipping-attributes test: `src/modules/<m>/__tests__/`
 * is matched by `test:integration:modules`, which needs a live PostgreSQL.
 */
const uniqueOn = (
  parsed: ReturnType<typeof Brand.parse>,
  column: string
) =>
  parsed.indexes.find((i) => JSON.stringify(i.on) === JSON.stringify([column]))

describe("brand models", () => {
  it("a brand carries the OS id and the page fields, unique by OS id and by handle", () => {
    const parsed = Brand.parse()
    expect(Object.keys(parsed.schema).sort()).toEqual([
      "created_at",
      "deleted_at",
      "description",
      "handle",
      "id",
      "intro",
      "logo_url",
      "meta_description",
      "name",
      "os_brand_id",
      "seo_title",
      "updated_at",
      "website_url",
    ])
    for (const column of ["os_brand_id", "handle"]) {
      expect(uniqueOn(parsed, column)?.unique).toBe(true)
      expect(String(uniqueOn(parsed, column)?.where)).toContain(
        "deleted_at IS NULL"
      )
    }
  })

  it("a product has at most one brand row", () => {
    const parsed = ProductBrand.parse()
    expect(uniqueOn(parsed, "product_id")?.unique).toBe(true)
    expect(uniqueOn(parsed, "os_brand_id")?.unique).toBeFalsy()
  })
})

/*
  THE TWO UPSERTS. What turns them red: a second brand row created for an OS id
  that already has one; a product link written again when it already says the
  same; `null` leaving the old link in place.
*/
describe("BrandModuleService", () => {
  const fake = (rows: {
    brands?: { id: string; os_brand_id: string }[]
    links?: { id: string; product_id: string; os_brand_id: string }[]
  }) => {
    const calls: string[] = []
    const self = {
      listBrands: async (filter: { os_brand_id: string }) =>
        (rows.brands ?? []).filter((b) => b.os_brand_id === filter.os_brand_id),
      createBrands: async (input: { os_brand_id: string }[]) => {
        calls.push(`create brand ${input[0].os_brand_id}`)
        return [{ id: "brand_new", ...input[0] }]
      },
      updateBrands: async (input: { id: string }[]) => {
        calls.push(`update brand ${input[0].id}`)
        return input
      },
      listProductBrands: async (filter: { product_id: string }) =>
        (rows.links ?? []).filter((l) => l.product_id === filter.product_id),
      createProductBrands: async (
        input: { product_id: string; os_brand_id: string }[]
      ) => {
        calls.push(`create link ${input[0].product_id}=${input[0].os_brand_id}`)
        return input
      },
      updateProductBrands: async (input: { id: string; os_brand_id: string }[]) => {
        calls.push(`update link ${input[0].id}=${input[0].os_brand_id}`)
        return input
      },
      deleteProductBrands: async (ids: string[]) => {
        calls.push(`delete link ${ids.join(",")}`)
      },
    }
    const service = BrandModuleService.prototype
    return {
      calls,
      upsert: (os: string) =>
        service.upsertBrandByOsId.call(self as never, os, {
          name: "Aquaforest",
          handle: "aquaforest",
          description: null,
          intro: null,
          seo_title: null,
          meta_description: null,
          logo_url: null,
          website_url: null,
        }),
      link: (product: string, os: string | null) =>
        service.setProductBrand.call(self as never, product, os),
    }
  }

  it("creates the brand once, then updates the same row", async () => {
    const empty = fake({})
    await empty.upsert("os_1")
    const existing = fake({ brands: [{ id: "brand_1", os_brand_id: "os_1" }] })
    await existing.upsert("os_1")
    expect([...empty.calls, ...existing.calls]).toEqual([
      "create brand os_1",
      "update brand brand_1",
    ])
  })

  it("links, relinks, leaves an equal link alone, and clears on null", async () => {
    const f = fake({
      links: [
        { id: "pb_1", product_id: "prod_1", os_brand_id: "os_1" },
        { id: "pb_2", product_id: "prod_2", os_brand_id: "os_1" },
      ],
    })
    await f.link("prod_new", "os_1")
    await f.link("prod_1", "os_1")
    await f.link("prod_2", "os_2")
    await f.link("prod_1", null)
    await f.link("prod_none", null)
    expect(f.calls).toEqual([
      "create link prod_new=os_1",
      "update link pb_2=os_2",
      "delete link pb_1",
    ])
  })
})
