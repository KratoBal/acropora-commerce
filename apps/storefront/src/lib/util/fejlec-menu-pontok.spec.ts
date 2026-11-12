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

  /*
    A KATEGORIA-BETOLTES UTAN (2026-11-12): a teszt Medusa webcimei ekezet nelkuliek, es a `{nev}---{szulo}`
    alak `{nev}` lett, ha a nev egyedi (`vízkezelés---termékek` -> `vizkezeles`). MI PIROSIT: ha a
    Vizkezeles pont az uj alaknal a Hamarosan lapra esik (a regi, `---` alak a fenti esetben marad).
  */
  it("a Vízkezelés pont az új, ékezet nélküli handle-lel is oldalra mutat, a hasonló kezdetű másikra nem", () => {
    const ujFa = [
      k("termekek", [k("vizkezeles"), k("vilagitastechnika-lampak")]),
      k("halak"),
    ]
    expect(alak(fejlecMenuPontok(ujFa))[4]).toBe("Vízkezelés>oldal:vizkezeles")
    // a `vizkezeles-es-szures` MAS kategoria: a `---` elotag vagy a pontos egyezes kell, a puszta kezdet nem
    const mas = [k("termekek", [k("vizkezeles-es-szures")]), k("halak")]
    expect(alak(fejlecMenuPontok(mas))[4]).toBe(
      "Vízkezelés>hamarosan:vizkezeles",
    )
  })

  /*
    A PONTOS, SORRENDES EGYEZES (barracuda a commerce #750-en): a `{nev}---{szulo}` alak epp akkor marad, ha a nev
    NEM egyedi, tehat egy masik agon allo `vizkezeles---halak` is elofordulhat. MI PIROSIT: ha a pont a fa tomb-
    sorrendje szerint egy MASIK szulo vizkezeles-alkategoriajara mutat, vagy ha a regi alak megelozi a maira.
  */
  it("egy másik szülő azonos nevű alkategóriája nem viszi el a pontot, és a mai alak megelőzi a régit, a fa sorrendjétől függetlenül", () => {
    const halak = k("vizkezeles---halak")
    // a masik szulo alkategoriaja ELOL all a tombben: a regi, ismert alak mellett is a termekek ala tartozot adja
    expect(
      alak(
        fejlecMenuPontok([
          k("halak", [halak]),
          k("termekek", [k("vizkezeles---termekek")]),
        ]),
      )[4],
    ).toBe("Vízkezelés>oldal:vizkezeles---termekek")
    // a mai alak es a regi egyutt: a mai nyer, akarmelyik all elol
    for (const gyerekek of [
      [k("vizkezeles---termekek"), k("vizkezeles")],
      [k("vizkezeles"), k("vizkezeles---termekek")],
    ])
      expect(alak(fejlecMenuPontok([k("termekek", gyerekek)]))[4]).toBe(
        "Vízkezelés>oldal:vizkezeles",
      )
    // csak a MASIK szulo alkategoriaja all: nincs ismert alak, a Hamarosan lap
    expect(alak(fejlecMenuPontok([k("halak", [halak])]))[4]).toBe(
      "Vízkezelés>hamarosan:vizkezeles",
    )
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
