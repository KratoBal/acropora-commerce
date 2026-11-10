import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getPublicCacheOptions: async (tag: string) => ({ tags: [tag] }),
}))

import { tartasiSzuroValasz } from "./tartasi-szuro"

afterEach(() => vi.clearAllMocks())

/*
  A TARTASI SZURO ADAT-RETEGE (V2.2 S5). MI PIROSIT: a kategoria, egy ertek vagy egy csoport nem jut el a bolt kereses
  cimebe (a szuro csendben mast kerdezne); a korallos 1-en kivul mas alakban megy; a valasz gyorsitotar nelkul vagy
  korlatlanul tarolodik; egy bolt-hiba vagy egy ismeretlen valasz-alak dobna (a kategoria-lap 500-zal allna) vagy
  adatkent jutna at.
*/
const JO = {
  product_ids: ["p1"],
  unchecked: 2,
  complete: true,
  facets: {
    difficulty: { KONNYU: 1, KOZEPES: 0, HALADO: 0, SZAKERTO: 0 },
    reef_safe: 1,
    tank: { "0-100": 1, "101-300": 0, "301-": 0 },
  },
}

describe("a tartási szűrő lekérése", () => {
  it("a cím a kategóriát és minden kiválasztott értéket viszi, a gyorsítótár korlátos", async () => {
    sdk.client.fetch.mockResolvedValue(JO)
    expect(
      await tartasiSzuroValasz("pcat_hal", {
        nehezseg: ["KONNYU", "HALADO"],
        korallos: true,
        medence: ["0-100", "301-"],
      }),
    ).toEqual(JO)
    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    const [utvonal, kereses] = String(ut).split("?")
    const p = new URLSearchParams(kereses)
    expect({
      utvonal,
      kategoria: p.get("category_id"),
      nehezseg: p.getAll("difficulty"),
      korallos: p.getAll("reef_safe"),
      medence: p.getAll("tank"),
      metodus: opciok.method,
      revalidate: opciok.next.revalidate,
      tags: opciok.next.tags,
    }).toEqual({
      utvonal: "/store/husbandry-filter",
      kategoria: "pcat_hal",
      nehezseg: ["KONNYU", "HALADO"],
      korallos: ["1"],
      medence: ["0-100", "301-"],
      metodus: "GET",
      revalidate: 60,
      tags: ["products"],
    })
  })

  it("szűrő nélkül csak a kategória megy (a darabszámokért)", async () => {
    sdk.client.fetch.mockResolvedValue(JO)
    await tartasiSzuroValasz("pcat_korall", {
      nehezseg: [],
      korallos: false,
      medence: [],
    })
    expect(sdk.client.fetch.mock.calls[0][0]).toBe(
      "/store/husbandry-filter?category_id=pcat_korall",
    )
  })

  it("bolt-hiba vagy ismeretlen válasz-alak: null, nem dob", async () => {
    const ures = { nehezseg: [], korallos: false, medence: [] }
    sdk.client.fetch.mockRejectedValueOnce(
      Object.assign(new Error("HTTP 500"), { status: 500 }),
    )
    expect(await tartasiSzuroValasz("c", ures)).toBeNull()
    sdk.client.fetch.mockResolvedValueOnce({ product_ids: "nem lista" })
    expect(await tartasiSzuroValasz("c", ures)).toBeNull()
  })
})
