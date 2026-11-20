import { describe, expect, it } from "vitest"

import ElerhetosegekOldal, { generateMetadata } from "./page"

/**
 * AZ ELERHETOSEGEK LAP NYELVE (a kirakat angol nezete, 2026-11-19): a lap cime es leirasa a magyar maradt az angol oldalon. MI PIROSIT: ha a cim vagy a
 * leiras az angol oldalon magyar; ha a lap a szegmens nyelvét nem adja tovabb a komponensnek (a cimkek magyarul maradnak); ha a magyar oldal valtozik.
 */
const params = (countryCode: string) => ({
  params: Promise.resolve({ countryCode }),
})

describe("az Elérhetőségek lap metaadata és nyelve", () => {
  it("angol oldalon a cím és a leírás angol", async () => {
    const meta = await generateMetadata(params("en-hu"))
    expect(String(meta.title)).toContain("Contact")
    expect(String(meta.title)).not.toMatch(/Elérhetőségek/)
    expect(String(meta.description)).toMatch(/^Contact details of Acropora/)
  })

  it("magyar oldalon a régi cím és leírás", async () => {
    const meta = await generateMetadata(params("hu"))
    expect(String(meta.title)).toContain("Elérhetőségek")
    expect(String(meta.description)).toMatch(/^Az Acropora Kft\. elérhetőségei/)
  })

  it("a lap a szegmens nyelvét adja a komponensnek", async () => {
    const en = await ElerhetosegekOldal(params("en-hu"))
    const hu = await ElerhetosegekOldal(params("hu"))
    expect((en.props as { locale: string }).locale).toBe("en")
    expect((hu.props as { locale: string }).locale).toBe("hu")
  })
})
