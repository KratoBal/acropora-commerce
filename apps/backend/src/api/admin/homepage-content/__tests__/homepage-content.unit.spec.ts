import { PUT as adminPut } from "../route"
import HomepageContentModuleService from "../../../../modules/homepage-content/service"
import { GET as storeGet } from "../../../store/homepage-content/route"
import { AdminPutHomepageContent } from "../validators"

/*
  THE CONTRACT. What turns these red: a record accepted with a key missing or
  an unknown key; a sixth slide; a link or an image that leaves the shop or
  runs script; a text key with a space; the store answering with the record's
  id or key; the store failing (instead of answering null) before the OS has
  written anything.
*/
const slide = (over: Record<string, unknown> = {}) => ({
  eyebrow: "Új szállítmány",
  title: "Friss korallok",
  text: "Szöveg.",
  cta: "Korallok",
  cta_href: "/hu/store",
  cta2: "Útmutató",
  cta2_href: null,
  caption: "A fotón",
  caption2: "Egyedi példány",
  image_url: "https://shop.example/static/hero-1.jpg",
  image_alt: "Egy korall",
  ...over,
})
const record = (over: Record<string, unknown> = {}) => ({
  texts: { "hero.cim": "A zátonyod darabjait egyenként válogatjuk." },
  slides: [slide()],
  ...over,
})
const ok = (body: unknown) => AdminPutHomepageContent.safeParse(body).success

const BLOCK_KEYS = [
  "hero",
  "mit-keresel",
  "kezdo-es-halado",
  "egyedi-korallok",
  "szolgaltatasok",
  "markak",
  "velemenyek",
  "boltunk",
]
const blocks = (over: (b: { key: string; visible: boolean }[]) => unknown[] = (b) => b) =>
  over(BLOCK_KEYS.map((key) => ({ key, visible: true })))

const footer = (over: Record<string, unknown> = {}) => ({
  intro: "<p>Tengeri akvarisztika <strong>2004</strong> óta.</p>",
  columns: [
    {
      title: "Oldaltérkép",
      links: [
        { label: "Nyitóoldal", href: "/" },
        { label: "Blog", href: "https://acropora.hu/blog" },
      ],
    },
  ],
  social: { facebook: "https://www.facebook.com/acropora", instagram: null, youtube: null },
  bottom_text: "© Acropora Kft.",
  ...over,
})


