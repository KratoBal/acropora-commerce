// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

const suti = vi.hoisted(() => ({ ertek: undefined as string | undefined }))
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nev: string) =>
      nev === "_medusa_cache_id" && suti.ertek
        ? { value: suti.ertek }
        : undefined,
  }),
}))

import { getCacheOptions } from "./cookies"

afterEach(() => {
  suti.ertek = undefined
})

/*
  A KOZOS CIMKE (kartya 2d22116c). MI PIROSIT: a lekeres csak a latogatonkenti
  cimket kapja (a kozponti urites nem eri el), vagy suti nelkul semmit (a
  bejegyzest semmi nem uriti); a latogatonkenti cimke elveszik (a kosar es a
  fiok arra epit).
*/
describe("a lekérés címkéi", () => {
  it("sütivel a látogatónkénti ÉS a közös", async () => {
    suti.ertek = "abc"
    expect(await getCacheOptions("products")).toEqual({
      tags: ["products-abc", "products"],
    })
  })

  it("süti nélkül is a közös", async () => {
    expect(await getCacheOptions("products")).toEqual({ tags: ["products"] })
  })
})
