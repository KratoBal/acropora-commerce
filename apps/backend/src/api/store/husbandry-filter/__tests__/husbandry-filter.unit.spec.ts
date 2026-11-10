import { kulcsosCache, MAX } from "../gyorsitotar"
import { husbandryFilterGet } from "../route"
import { savja, szures, szuroKeresbol, szuroTenyek, type Termek } from "../szures"

/*
  THE HUSBANDRY FILTER (V2.2 S5). What turns these red: an animal without data (or without the asked fact) matching, or
  dropped without being counted; an animal a decided group rules out counted as unchecked; two values of one group
  combined with AND, or two groups with OR; "FELTETELES" counted as kept with corals; a band edge (100, 300) on the wrong
  side; a malformed block read as data; the category's products read unbounded, from every channel, or unpublished.
*/
const blokk = (o: Record<string, unknown>) => ({ husbandry: JSON.stringify({ v: 1, kind: "fish", ...o }) })

describe("szuroTenyek", () => {
  it("reads the three facts, and nothing from a malformed block", () => {
    expect(szuroTenyek(blokk({ difficulty: "HALADO", reef_safe: "IGEN", min_liter: 300 }))).toEqual({
      difficulty: "HALADO",
      reefSafe: "IGEN",
      minLiter: 300,
    })
    for (const m of [
      null,
      {},
      { husbandry: { v: 1, kind: "fish" } },
      { husbandry: "{nem json" },
      { husbandry: JSON.stringify({ v: 2, kind: "fish" }) },
      { husbandry: JSON.stringify({ v: 1, kind: "bird" }) },
      { husbandry: "[1]" },
    ])
      expect(szuroTenyek(m as never)).toBeNull()
    expect(szuroTenyek(blokk({ difficulty: "KITALALT", reef_safe: "TALAN", min_liter: -5 }))).toEqual({
      difficulty: null,
      reefSafe: null,
      minLiter: null,
    })
  })
})

describe("the bands (a proposal: up to 100 l, 101-300 l, over 300 l)", () => {
  it("puts the edges on the lower band", () => {
    expect([1, 100, 100.5, 300, 301].map(savja)).toEqual(["0-100", "0-100", "101-300", "101-300", "301-"])
  })
})

describe("szuroKeresbol", () => {
  it("keeps the known values once, drops the rest", () => {
    expect(
      szuroKeresbol({ difficulty: ["KONNYU", "KONNYU", "X"], reef_safe: "1", tank: ["301-", "300+"] })
    ).toEqual({ difficulty: ["KONNYU"], reefSafe: true, tank: ["301-"] })
    expect(szuroKeresbol({ difficulty: "KOZEPES", reef_safe: "0" })).toEqual({
      difficulty: ["KOZEPES"],
      reefSafe: false,
      tank: [],
    })
  })
})

describe("szures", () => {
  const t = (id: string, o: Record<string, unknown> | null): Termek => ({
    id,
    tenyek: o ? szuroTenyek(blokk(o)) : null,
  })
  const termekek = [
    t("a", { difficulty: "KONNYU", reef_safe: "IGEN", min_liter: 80 }),
    t("b", { difficulty: "KOZEPES", reef_safe: "FELTETELES", min_liter: 200 }),
    t("c", { difficulty: "HALADO", reef_safe: "IGEN", min_liter: 400 }),
    t("d", { difficulty: "KONNYU" }),
    t("e", null),
  ]

  it("without a filter: no ids, nothing unchecked, the counts per value", () => {
    expect(szures(termekek, szuroKeresbol({}))).toEqual({
      product_ids: [],
      unchecked: 0,
      facets: {
        difficulty: { KONNYU: 2, KOZEPES: 1, HALADO: 1, SZAKERTO: 0 },
        reef_safe: 2,
        tank: { "0-100": 1, "101-300": 1, "301-": 1 },
      },
    })
  })

  it("any value within a group, every group together; the animal without data counted, not listed", () => {
    const egy = szures(termekek, szuroKeresbol({ difficulty: ["KONNYU", "KOZEPES"] }))
    expect(egy.product_ids).toEqual(["a", "b", "d"])
    expect(egy.unchecked).toBe(1)
    const ketto = szures(termekek, szuroKeresbol({ difficulty: ["KONNYU", "KOZEPES"], reef_safe: "1" }))
    expect(ketto.product_ids).toEqual(["a"])
    // b is "FELTETELES": placed, not kept-with-corals; d lacks the reef fact; e has no block
    expect(ketto.unchecked).toBe(2)
  })

  it("an animal a decided group rules out is not unchecked, even if another fact is missing", () => {
    const r = szures(termekek, szuroKeresbol({ difficulty: "HALADO", tank: "0-100" }))
    expect(r.product_ids).toEqual([])
    // a, b, c are ruled out by a decided fact; d (KONNYU) is ruled out by difficulty although its tank is missing
    expect(r.unchecked).toBe(1)
  })

  it("the tank bands", () => {
    expect(szures(termekek, szuroKeresbol({ tank: ["101-300", "301-"] })).product_ids).toEqual(["b", "c"])
  })
})

