import { GET as storeList } from "../../../store/landing-pages/route"
import { GET as storeOne } from "../../../store/landing-pages/[handle]/route"
import { AdminPutLandingPage } from "../validators"

/*
  THE CONTRACT (SEO P1-14). What turns these red: a record accepted with a key
  missing or an unknown key; a handle with a slash (one URL segment,
  `/hu/valogatas/{handle}`); the store answering an unpublished page, or with
  the OS id or the publish flag; an unknown handle answered as 200.
*/
const record = (over: Record<string, unknown> = {}) => ({
  handle: "led-vilagitas-tengeri-akvariumhoz",
  title: "LED világítás tengeri akváriumhoz",
  seo_title: null,
  meta_description: "Válogatás.",
  intro: "Bevezető.",
  filter: { category_ids: ["pcat_led"], os_brand_ids: ["brand-1"], attribute_filters: [] },
  is_published: true,
  ...over,
})

describe("AdminPutLandingPage", () => {
  const ok = (body: unknown) => AdminPutLandingPage.safeParse(body).success

  it("LP-PUT: takes the OS projection's record", () => {
    expect(ok(record())).toBe(true)
    expect(
      ok(
        record({
          filter: {
            category_ids: [],
            os_brand_ids: [],
            attribute_filters: [{ key: "flowRate", op: "gte", value: 3000 }],
          },
        })
      )
    ).toBe(true)
  })

  it("LP-PUT-REFUSE: a missing key, an unknown key, a bad handle, a bad filter", () => {
    const { intro: _, ...missing } = record()
    expect(ok(missing)).toBe(false)
    expect(ok(record({ extra: 1 }))).toBe(false)
    expect(ok(record({ handle: "a/b" }))).toBe(false)
    expect(ok(record({ handle: "" }))).toBe(false)
    expect(
      ok(record({ filter: { category_ids: [""], os_brand_ids: [], attribute_filters: [] } }))
    ).toBe(false)
    expect(ok(record({ filter: { category_ids: [], os_brand_ids: [] } }))).toBe(false)
    expect(ok(record({ is_published: "yes" }))).toBe(false)
    expect(
      ok(
        record({
          filter: { category_ids: [], os_brand_ids: [], attribute_filters: [{ key: "x" }] },
        })
      )
    ).toBe(false)
  })
})

describe("store landing page routes", () => {
  const rows = [
    { ...record(), os_landing_id: "os-1", id: "lpage_1" },
    { ...record({ handle: "vazlat", is_published: false }), os_landing_id: "os-2", id: "lpage_2" },
  ]
  const scope = () => ({
    resolve: () => ({
      listLandingPages: async (filter: { handle?: string; is_published?: boolean }) =>
        rows.filter(
          (r) =>
            (filter.handle === undefined || r.handle === filter.handle) &&
            (filter.is_published === undefined || r.is_published === filter.is_published)
        ),
    }),
  })
  const response = () => {
    const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
    return res
  }

  it("LP-STORE-LIST: only the published pages, without the OS id and the flag", async () => {
    const res = response()
    await storeList({ scope: scope() } as never, res as never)
    const pages = (res.body as { landing_pages: Record<string, unknown>[] }).landing_pages
    expect(pages.map((p) => p.handle)).toEqual(["led-vilagitas-tengeri-akvariumhoz"])
    expect("os_landing_id" in pages[0]).toBe(false)
    expect("is_published" in pages[0]).toBe(false)
  })

  it("LP-STORE-ONE: a published page by handle; a draft and an unknown one are 404", async () => {
    const res = response()
    await storeOne(
      { scope: scope(), params: { handle: "led-vilagitas-tengeri-akvariumhoz" } } as never,
      res as never
    )
    expect((res.body as { landing_page: { title: string } }).landing_page.title).toBe(
      "LED világítás tengeri akváriumhoz"
    )
    for (const handle of ["vazlat", "nincs-ilyen"])
      await expect(
        storeOne({ scope: scope(), params: { handle } } as never, response() as never)
      ).rejects.toMatchObject({ type: "not_found" })
  })
})
