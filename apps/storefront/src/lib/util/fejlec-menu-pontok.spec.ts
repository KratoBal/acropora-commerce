import { translator } from "@lib/i18n/dictionary"
import { describe, expect, it } from "vitest"

import {
  FEJLEC_MENU_TERV,
  HAMAROSAN_TEMAK,
  hamarosanCim,
  fejlecMenuPontok,
} from "./fejlec-menu-pontok"

type K = { handle: string; category_children?: K[] }
const k = (handle: string, category_children: K[] = []): K => ({
  handle,
  category_children,
})

/** A stage gyokerei, 2026-09-29-en merve, a valodi (ekezetes) handle-okkal. */
const STAGE = [
  k("termékek", [
    k("vízkezelés---termékek"),
    k("világítástechnika-(lámpák)---termékek"),
  ]),
  k("gerinctelenek"),
  k("halak"),
  k("korallok"),
  k("shop-'n-the-shop"),
  k("édesvízi-akvarisztika"),
]

const alak = (pontok: ReturnType<typeof fejlecMenuPontok<K>>) =>
  pontok.map((pont) =>
    pont.tipus === "gyoker"
      ? `${pont.felirat}>gyoker:${pont.kategoria.handle}`
      : pont.tipus === "oldal"
        ? `${pont.felirat}>oldal:${pont.handle}`
        : `${pont.felirat}>hamarosan:${pont.tema}`,
  )

describe("fejlecMenuPontok", () => {
  it("a 215:41 nyolc pontja, a keret sorrendjében, a stage katalógusára", () => {
    expect(alak(fejlecMenuPontok(STAGE))).toEqual([
      "Korallok>gyoker:korallok",
      "Halak>gyoker:halak",
      "Gerinctelenek>gyoker:gerinctelenek",
      "Technika>hamarosan:technika",
      "Vízkezelés>oldal:vízkezelés---termékek",
      "Tudástár>hamarosan:tudastar",
      "Szolgáltatások>hamarosan:szolgaltatasok",
      "Akváriumaim>hamarosan:akvariumaim",
    ])
  })

  it("a kereten kívüli gyökér nem kerül a menübe", () => {
    const handlek = fejlecMenuPontok(STAGE).flatMap((pont) =>
      pont.tipus === "gyoker" ? [pont.kategoria.handle] : [],
    )
    expect(handlek).not.toContain("termékek")
    expect(handlek).not.toContain("shop-'n-the-shop")
    expect(handlek).not.toContain("édesvízi-akvarisztika")
  })

  it("a gyökér ékezettől és kis-nagybetűtől függetlenül találódik", () => {
    const pontok = fejlecMenuPontok([k("KORALLOK"), k("Halák")])
    expect(alak(pontok).slice(0, 2)).toEqual([
      "Korallok>gyoker:KORALLOK",
      "Halak>gyoker:Halák",
    ])
  })

  it("hiányzó gyökér a Hamarosan lapra visz, nem tűnik el", () => {
    const pontok = fejlecMenuPontok([k("halak")])
    expect(pontok).toHaveLength(FEJLEC_MENU_TERV.length)
    expect(alak(pontok)[0]).toBe("Korallok>hamarosan:korallok")
    expect(alak(pontok)[4]).toBe("Vízkezelés>hamarosan:vizkezeles")
  })

  it("ha a Technika vagy a Vízkezelés gyökér lesz, a gyökérre mutat", () => {
    const pontok = alak(fejlecMenuPontok([k("technika"), k("vízkezelés")]))
    expect(pontok[3]).toBe("Technika>gyoker:technika")
    expect(pontok[4]).toBe("Vízkezelés>gyoker:vízkezelés")
  })

  it("minden Hamarosan-pontnak van témája a Hamarosan lapon", () => {
    for (const pont of fejlecMenuPontok([])) {
      expect(pont.tipus).toBe("hamarosan")
      if (pont.tipus === "hamarosan") {
        expect(HAMAROSAN_TEMAK.get(pont.tema)).toBe(pont.felirat)
      }
    }
    expect(HAMAROSAN_TEMAK.get("szakerto")).toBe("Kérdezz a szakértőnktől")
  })
})

/**
 * A HAMAROSAN LAP CIME A LAP NYELVEN. MI PIROSIT: ha a szotar-kulcsos menupont
 * (Tudastar, Szolgaltatasok, Akvariumaim) nem fordul; ha a kategoria-nev (adat)
 * lefordulna; ha a szakerto-gomb cime nem a lap nyelven all; ha egy ismeretlen
 * tema kap cimet (akkor nem lenne 404).
 */
describe("a Hamarosan lap címe a lap nyelvén", () => {
  const hu = translator("hu")
  const en = translator("en")

  it("a kulcsos menüpontok és a szakértő-gomb lefordulnak", () => {
    expect(hamarosanCim("tudastar", hu)).toBe("Tudástár")
    expect(hamarosanCim("tudastar", en)).toBe("Knowledge base")
    expect(hamarosanCim("szolgaltatasok", en)).toBe("Services")
    expect(hamarosanCim("akvariumaim", en)).toBe("My aquariums")
    expect(hamarosanCim("szakerto", hu)).toBe("Kérdezz a szakértőnktől")
    expect(hamarosanCim("szakerto", en)).toBe("Ask our expert")
  })

  it("a kategória-név adat: az angol úton sem fordul", () => {
    expect(hamarosanCim("korallok", en)).toBe("Korallok")
    expect(hamarosanCim("vizkezeles", en)).toBe("Vízkezelés")
  })

  it("minden témának van címe mindkét nyelven, az ismeretlennek nincs", () => {
    for (const tema of Array.from(HAMAROSAN_TEMAK.keys())) {
      expect(hamarosanCim(tema, hu)).toBeTruthy()
      expect(hamarosanCim(tema, en)).toBeTruthy()
    }
    expect(hamarosanCim("nincs-ilyen", en)).toBeUndefined()
  })
})
