import { describe, expect, it } from "vitest"

import { kosarMennyisegOpciok } from "./mennyiseg-opciok"

describe("a kosársor mennyiség-választéka", () => {
  /** ISMERT POZITIV KONTROLL: a mai, minimum nelkuli eset valtozatlan. */
  it("egyes minimumnál a mai lista áll: 1-től 10-ig", () => {
    expect(kosarMennyisegOpciok(1, 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it("tízes minimumnál 10-től indul, nem 1-től", () => {
    const opciok = kosarMennyisegOpciok(10, 10)

    expect(opciok[0]).toBe(10)
    expect(opciok).not.toContain(1)
    expect(opciok).toHaveLength(10)
  })

  /**
   * A SULYOSABB ESET: szazas minimumnal a regi lista tizig ert, tehat a helyes
   * erteket EL SEM LEHETETT ERNI.
   */
  it("százas minimumnál a helyes érték elérhető", () => {
    /**
     * A JELENLEGI ERTEK SZANDEKOSAN 1, NEM 100.
     *
     * Az elso valtozat `(100, 100)` alakban allt, es a KALIBRACIO buktatta le:
     * amikor a minimumot figyelmen kivul hagyo rontast futtattam, ez az
     * allitas ZOLD MARADT. Nem a minimumot merte, hanem azt, hogy a JELENLEGI
     * erteket mindig hozzavesszuk -- vagyis akkor is atment volna, ha a
     * minimum egyaltalan nem szamit.
     *
     * Egy 1-es jelenlegi ertekkel a 100 CSAK a minimumbol kerulhet a listaba.
     */
    expect(kosarMennyisegOpciok(100, 1)).toContain(100)
  })

  /**
   * ES A JELENLEGI ERTEK MINDIG BENNE VAN, meg ha a minimum ala esik is --
   * kulonben a legordulo mast mutatna, mint ami a kosarban all.
   */
  it("a minimum alatti jelenlegi érték is szerepel", () => {
    const opciok = kosarMennyisegOpciok(10, 3)

    expect(opciok).toContain(3)
    expect(opciok).toContain(10)
    expect(opciok[0]).toBe(3)
  })

  it("hibás minimumnál nem esik szét", () => {
    expect(kosarMennyisegOpciok(0, 1)[0]).toBe(1)
    expect(kosarMennyisegOpciok(Number.NaN, 1)[0]).toBe(1)
  })

  it("a lista növekvő és ismétlés nélküli", () => {
    const opciok = kosarMennyisegOpciok(5, 7)

    expect([...opciok].sort((a, b) => a - b)).toEqual(opciok)
    expect(new Set(opciok).size).toBe(opciok.length)
  })
})
