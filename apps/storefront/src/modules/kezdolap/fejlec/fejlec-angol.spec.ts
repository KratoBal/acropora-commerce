import { describe, expect, it } from "vitest"

import { kezdolapAdat } from "@modules/kezdolap/tartalom"
import { KEZDOLAP_SZOVEGEK } from "@modules/kezdolap/szovegek"
import { translator } from "@lib/i18n/dictionary"
import { fejlecMenuPontok } from "@lib/util/fejlec-menu-pontok"

/**
 * A FEJLEC SZOVEGEI ANGOLUL. MI PIROSIT: ha az angol fejlec info-savja, kereso-szovege, menupont-feliratai vagy kartyai magyarul
 * maradnak; ha egy KEZZEL atirt (az OS-ben mentett, a kezdoertektol elterő) szoveg is fordul; ha a magyar fejlec barmi mast ad, mint a
 * katalogus kezdoerteke; ha a fejlec torzse (a kezdolap szovegei) kimarad az angolbol.
 */
const MAGYAR_BETU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/
const FEJLEC_SZOVEGEK = KEZDOLAP_SZOVEGEK.filter(
  (sor) =>
    sor.kulcs.startsWith("fejlec.") &&
    sor.tipus === "szoveg" &&
    !sor.kulcs.endsWith(".kategoriak") &&
    sor.alap !== "",
)

describe("a fejléc szövegei", () => {
  it("angolul egyik kezdőérték sem marad magyar", () => {
    const s = kezdolapAdat(null, "en")
    const magyar = FEJLEC_SZOVEGEK.filter((sor) =>
      MAGYAR_BETU.test(s.szoveg(sor.kulcs)),
    ).map((sor) => sor.kulcs)
    expect(magyar).toEqual([])
    expect(s.szoveg("fejlec.sav.3")).toBe("Open today 10:00–19:00")
    expect(s.szoveg("fejlec.kereso")).toMatch(/^Search:/)
  })

  it("magyarul a katalógus kezdőértéke, változatlanul", () => {
    const s = kezdolapAdat(null, "hu")
    for (const sor of FEJLEC_SZOVEGEK)
      expect(s.szoveg(sor.kulcs)).toBe(sor.alap)
    const alap = kezdolapAdat(null)
    for (const sor of FEJLEC_SZOVEGEK)
      expect(alap.szoveg(sor.kulcs)).toBe(sor.alap)
  })

  it("az OS-ben mentett kezdőértéket fordítja, a kézzel átírtat és a kategória-azonosítókat nem", () => {
    const s = kezdolapAdat(
      {
        texts: {
          "fejlec.sav.1":
            "Élőállat kizárólag személyes átvétellel, a budapesti boltban",
          "fejlec.sav.2": "Ingyenes szállítás 50 000 Ft felett",
          "fejlec.1.kategoriak": "halak,korallok",
        },
        slides: null,
      },
      "en",
    )
    expect(s.szoveg("fejlec.sav.1")).toBe(
      "Livestock for in-store pickup only, at our Budapest shop",
    )
    expect(s.szoveg("fejlec.sav.2")).toBe("Ingyenes szállítás 50 000 Ft felett")
    expect(s.szoveg("fejlec.1.kategoriak")).toBe("halak,korallok")
  })
})

describe("a mobil menü pontjai", () => {
  it("angolul a nem kategória pontok fordulnak, a kategória-nevek a bolt adatai maradnak", () => {
    const hu = fejlecMenuPontok([]).map((p) => p.felirat)
    const en = fejlecMenuPontok([], translator("en")).map((p) => p.felirat)
    expect(en.slice(0, 5)).toEqual(hu.slice(0, 5))
    expect(en.slice(5)).toEqual(["Knowledge base", "Services", "My aquariums"])
    expect(hu.slice(5)).toEqual(["Tudástár", "Szolgáltatások", "Akváriumaim"])
  })
})
