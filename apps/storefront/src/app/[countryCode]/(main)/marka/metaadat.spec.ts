import { describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/brands", () => ({ markaLista: async () => [] }))
vi.mock("@modules/marka/marka-lista-lap", () => ({
  MarkaListaLap: () => null,
}))

import { generateMetadata } from "./page"

const props = (countryCode: string) => ({
  params: Promise.resolve({ countryCode }),
})

/**
 * A MARKALISTA (`/marka`) CIME ES LEIRASA A LAP NYELVEN. MI PIROSIT: ha az
 * angol uton magyar cim vagy leiras marad; ha a magyar ut szovege elmozdul; ha
 * a canonical vagy az OpenGraph nyelve nem koveti az utat.
 */
describe("a márkalista metaadata", () => {
  it("magyarul: a régi cím és leírás, hu_HU", async () => {
    const m = await generateMetadata(props("hu"))
    expect(m.title).toBe("Forgalmazott márkák | Acropora")
    expect(m.description).toBe(
      "Az Acropora által forgalmazott márkák: tengeri akvarisztikai termékek gyártói egy helyen.",
    )
    expect(m.openGraph).toMatchObject({ locale: "hu_HU" })
  })

  it("angolul: angol cím és leírás, en_US, az angol canonical", async () => {
    const m = await generateMetadata(props("en-hu"))
    expect(m.title).toBe("Brands we sell | Acropora")
    expect(m.description).toBe(
      "The brands Acropora sells: the makers of marine aquarium products in one place.",
    )
    expect(m.openGraph).toMatchObject({ locale: "en_US" })
    expect(String(m.alternates?.canonical)).toContain("/en-hu/marka")
  })
})
