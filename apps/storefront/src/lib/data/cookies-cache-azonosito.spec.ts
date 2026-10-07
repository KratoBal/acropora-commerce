// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

const tar = vi.hoisted(() => ({ ertekek: new Map<string, string>() }))
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nev: string) =>
      tar.ertekek.has(nev) ? { value: tar.ertekek.get(nev) } : undefined,
    set: (nev: string, ertek: string) => tar.ertekek.set(nev, ertek),
  }),
}))

import { setAuthToken, setCartId } from "./cookies"

afterEach(() => tar.ertekek.clear())

/*
  AZ UJ KOSAR ES AZ UJ BELEPES MAGA KAPJA A CACHE-SUTIT (FE-7 3. resz). A
  middleware mar nem adja minden latogatonak; ha itt sem kapna, a kosar
  elso modositasanal a `getCacheTag` ureset adna, es a kosar regi
  gyorsitotar-bejegyzese nem urulne. MI PIROSIT: a setter nem adja; vagy a
  meglevot felulirja (a regi cimkek arvan maradnanak).
*/
describe("a cache-süti az állapot létrejöttekor", () => {
  it.each([
    ["setCartId", () => setCartId("cart_kitalalt")],
    ["setAuthToken", () => setAuthToken("token_kitalalt")],
  ])("%s megadja, ha hiányzik", async (_nev, hivas) => {
    await hivas()

    expect(tar.ertekek.get("_medusa_cache_id")).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("a meglévőt nem írja felül", async () => {
    tar.ertekek.set("_medusa_cache_id", "meglevo")

    await setCartId("cart_kitalalt")

    expect(tar.ertekek.get("_medusa_cache_id")).toBe("meglevo")
  })
})