describe("AdminPutHomepageContent", () => {
  it("HPC-PUT: takes the OS record, none or five slides, a cleared text", () => {
    expect(ok(record())).toBe(true)
    expect(ok(record({ slides: [] }))).toBe(true)
    expect(ok(record({ slides: Array.from({ length: 5 }, () => slide()) }))).toBe(true)
    expect(ok(record({ texts: { "hero.cim": "" } }))).toBe(true)
    expect(ok(record({ slides: [slide({ image_url: null })] }))).toBe(true)
    expect(ok(record({ slides: [slide({ image_url: "/static/hero.jpg" })] }))).toBe(true)
  })

  it("HPC-PUT-NULL: null slides is 'not set' and accepted; the key itself stays required", () => {
    expect(ok(record({ slides: null }))).toBe(true)
    expect(ok({ texts: {} })).toBe(false)
    expect(ok(record({ slides: "[]" }))).toBe(false)
  })

  it("HPC-PUT-FEATURED: the featured band's handles are optional, one URL segment each, at most twelve", () => {
    expect(ok(record())).toBe(true) // an OS that predates the field
    expect(ok(record({ featured_handles: null }))).toBe(true)
    expect(ok(record({ featured_handles: [] }))).toBe(true)
    expect(ok(record({ featured_handles: ["acropora-millepora-k-2417"] }))).toBe(true)
    expect(
      ok(record({ featured_handles: Array.from({ length: 12 }, (_, i) => `k-${i}`) }))
    ).toBe(true)
    expect(
      ok(record({ featured_handles: Array.from({ length: 13 }, (_, i) => `k-${i}`) }))
    ).toBe(false)
    for (const bad of ["", "a/b", "a b", "a?b", "a#b", "a\\b", 5, "..", "a..b", "a%2Fb", "<b>", 'a"b', "Nagy-Betu", "-a"])
      expect(ok(record({ featured_handles: [bad] }))).toBe(false)
    // each product once
    expect(ok(record({ featured_handles: ["k-1", "k-1"] }))).toBe(false)
    expect(ok(record({ featured_handles: ["k-1", "k-2"] }))).toBe(true)
    expect(ok(record({ featured_handles: "k-1" }))).toBe(false)
  })

  it("HPC-PUT-BRANDS: the logo strip's brand handles are optional, one URL segment each, each brand once, no design cap", () => {
    expect(ok(record())).toBe(true) // an OS that predates the field
    expect(ok(record({ featured_brand_handles: null }))).toBe(true)
    expect(ok(record({ featured_brand_handles: [] }))).toBe(true)
    expect(ok(record({ featured_brand_handles: ["fauna-marin", "d-d", "aqua-medic"] }))).toBe(true)
    // more than the product band's twelve: the strip has no fixed count
    expect(
      ok(record({ featured_brand_handles: Array.from({ length: 60 }, (_, i) => `m-${i}`) }))
    ).toBe(true)
    expect(
      ok(record({ featured_brand_handles: Array.from({ length: 501 }, (_, i) => `m-${i}`) }))
    ).toBe(false)
    for (const bad of ["", "a/b", "a b", "a?b", "..", "a..b", "a%2Fb", "<b>", "Nagy", "-a", 5])
      expect(ok(record({ featured_brand_handles: [bad] }))).toBe(false)
    expect(ok(record({ featured_brand_handles: ["d-d", "d-d"] }))).toBe(false)
    expect(ok(record({ featured_brand_handles: "d-d" }))).toBe(false)
  })

  it("HPC-PUT-BLOCKS: the order and visibility of the eight fixed blocks, each exactly once; optional and nullable", () => {
    expect(ok(record())).toBe(true) // an OS that predates the field
    expect(ok(record({ blocks: null }))).toBe(true)
    expect(ok(record({ blocks: blocks() }))).toBe(true)
    expect(ok(record({ blocks: blocks((b) => [...b].reverse()) }))).toBe(true)
    expect(
      ok(record({ blocks: blocks((b) => b.map((x) => ({ ...x, visible: x.key !== "hero" }))) }))
    ).toBe(true)
    // a missing block, a repeated block, a ninth block, an unknown key
    expect(ok(record({ blocks: blocks((b) => b.slice(1)) }))).toBe(false)
    expect(ok(record({ blocks: blocks((b) => [b[0], ...b.slice(0, 7)]) }))).toBe(false)
    expect(
      ok(record({ blocks: blocks((b) => [...b, { key: "hero", visible: true }]) }))
    ).toBe(false)
    expect(ok(record({ blocks: blocks((b) => [...b.slice(1), { key: "sajat-x", visible: true }]) }))).toBe(false)
    // visible must be a boolean; no extra fields (a free block's body is not part of this contract)
    expect(
      ok(record({ blocks: blocks((b) => b.map((x) => ({ ...x, visible: "true" }))) }))
    ).toBe(false)
    expect(
      ok(record({ blocks: blocks((b) => b.map((x) => ({ ...x, body: "<p>x</p>" }))) }))
    ).toBe(false)
  })

  it("HPC-PUT-FOOTER: intro, up to four columns of up to twelve links, social addresses, a bottom line; optional and nullable", () => {
    expect(ok(record({ footer: null }))).toBe(true)
    expect(ok(record({ footer: footer() }))).toBe(true)
    expect(ok(record({ footer: footer({ columns: [] }) }))).toBe(true)
    const column = (n: number) => ({
      title: `Oszlop ${n}`,
      links: Array.from({ length: 12 }, (_, i) => ({ label: `L${i}`, href: `/l${i}` })),
    })
    expect(ok(record({ footer: footer({ columns: [1, 2, 3, 4].map(column) }) }))).toBe(true)
    expect(ok(record({ footer: footer({ columns: [1, 2, 3, 4, 5].map(column) }) }))).toBe(false)
    expect(
      ok(
        record({
          footer: footer({
            columns: [
              { title: "T", links: Array.from({ length: 13 }, (_, i) => ({ label: `L${i}`, href: `/l${i}` })) },
            ],
          }),
        })
      )
    ).toBe(false)
    // the OS caps 4000 before cleaning; the cleaned value may be longer and must still pass
    expect(ok(record({ footer: footer({ intro: "x".repeat(4001) }) }))).toBe(true)
    expect(ok(record({ footer: footer({ intro: "x".repeat(8000) }) }))).toBe(true)
    expect(ok(record({ footer: footer({ intro: "x".repeat(8001) }) }))).toBe(false)
    expect(ok(record({ footer: footer({ bottom_text: "x".repeat(301) }) }))).toBe(false)
    // an unknown key (the shop's contact details come from the "A boltunk" texts, not from here)
    expect(
      ok(record({ footer: footer({ contact: { address: "Budapest", phone: "1", email: "a@b.hu", opening_hours: [] } }) }))
    ).toBe(false)
    expect(ok(record({ footer: { ...footer(), social: undefined } }))).toBe(false)
  })

  it("HPC-PUT-FOOTER-LEAVE: a footer link or social address that leaves the shop or runs script is refused", () => {
    const link = (href: string) =>
      ok(record({ footer: footer({ columns: [{ title: "T", links: [{ label: "L", href }] }] }) }))
    expect(link("/store")).toBe(true)
    expect(link("https://acropora.hu/blog")).toBe(true)
    expect(link("http://acropora.hu/blog")).toBe(true)
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "/\\evil.example", "mailto:a@b.hu", "ftp://x.hu/a", "https://a b.hu"])
      expect({ bad, accepted: link(bad) }).toEqual({ bad, accepted: false })
    const social = (facebook: string | null) =>
      ok(record({ footer: footer({ social: { facebook, instagram: null, youtube: null } }) }))
    expect(social("https://www.facebook.com/acropora")).toBe(true)
    expect(social(null)).toBe(true)
    // a social address is a full address, not a shop path
    for (const bad of ["/facebook", "javascript:alert(1)", "facebook.com/acropora"])
      expect({ bad, accepted: social(bad) }).toEqual({ bad, accepted: false })
    // the shop is the more tolerant side (the OS forbids an empty title): it must pass here
    expect(ok(record({ footer: footer({ columns: [{ title: "", links: [] }] }) }))).toBe(true)
    expect(ok(record({ footer: footer({ columns: [{ title: "x".repeat(101), links: [] }] }) }))).toBe(false)
    expect(
      ok(record({ footer: footer({ columns: [{ title: "T", links: [{ label: "", href: "/x" }] }] }) }))
    ).toBe(false)
  })

  it("HPC-PUT-FIVE: a sixth slide is refused", () => {
    expect(ok(record({ slides: Array.from({ length: 6 }, () => slide()) }))).toBe(false)
  })

  it("HPC-PUT-REFUSE: a missing key, an unknown key, a bad text key, a bad slide", () => {
    expect(ok({ texts: {} })).toBe(false)
    expect(ok({ slides: [] })).toBe(false)
    expect(ok(record({ extra: 1 }))).toBe(false)
    expect(ok(record({ texts: { "Hero cim": "x" } }))).toBe(false)
    expect(ok(record({ texts: { "hero.cim": 5 } }))).toBe(false)
    const { image_alt: _, ...noAlt } = slide()
    expect(ok(record({ slides: [noAlt] }))).toBe(false)
    expect(ok(record({ slides: [slide({ extra: 1 })] }))).toBe(false)
  })

  it("HPC-PUT-LEAVE: a link or an image that leaves the shop or runs script is refused", () => {
    for (const cta_href of ["//evil.example/x", "https://evil.example", "javascript:alert(1)", "hu/store"])
      expect(ok(record({ slides: [slide({ cta_href })] }))).toBe(false)
    for (const cta_href of ["/\\evil.example/x", "/\\/evil.example", "/a\\b", "/\t/evil.example"]) {
      expect(ok(record({ slides: [slide({ cta_href })] }))).toBe(false)
      expect(ok(record({ slides: [slide({ cta2_href: cta_href })] }))).toBe(false)
      expect(ok(record({ slides: [slide({ image_url: cta_href })] }))).toBe(false)
    }
    expect(ok(record({ slides: [slide({ cta_href: "/", image_url: "/static/a.jpg" })] }))).toBe(true)
    for (const image_url of ["javascript:alert(1)", "data:image/png;base64,AAAA", "//evil.example/a.jpg", "ftp://x/y.jpg"])
      expect(ok(record({ slides: [slide({ image_url })] }))).toBe(false)
  })
})

