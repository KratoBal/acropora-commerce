import { describe, expect, it, vi } from "vitest"

import { hirlevelFeliratkozas, sebessegKorlat } from "./hirlevel-feliratkozas"

/**
 * A FELIRATKOZAS HIBAUZENETE AZ URLAP NYELVEN. MI PIROSIT: ha az angol urlap magyar hibauzenetet kap; ha a nyelv nelkuli (regi) hivas
 * mas uzenetet ad, mint eddig; ha egy ismeretlen nyelv-mezo kiesik a magyarra (nem hibara).
 */
const fuggosegek = () => ({
  kuld: vi.fn(async () => ({})),
  korlat: sebessegKorlat({ max: 5, ablakMs: 1000 }),
})
const URLAP = { nev: "", email: "", hozzajarul: false, ip: "1.2.3.4" }

describe("a hírlevél hibaüzenete", () => {
  it("angol űrlapra angol, a hiányzó nyelvre magyar", async () => {
    const angol = await hirlevelFeliratkozas(
      { ...URLAP, nyelv: "en" },
      fuggosegek(),
    )
    const regi = await hirlevelFeliratkozas(URLAP, fuggosegek())
    expect(angol).toMatchObject({
      allapot: "hiba",
      uzenet: "Please enter your name and your email address.",
    })
    expect(regi).toMatchObject({
      allapot: "hiba",
      uzenet: "Add meg a neved és az e-mail-címed.",
    })
  })
})
