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
  /**
   * A KÉT VILÁG. A váltó nem ízlés és nem látogatói beállítás: a TERMÉK fajtája
   * dönti el (élő állat sötét, műszaki világos).
   *
   * Az alapértelmezés a VILÁGOS, és ez sem véletlen: a katalógus 1884+ terméke
   * műszaki, az élő állat a kisebbik halmaz. Ha a hívó elfelejti megadni, a
   * gyakoribb esetet kapja.
   */
  /**
   * AZ OSZLOP-BESOROLÁS A TERVBŐL JÖN, mérve: bal 856 px, köz 44, jobb 452, és
   * a három szám összege pontosan a tartalom-oszlop 1352 pixele.
   *
   * Ez az állítás azt védi, hogy a besorolás ne csússzon el észrevétlenül: egy
   * doboz, ami rossz oszlopba kerül, a lapon látszik, de semmi nem szól róla.
   */
  it("a dobozok a tervbeli oszlopukban állnak", () => {
    render(<LapVaz />)

    const oszlopa = (kulcs: string) =>
      document
        .querySelector(`[data-vaz-szakasz="${kulcs}"]`)
        ?.parentElement?.getAttribute("data-vaz-oszlop")

    // teljes szélesség
    for (const k of ["cimsor", "kiegeszitok", "hasonlo", "ragados-sav"]) {
      expect(oszlopa(k)).toBe("teljes")
    }
    // bal: a termék megismerése
    for (const k of ["foto", "meretezes-seged", "fulek", "muszaki-adatok"]) {
      expect(oszlopa(k)).toBe("bal")
    }
    // jobb: a vásárlás
    for (const k of ["ar", "elerhetoseg", "valaszto", "mennyiseg", "csomagajanlat", "kerdezd"]) {
      expect(oszlopa(k)).toBe("jobb")
    }
  })

  /**
   * ÉS MINDEN DOBOZNAK VAN OSZLOPA. E nélkül egy új szakasz besorolás nélkül
   * kerülhetne be, és csendben a rácsban kötne ki valahol.
   */
  /**
   * ÉS A RÁCS MAGA IS KI VAN TÉVE.
   *
   * Ezt a kalibráció hívta elő: kivettem a `lg:grid` osztályokat -- vagyis
   * asztali nézetben a két oszlop MEGSZŰNT --, és a készlet zöld maradt. Az
   * állításaim az ADATOT nézték (`data-vaz-oszlop`), nem azt, hogy a rács
   * egyáltalán ki van-e téve.
   *
   * ÉS AMIT EZ AZ ÁLLÍTÁS NEM BIZONYÍT, KIMONDVA: a jsdom nem számol
   * elrendezést, tehát azt NEM tudja megmondani, hogy a doboz tényleg a bal
   * oldalon áll-e 856 pixel szélesen. Csak azt, hogy az osztályok ott vannak.
   * A tényleges elrendezést böngészőben kell megnézni -- a mérőeszköz és a terv
   * geometriája az `agents/nautilus/measurement/terv-geometria/` alatt áll.
   */
  it("az asztali két oszlopos rács ki van téve", () => {
    render(<LapVaz />)

    const vaz = screen.getByTestId("muszaki-lap-vaz")
    const osztalyok = vaz.className

    expect(osztalyok).toContain("lg:grid")
    expect(osztalyok).toContain("856fr_452fr")
    expect(osztalyok).toContain("lg:gap-x-[44px]")
  })

  it("egyetlen szakasz sem marad besorolás nélkül", () => {
    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      expect(["teljes", "bal", "jobb"]).toContain(szakasz.oszlop)
    }
  })

  it("alapértelmezésben világos", () => {
    render(<LapVaz />)

    const vaz = screen.getByTestId("muszaki-lap-vaz")
    expect(vaz.getAttribute("data-vilag")).toBe("vilagos")
  })

  it("sötét világot kérve a váz azt jelöli", () => {
    render(<LapVaz vilag="sotet" />)

    const vaz = screen.getByTestId("muszaki-lap-vaz")
    expect(vaz.getAttribute("data-vilag")).toBe("sotet")
  })

  /**
   * EGY VÁZ, KÉT ÉRTÉK-KÉSZLET. Ez az állítás azt védi, ami az egészet
   * összetartja: a két világ nem két külön lap. Ha valaha valaki a sötét ághoz
   * más dobozokat vagy más sorrendet ad, ez pirosra vált.
   */
  it("a szerkezet mindkét világban ugyanaz", () => {
    const kulcsok = (v: "vilagos" | "sotet") => {
      cleanup()
      render(<LapVaz vilag={v} />)
      return Array.from(document.querySelectorAll("[data-vaz-szakasz]")).map((e) =>
        e.getAttribute("data-vaz-szakasz")
      )
    }

    expect(kulcsok("sotet")).toEqual(kulcsok("vilagos"))
  })

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