describe("store homepage content route", () => {
  const scope = (row: unknown) => ({
    resolve: () => ({
      retrieveMainHomepageContent: async () => row,
    }),
  })
  const response = () => {
    const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
    return res
  }

  it("HPC-STORE: the texts and slides, without the id and the key", async () => {
    const res = response()
    await storeGet(
      { scope: scope({ id: "hpc_1", key: "main", ...record(), updated_at: "2026-10-20" }) } as never,
      res as never
    )
    const content = (res.body as { homepage_content: Record<string, unknown> }).homepage_content
    expect(Object.keys(content).sort()).toEqual([
      "blocks",
      "featured_brand_handles",
      "featured_handles",
      "footer",
      "newsletter",
      "slides",
      "texts",
      "updated_at",
    ])
  })

  it("HPC-STORE-NULL-SLIDES: not-set slides reach the storefront as null, not as an empty list", async () => {
    const res = response()
    await storeGet(
      { scope: scope({ id: "hpc_1", key: "main", texts: {}, slides: null }) } as never,
      res as never
    )
    expect(
      (res.body as { homepage_content: { slides: unknown } }).homepage_content.slides
    ).toBeNull()
  })

  it("HPC-STORE-FEATURED: the featured handles reach the storefront, null when the OS never sent any", async () => {
    const withHandles = response()
    await storeGet(
      {
        scope: scope({ id: "hpc_1", key: "main", texts: {}, slides: null, featured_handles: ["k-1", "k-2"] }),
      } as never,
      withHandles as never
    )
    expect(
      (withHandles.body as { homepage_content: { featured_handles: unknown } }).homepage_content
        .featured_handles
    ).toEqual(["k-1", "k-2"])
    const without = response()
    await storeGet(
      { scope: scope({ id: "hpc_1", key: "main", texts: {}, slides: null }) } as never,
      without as never
    )
    expect(
      (without.body as { homepage_content: { featured_handles: unknown } }).homepage_content
        .featured_handles
    ).toBeNull()
  })

  it("HPC-STORE-BRANDS: the strip's brand handles reach the storefront, null when the OS never sent any", async () => {
    const withHandles = response()
    await storeGet(
      {
        scope: scope({ id: "hpc_1", key: "main", texts: {}, slides: null, featured_brand_handles: ["triton", "d-d"] }),
      } as never,
      withHandles as never
    )
    expect(
      (withHandles.body as { homepage_content: { featured_brand_handles: unknown } }).homepage_content
        .featured_brand_handles
    ).toEqual(["triton", "d-d"])
    const without = response()
    await storeGet(
      { scope: scope({ id: "hpc_1", key: "main", texts: {}, slides: null }) } as never,
      without as never
    )
    expect(
      (without.body as { homepage_content: { featured_brand_handles: unknown } }).homepage_content
        .featured_brand_handles
    ).toBeNull()
  })

  it("HPC-STORE-BLOCKS-FOOTER: the blocks and the footer reach the storefront, null when the OS never sent any", async () => {
    const list = BLOCK_KEYS.map((key) => ({ key, visible: true }))
    const withBoth = response()
    await storeGet(
      { scope: scope({ id: "hpc_1", key: "main", texts: {}, slides: null, blocks: list, footer: footer() }) } as never,
      withBoth as never
    )
    const sent = (withBoth.body as { homepage_content: { blocks: unknown; footer: unknown } }).homepage_content
    expect(sent.blocks).toEqual(list)
    expect(sent.footer).toEqual(footer())
    const without = response()
    await storeGet(
      { scope: scope({ id: "hpc_1", key: "main", texts: {}, slides: null }) } as never,
      without as never
    )
    const none = (without.body as { homepage_content: { blocks: unknown; footer: unknown } }).homepage_content
    expect(none.blocks).toBeNull()
    expect(none.footer).toBeNull()
  })

  it("HPC-STORE-EMPTY: nothing written yet is null, not an error", async () => {
    const res = response()
    await storeGet({ scope: scope(null) } as never, res as never)
    expect(res.body).toEqual({ homepage_content: null })
  })
})

