import { afterEach, describe, expect, it, vi } from "vitest"

const cache = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock("next/cache", () => cache)

import { POST } from "./route"

const keres = (titok: string | null, torzs: unknown) =>
  new Request("http://kirakat.test/api/revalidate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(titok === null ? {} : { "x-revalidate-secret": titok }),
    },
    body: typeof torzs === "string" ? torzs : JSON.stringify(torzs),
  }) as never

afterEach(() => {
  vi.unstubAllEnvs()
  cache.revalidateTag.mockReset()
})

/*
  A KIRAKAT URITO UTJA (kartya 2d22116c). MI PIROSIT: titok nelkul is el; rossz
  vagy hianyzo titokkal urit; mas cimket is urit, mint a products; a helyes
  hivas nem a kozos products cimket uriti.
*/
describe("POST /api/revalidate", () => {
  it("titok beállítása nélkül nincs út", async () => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", "")
    expect((await POST(keres("x", { tags: ["products"] }))).status).toBe(404)
    expect(cache.revalidateTag).not.toHaveBeenCalled()
  })

  it("rossz vagy hiányzó titokkal 401, és nem ürít", async () => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", "a-helyes-titok")
    for (const titok of ["rossz", "a-helyes-tito", "a-helyes-titokk", null])
      expect((await POST(keres(titok, { tags: ["products"] }))).status).toBe(
        401,
      )
    expect(cache.revalidateTag).not.toHaveBeenCalled()
  })

  it("csak a products és a redirects címke üríthető", async () => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", "a-helyes-titok")
    for (const torzs of [
      { tags: ["carts"] },
      { tags: ["products", "carts"] },
      {},
      "nem json",
    ])
      expect((await POST(keres("a-helyes-titok", torzs))).status).toBe(400)
    expect(cache.revalidateTag).not.toHaveBeenCalled()
  })

  it("a helyes hívás a közös products címkét üríti", async () => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", "a-helyes-titok")
    const valasz = await POST(keres("a-helyes-titok", { tags: ["products"] }))
    expect(valasz.status).toBe(200)
    expect(await valasz.json()).toEqual({ revalidated: ["products"] })
    expect(cache.revalidateTag.mock.calls).toEqual([["products"]])
  })

  it("a régi címek listája (SEO P0 PR 7c) a redirects címkét üríti", async () => {
    vi.stubEnv("STOREFRONT_REVALIDATE_SECRET", "a-helyes-titok")
    const valasz = await POST(keres("a-helyes-titok", { tags: ["redirects"] }))
    expect(valasz.status).toBe(200)
    expect(cache.revalidateTag.mock.calls).toEqual([["redirects"]])
  })
})