describe("GET /store/husbandry-filter", () => {
  const KATEGORIAK = [
    { id: "pcat_hal", is_active: true, is_internal: false },
    { id: "c", is_active: true, is_internal: false },
    { id: "c2", is_active: true, is_internal: false },
    { id: "inaktiv", is_active: false, is_internal: false },
    { id: "belso", is_active: true, is_internal: true },
  ]
  const futtat = async (opts: {
    query: Record<string, unknown>
    products?: { id: string; metadata: Record<string, unknown> | null; channels?: string[] | null }[]
    channels?: string[]
    /** a handler shared across calls (its caches); a fresh one per call by default */
    handler?: ReturnType<typeof husbandryFilterGet>
    listCalls?: { filters: unknown; config: unknown }[]
    categoryCalls?: unknown[]
    listProducts?: () => Promise<unknown>
  }) => {
    const listCalls = opts.listCalls ?? []
    const categoryCalls = opts.categoryCalls ?? []
    const warnings: string[] = []
    const products = opts.products ?? []
    const scope = {
      resolve: (key: string) => {
        if (key === "product")
          return {
            listProductCategories: async (filters: { is_active: boolean; is_internal: boolean }) => {
              categoryCalls.push(filters)
              return KATEGORIAK.filter(
                (k) => k.is_active === filters.is_active && k.is_internal === filters.is_internal
              ).map(({ id }) => ({ id }))
            },
            listProducts: async (filters: unknown, config: { take: number }) => {
              listCalls.push({ filters, config })
              if (opts.listProducts) return opts.listProducts()
              return products.slice(0, config.take).map(({ id, metadata }) => ({ id, metadata }))
            },
          }
        if (key === "query")
          return {
            graph: async (q: { filters: { id: string[] } }) => ({
              data: products
                .filter((p) => q.filters.id.includes(p.id))
                .map((p) => ({
                  id: p.id,
                  sales_channels: p.channels === null ? undefined : (p.channels ?? []).map((id) => ({ id })),
                })),
            }),
          }
        if (key === "logger") return { warn: (m: string) => warnings.push(m) }
        throw new Error(key)
      },
    }
    const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
    await (opts.handler ?? husbandryFilterGet(60_000))(
      {
        scope,
        query: opts.query,
        publishable_key_context: opts.channels ? { sales_channel_ids: opts.channels } : undefined,
      } as never,
      res as never
    )
    return { body: res.body as Record<string, unknown>, listCalls, warnings }
  }

  it("asks for the category's published products, newest first, bounded", async () => {
    const { listCalls } = await futtat({ query: { category_id: "pcat_hal" } })
    expect(listCalls).toEqual([
      {
        filters: { status: "published", categories: { id: ["pcat_hal"] } },
        config: { select: ["id", "metadata"], order: { created_at: "DESC", id: "DESC" }, take: 1001 },
      },
    ])
  })

  it("without a category it refuses", async () => {
    await expect(futtat({ query: {} })).rejects.toThrow("category_id is required")
  })

  it("counts only the storefront channel's products", async () => {
    const { body } = await futtat({
      query: { category_id: "c", difficulty: "KONNYU" },
      channels: ["sc_web"],
      products: [
        { id: "web", metadata: blokk({ difficulty: "KONNYU" }), channels: ["sc_web"] },
        { id: "pult", metadata: blokk({ difficulty: "KONNYU" }), channels: ["sc_pult"] },
        { id: "pult-nincs", metadata: null, channels: ["sc_pult"] },
      ],
    })
    expect(body).toMatchObject({ product_ids: ["web"], unchecked: 0, complete: true })
    expect((body.facets as { difficulty: { KONNYU: number } }).difficulty.KONNYU).toBe(1)
  })

  it("an answer without the channel field narrows nothing, and leaves a warning", async () => {
    const { body, warnings } = await futtat({
      query: { category_id: "c", difficulty: "KONNYU" },
      channels: ["sc_web"],
      products: [{ id: "a", metadata: blokk({ difficulty: "KONNYU" }), channels: null }],
    })
    expect(body.product_ids).toEqual(["a"])
    expect(warnings).toHaveLength(1)
  })

  it("over the bound: complete is false", async () => {
    const products = Array.from({ length: 1001 }, (_, i) => ({ id: `p${i}`, metadata: null }))
    const { body } = await futtat({ query: { category_id: "c" }, products })
    expect(body.complete).toBe(false)
  })

  /*
    BEFORE LIVE (barracuda, #730). What turns these red: an inactive, internal or unknown category answered (or its
    products read); a second call within the TTL reading the products again, also with another filter; a reading
    served after the TTL; two channel sets sharing a reading; a failed reading cached; concurrent calls reading twice.
  */
  it("an inactive, internal or unknown category: 404, and its products are not read", async () => {
    for (const category_id of ["inaktiv", "belso", "nincs-ilyen"]) {
      const listCalls: { filters: unknown; config: unknown }[] = []
      await expect(futtat({ query: { category_id }, listCalls })).rejects.toThrow("was not found")
      expect(listCalls).toEqual([])
    }
  })

  it("within the TTL one reading per category and channel set, whatever the filter; after it, a new one", async () => {
    let clock = 0
    const handler = husbandryFilterGet(60_000, () => clock)
    const listCalls: { filters: unknown; config: unknown }[] = []
    const categoryCalls: unknown[] = []
    const products = [
      { id: "a", metadata: blokk({ difficulty: "KONNYU" }), channels: ["sc_web"] },
      { id: "b", metadata: blokk({ difficulty: "HALADO" }), channels: ["sc_web"] },
    ]
    const hivas = (query: Record<string, unknown>, channels = ["sc_web"]) =>
      futtat({ query, products, channels, handler, listCalls, categoryCalls })

    expect((await hivas({ category_id: "c", difficulty: "KONNYU" })).body.product_ids).toEqual(["a"])
    clock = 59_999
    expect((await hivas({ category_id: "c", difficulty: "HALADO" })).body.product_ids).toEqual(["b"])
    expect(listCalls).toHaveLength(1)
    expect(categoryCalls).toHaveLength(1)

    await hivas({ category_id: "c2" })
    await hivas({ category_id: "c" }, ["sc_pult"])
    expect(listCalls).toHaveLength(3)

    clock = 60_000
    await hivas({ category_id: "c" })
    expect(listCalls).toHaveLength(4)
    expect(categoryCalls).toHaveLength(2)
  })

  it("a failed reading is not cached; concurrent calls share one reading", async () => {
    const handler = husbandryFilterGet(60_000, () => 0)
    const listCalls: { filters: unknown; config: unknown }[] = []
    let hiba = true
    const listProducts = async () => {
      if (hiba) throw new Error("adatbazis")
      return [{ id: "a", metadata: null }]
    }
    await expect(
      futtat({ query: { category_id: "c" }, handler, listCalls, listProducts })
    ).rejects.toThrow("adatbazis")
    hiba = false
    await Promise.all([
      futtat({ query: { category_id: "c" }, handler, listCalls, listProducts }),
      futtat({ query: { category_id: "c" }, handler, listCalls, listProducts }),
    ])
    expect(listCalls).toHaveLength(2)
  })
})

describe("kulcsosCache", () => {
  it("over MAX the expired entries go first, then the oldest", async () => {
    let clock = 0
    const cache = kulcsosCache<number>(10, () => clock)
    let builds = 0
    const build = async () => ++builds
    for (let i = 0; i < MAX; i++) await cache(`k${i}`, build)
    clock = 5
    await cache("uj", build) // full, none expired: the oldest (k0) goes
    expect(builds).toBe(MAX + 1)
    await cache("k1", build) // still cached
    expect(builds).toBe(MAX + 1)
    await cache("k0", build) // gone, built again
    expect(builds).toBe(MAX + 2)
  })
})