describe("admin homepage content PUT route", () => {
  const body = record()
  const run = async (env: Record<string, string | undefined>, fetchImpl: typeof fetch) => {
    const saved = { ...process.env }
    Object.assign(process.env, env)
    for (const k of Object.keys(env)) if (env[k] === undefined) delete process.env[k]
    const original = global.fetch
    global.fetch = fetchImpl
    try {
      const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
      const logger = { info: jest.fn(), warn: jest.fn() }
      const scope = {
        resolve: (name: string) =>
          name === "logger"
            ? logger
            : { upsertMainHomepageContent: async (b: unknown) => ({ id: "hpc_1", ...(b as object) }) },
      }
      await adminPut({ scope, validatedBody: body } as never, res as never)
      return { res, logger }
    } finally {
      global.fetch = original
      process.env = saved
    }
  }

  it("HPC-REVALIDATE: a save empties the storefront's homepage-content tag", async () => {
    const calls: { url: string; tags: string[] }[] = []
    const fetchImpl = (async (url: string, init: { body: string }) => {
      calls.push({ url, tags: JSON.parse(init.body).tags })
      return { ok: true, status: 200 }
    }) as unknown as typeof fetch
    const { res } = await run(
      { ACROPORA_STOREFRONT_URL: "https://shop.example", STOREFRONT_REVALIDATE_SECRET: "s" },
      fetchImpl
    )
    expect(calls).toEqual([{ url: "https://shop.example/api/revalidate", tags: ["homepage-content"] }])
    expect((res.body as { homepage_content: { id: string } }).homepage_content.id).toBe("hpc_1")
  })

  it("HPC-REVALIDATE-OFF: without the storefront address the save still answers and nothing is called", async () => {
    const fetchImpl = jest.fn() as unknown as typeof fetch
    const { res } = await run(
      { ACROPORA_STOREFRONT_URL: undefined, STOREFRONT_REVALIDATE_SECRET: undefined },
      fetchImpl
    )
    expect(fetchImpl).not.toHaveBeenCalled()
    expect((res.body as { homepage_content: unknown }).homepage_content).toBeTruthy()
  })

  it("HPC-REVALIDATE-FAIL: a failing purge is logged, the save still answers", async () => {
    const fetchImpl = (async () => {
      throw new Error("connection refused")
    }) as unknown as typeof fetch
    const { res } = await run(
      { ACROPORA_STOREFRONT_URL: "https://shop.example", STOREFRONT_REVALIDATE_SECRET: "s" },
      fetchImpl
    )
    expect((res.body as { homepage_content: unknown }).homepage_content).toBeTruthy()
  })
})

