import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LapVaz, { MUSZAKI_LAP_SZAKASZAI } from "./index"

afterEach(cleanup)

/**
 * A VÁZ ÁLLÍTÁSAI. Amit itt mérünk, az nem a kinézet, hanem hogy MI HOL ÁLL --
 * és hogy egy üres doboz meg is mondja magáról, hogy üres.
 */
describe("a műszaki lap váza", () => {
  /**
   * A SORREND A TERVBŐL JÖN, és ez az az állítás, ami elbukik, ha valaki
   * átrendezi a lapot anélkül, hogy a tervhez mérné.
   */
  it("a tizennégy doboz a tervbeli sorrendben áll", () => {
    render(<LapVaz />)

    const kulcsok = Array.from(
      document.querySelectorAll("[data-vaz-szakasz]")
    ).map((e) => e.getAttribute("data-vaz-szakasz"))

    expect(kulcsok).toEqual([
      "cimsor",
      "foto",
      "meretezes-seged",
      "fulek",
      "muszaki-adatok",
      "ar",
      "elerhetoseg",
      "valaszto",
      "mennyiseg",
      "csomagajanlat",
      "kerdezd",
      "kiegeszitok",
      "hasonlo",
      "ragados-sav",
    ])
  })

  /**
   * TARTALOM NÉLKÜL MINDEN DOBOZ ÜRESNEK VALLJA MAGÁT. Enélkül a váz úgy nézne
   * ki, mintha kész lenne -- és egy üres doboz, ami késznek látszik, rosszabb a
   * hiányzónál.
   */
  it("tartalom nélkül minden doboz üresnek jelöli magát", () => {
    render(<LapVaz />)

    const uresek = document.querySelectorAll('[data-vaz-ures="igen"]')
    expect(uresek).toHaveLength(MUSZAKI_LAP_SZAKASZAI.length)
  })

  /**
   * ÉS AZ ÜRES DOBOZ MEG IS MONDJA, MI JÖN IDE.
   *
   * Ezt az állítást a kalibráció hívta elő: kivettem a várakozó szöveg
   * megjelenítését, és a készlet ZÖLD MARADT. Az üres dobozok néma üres
   * dobozokká váltak volna, és a váz -- aminek épp az a dolga, hogy megmutassa,
   * hol lesznek a dolgok -- töröttnek látszott volna.
   *
   * A sorrend, az üresség jelölése és a "nincs kitalált adat" mind igaz maradt
   * eközben. Három állítás, és egyik sem vette észre, hogy a lényeg eltűnt.
   */
  it("az üres doboz kiírja, mi jön a helyére", () => {
    render(<LapVaz />)

    const varakozok = screen.getAllByTestId("vaz-varakozo")
    expect(varakozok).toHaveLength(MUSZAKI_LAP_SZAKASZAI.length)

    const szovegek = varakozok.map((e) => e.textContent)
    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      expect(szovegek).toContain(szakasz.varakozo)
    }
  })

  it("ahol van tartalom, ott azt mutatja, és nem a várakozó szöveget", () => {
    render(<LapVaz tartalom={{ ar: <span>289 900 Ft</span> }} />)

    const arDoboz = document.querySelector('[data-vaz-szakasz="ar"]')
    expect(arDoboz?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(screen.getByText("289 900 Ft")).toBeTruthy()

    // a többi doboz változatlanul üres marad
    expect(document.querySelectorAll('[data-vaz-ures="igen"]')).toHaveLength(
      MUSZAKI_LAP_SZAKASZAI.length - 1
    )
  })

  /**
   * A VÁRAKOZÓ SZÖVEG NEM ÁLLÍT SEMMIT A TERMÉKRŐL. A tervben minden szám
   * kitalált (289 900 Ft, PAR 380, 41 értékelés); ha ezek bekerülnének a vázba,
   * később valaki ténynek olvasná őket.
   *
   * Ez az állítás azt méri, hogy egyetlen szakasz várakozó szövege sem
   * tartalmaz számjegyet -- se árat, se mennyiséget, se mértékegységet.
   */
  it("egyetlen várakozó szöveg sem tartalmaz kitalált adatot", () => {
    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      expect(szakasz.varakozo).not.toMatch(/\d/)
    }
  })
})
