import { describe, expect, it } from "vitest"

import { LABLEC_MINTA_SZOVEGEK } from "@modules/lablec-oldalak/minta-allapot"

import { GET } from "./route"

/**
 * A LABLEC-SZOVEGEK KAPUJA (commerce-audit-p1). MI PIROSIT: ha a kapu nullat
 * adna, mikozben egy oldal meg viseli a mintajelzot (az elesitesi lista
 * zoldre futna); ha a kapu szama mas forrasbol jonne, mint a lapon latszo
 * cimke; ha a valasz szoveget (nem csak kulcsot) adna.
 */
describe("GET /api/health/lablec-szovegek", () => {
  it("a Fizetés még nincs egyeztetve (a Szállítás igen): sample_texts_remain, a kulcsokkal", async () => {
    const torzs = await (await GET()).json()
    expect(torzs).toEqual({
      status: "sample_texts_remain",
      count: 1,
      keys: ["fizetes"],
    })
  })

  it("a szám a lapon látszó címkék forrásából jön", async () => {
    const torzs = await (await GET()).json()
    expect(torzs.count).toBe(LABLEC_MINTA_SZOVEGEK.length)
  })

  it("csak kulcsot ad, a címke szövegét nem", async () => {
    const szoveg = JSON.stringify(await (await GET()).json())
    for (const m of LABLEC_MINTA_SZOVEGEK) expect(szoveg).not.toContain(m.mit)
  })
})