/*
  THE STORED LIST SURVIVES A SAVE THAT DOES NOT CARRY IT (barracuda, #555). An
  OS that saves only the texts must not blank the band; null or an empty list
  is the explicit "none". A small fake of the generated CRUD methods keeps the
  partial-update semantics of the real ones (a key not in the data stays).
*/
describe("HomepageContentModuleService.upsertMainHomepageContent", () => {
  const fake = () => {
    let row: Record<string, unknown> | null = null
    const methods = {
      listHomepageContents: async () => (row ? [row] : []),
      createHomepageContents: async ([data]: Record<string, unknown>[]) => {
        row = { id: "hpc_1", ...data }
        return [row]
      },
      updateHomepageContents: async ([data]: Record<string, unknown>[]) => {
        row = { ...row, ...data }
        return [row]
      },
    }
    const save = (input: Record<string, unknown>) =>
      HomepageContentModuleService.prototype.upsertMainHomepageContent.call(
        methods as never,
        input as never
      )
    return { save, stored: () => row }
  }
  const base = { texts: {}, slides: null }

  it("HPC-SVC-KEEP: a save without featured_handles keeps the stored list", async () => {
    const { save, stored } = fake()
    await save({ ...base, featured_handles: ["k-1"] })
    await save({ ...base, texts: { "mit.cim": "Új" } })
    expect(stored()?.featured_handles).toEqual(["k-1"])
    expect((stored()?.texts as Record<string, string>)["mit.cim"]).toBe("Új")
  })

  it("HPC-SVC-CLEAR: null and an empty list empty the band, a new list replaces it", async () => {
    const { save, stored } = fake()
    await save({ ...base, featured_handles: ["k-1", "k-2"] })
    await save({ ...base, featured_handles: ["k-3"] })
    expect(stored()?.featured_handles).toEqual(["k-3"])
    await save({ ...base, featured_handles: [] })
    expect(stored()?.featured_handles).toEqual([])
    await save({ ...base, featured_handles: ["k-4"] })
    await save({ ...base, featured_handles: null })
    expect(stored()?.featured_handles).toBeNull()
  })

  it("HPC-SVC-BRANDS: absent keeps the stored brand list, a new list replaces it, null clears it", async () => {
    const { save, stored } = fake()
    await save({ ...base, featured_brand_handles: ["triton", "d-d"] })
    await save({ ...base, texts: { "mit.cim": "Új" } })
    expect(stored()?.featured_brand_handles).toEqual(["triton", "d-d"])
    // the product band's list and the brand list do not touch each other
    await save({ ...base, featured_handles: ["k-1"] })
    expect(stored()?.featured_brand_handles).toEqual(["triton", "d-d"])
    await save({ ...base, featured_brand_handles: ["d-d"] })
    expect(stored()?.featured_brand_handles).toEqual(["d-d"])
    expect(stored()?.featured_handles).toEqual(["k-1"])
    await save({ ...base, featured_brand_handles: [] })
    expect(stored()?.featured_brand_handles).toEqual([])
    await save({ ...base, featured_brand_handles: null })
    expect(stored()?.featured_brand_handles).toBeNull()
  })

  it("HPC-SVC-BLOCKS-FOOTER: absent keeps the stored blocks and footer, null clears them, a new value replaces them", async () => {
    const { save, stored } = fake()
    const list = BLOCK_KEYS.map((key) => ({ key, visible: true }))
    await save({ ...base, blocks: list, footer: footer() })
    await save({ ...base, texts: { "mit.cim": "Új" } })
    expect(stored()?.blocks).toEqual(list)
    expect(stored()?.footer).toEqual(footer())
    const reordered = [...list].reverse()
    await save({ ...base, blocks: reordered, footer: footer({ bottom_text: "Új" }) })
    expect(stored()?.blocks).toEqual(reordered)
    expect((stored()?.footer as { bottom_text: string }).bottom_text).toBe("Új")
    await save({ ...base, blocks: null, footer: null })
    expect(stored()?.blocks).toBeNull()
    expect(stored()?.footer).toBeNull()
  })

  it("HPC-SVC-NEWSLETTER: absent keeps the stored newsletter row, null clears it, a new row replaces it", async () => {
    const { save, stored } = fake()
    const row = {
      enabled: true,
      title: "Hírlevél",
      text: "Iratkozz fel!",
      consent_text: "Hozzájárulok.",
      button: "Feliratkozás",
    }
    await save({ ...base, newsletter: row })
    await save({ ...base, texts: { "mit.cim": "Új" } })
    expect(stored()?.newsletter).toEqual(row)
    await save({ ...base, newsletter: { ...row, enabled: false } })
    expect((stored()?.newsletter as { enabled: boolean }).enabled).toBe(false)
    await save({ ...base, newsletter: null })
    expect(stored()?.newsletter).toBeNull()
  })

  it("HPC-SVC-BLOCKS-COPY: the stored footer is a copy, not the caller's object", async () => {
    const { save, stored } = fake()
    const input = footer()
    await save({ ...base, footer: input })
    input.columns[0]!.title = "Átírva"
    expect((stored()?.footer as { columns: { title: string }[] }).columns[0]!.title).toBe("Oldaltérkép")
  })

  it("HPC-SVC-FIRST: a first save without the field stores nothing for it", async () => {
    const { save, stored } = fake()
    await save(base)
    expect(stored()?.featured_handles).toBeUndefined()
  })
})
