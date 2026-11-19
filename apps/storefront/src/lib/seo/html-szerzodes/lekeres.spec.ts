import { describe, expect, it, vi } from "vitest"

import { lekeres, PROBALKOZASOK, VARAKOZAS_MS } from "./mintaoldalak"

/**
 * A TESZT WEBSHOP UJRAINDULASA NEM TESZTHIBA (acrobot 56659).
 *
 * MI PIROSIT: egy 502, 503 vagy 504 utan a lekeres nem probalja ujra; egy mas
 * statusz (404, 500) ujraprobalodik, holott azonnal bukni kellene; nincs felso
 * korlat; a hibauzenet nem mondja meg, hany probalkozas utan bukott.
 */
const valasz = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status })

const bolt = (statuszok: number[]) => {
  const hivasok: string[] = []
  const varakozasok: number[] = []
  const fetch = vi.fn(async (url: string) => {
    hivasok.push(url)
    const s = statuszok[Math.min(hivasok.length - 1, statuszok.length - 1)]!
    return valasz(s, { regions: [{ id: "reg_hu" }] })
  }) as unknown as typeof globalThis.fetch
  return {
    b: {
      backend: "https://commerce-stage.example",
      kulcs: "pk_teszt",
      orszag: "hu",
      fetch,
      varakozas: async (ms: number) => {
        varakozasok.push(ms)
      },
    },
    hivasok,
    varakozasok,
  }
}

describe("lekeres", () => {
  it("a 503 es az 504 utan ujraprobal, es a harmadikra visszaadja a valaszt", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const { b, hivasok, varakozasok } = bolt([503, 504, 200])
    await expect(lekeres(b, "/store/regions", {})).resolves.toEqual({
      regions: [{ id: "reg_hu" }],
    })
    expect(hivasok).toHaveLength(3)
    expect(varakozasok).toEqual([VARAKOZAS_MS, VARAKOZAS_MS])
  })

  it("egy 404 vagy egy 500 azonnal bukik, ujraprobalas nelkul", async () => {
    for (const status of [404, 500]) {
      const { b, hivasok, varakozasok } = bolt([status])
      await expect(lekeres(b, "/store/products", {})).rejects.toThrow(
        `Store API /store/products: ${status}`,
      )
      expect([status, hivasok.length, varakozasok.length]).toEqual([
        status,
        1,
        0,
      ])
    }
  })

  it("a felso korlat utan bukik, es megmondja, hany probalkozas utan", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const { b, hivasok } = bolt([502])
    await expect(lekeres(b, "/store/regions", {})).rejects.toThrow(
      `Store API /store/regions: 502 (${PROBALKOZASOK}. probalkozas utan)`,
    )
    expect(hivasok).toHaveLength(PROBALKOZASOK)
  })
})
