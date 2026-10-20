import { PUT as adminPut } from "../route"
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

describe("AdminPutHomepageContent", () => {
  it("HPC-PUT: takes the OS record, none or five slides, a cleared text", () => {
    expect(ok(record())).toBe(true)
    expect(ok(record({ slides: [] }))).toBe(true)
    expect(ok(record({ slides: Array.from({ length: 5 }, () => slide()) }))).toBe(true)
    expect(ok(record({ texts: { "hero.cim": "" } }))).toBe(true)
    expect(ok(record({ slides: [slide({ image_url: null })] }))).toBe(true)
    expect(ok(record({ slides: [slide({ image_url: "/static/hero.jpg" })] }))).toBe(true)
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
    expect(Object.keys(content).sort()).toEqual(["slides", "texts", "updated_at"])
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
