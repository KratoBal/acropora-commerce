import { describe, expect, it } from "vitest"

import {
  FEJLEC_MENU_TERV,
  HAMAROSAN_TEMAK,
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
