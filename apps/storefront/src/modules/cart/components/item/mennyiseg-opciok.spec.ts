import { describe, expect, it } from "vitest"

import { kosarMennyisegOpciok } from "./mennyiseg-opciok"

describe("a kosársor mennyiség-választéka", () => {
  /** ISMERT POZITIV KONTROLL: a mai, minimum nelkuli eset valtozatlan. */
  it("egyes minimumnál a mai lista áll: 1-től 10-ig", () => {
    expect(kosarMennyisegOpciok({ minimum: 1, jelenlegi: 1 })).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
  })

  it("tízes minimumnál 10-től indul, nem 1-től", () => {
    const opciok = kosarMennyisegOpciok({ minimum: 10, jelenlegi: 10 })

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
    expect(kosarMennyisegOpciok({ minimum: 100, jelenlegi: 1 })).toContain(100)
  })

  /**
   * ES A JELENLEGI ERTEK MINDIG BENNE VAN, meg ha a minimum ala esik is --
   * kulonben a legordulo mast mutatna, mint ami a kosarban all.
   */
  it("a minimum alatti jelenlegi érték is szerepel", () => {
    const opciok = kosarMennyisegOpciok({ minimum: 10, jelenlegi: 3 })

    expect(opciok).toContain(3)
    expect(opciok).toContain(10)
    expect(opciok[0]).toBe(3)
  })

  it("hibás minimumnál nem esik szét", () => {
    expect(kosarMennyisegOpciok({ minimum: 0, jelenlegi: 1 })[0]).toBe(1)
    expect(kosarMennyisegOpciok({ minimum: Number.NaN, jelenlegi: 1 })[0]).toBe(
      1,
    )
  })

  it("a lista növekvő és ismétlés nélküli", () => {
    const opciok = kosarMennyisegOpciok({ minimum: 5, jelenlegi: 7 })

    expect([...opciok].sort((a, b) => a - b)).toEqual(opciok)
    expect(new Set(opciok).size).toBe(opciok.length)
  })
})

/**
 * A HARMADIK ARGUMENTUM JELENTESE -- ES MIERT NEM VOLT ELOTTE ALLITAS RA.
 *
 * A fenti hat allitas kozul EGY SEM ad at harmadik argumentumot. Ezert tudott
 * a jelentese csendben megvaltozni (darabszamrol felso hatarra es vissza)
 * anelkul, hogy barmi pirosra valtott volna.
 *
 * A HAROM ERTEK ITT SZANDEKOSAN OLYAN, AHOL A KET OLVASAT ELTER. Minimum 1
 * mellett a darabszam es a felso hatar EGYBEESIK -- egy (1, 1, 3) alaku
 * allitas mind a ket megvalositason zold lenne, tehat semmit nem merne.
 */
describe("a harmadik argumentum: készlet mint felső határ", () => {
  it("a készlet FELSŐ HATÁR, nem darabszám", () => {
    // darabszamkent 10-tol 21-ig kinalna, a keszlet FOLE
    expect(
      kosarMennyisegOpciok({ minimum: 10, jelenlegi: 10, keszlet: 12 }),
    ).toEqual([10, 11, 12])
  })

  it("készlet a minimum ALATT: csak a jelenlegi érték marad", () => {
    // nincs rendelheto mennyiseg; a legordulo viszont nem mutathat mast,
    // mint ami a kosarban all
    expect(
      kosarMennyisegOpciok({ minimum: 10, jelenlegi: 10, keszlet: 5 }),
    ).toEqual([10])
  })

  it("a tíz opció korlátja a készlettől függetlenül áll", () => {
    expect(
      kosarMennyisegOpciok({ minimum: 1, jelenlegi: 1, keszlet: 100 }),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  /** ISMERT POZITIV KONTROLL: keszlet nelkul a mai viselkedes beture ugyanaz. */
  it("készlet nélkül a mai viselkedés változatlan", () => {
    expect(kosarMennyisegOpciok({ minimum: 1, jelenlegi: 1 })).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(kosarMennyisegOpciok({ minimum: 100, jelenlegi: 1 })).toContain(109)
  })
})

/**
 * A LEPESKOZ ES A RENDELESI MAXIMUM -- ES AMIERT A VALODI ADAT ITT NEM ELEG.
 *
 * A teszt boltban tizenket termeknek van egynel nagyobb lepeskoze, es MIND A
 * TIZENKETTONEL a lepeskoz EGYENLO a minimummal (min 10 / lepes 10, illetve
 * min 100 / lepes 100). Ezert egy valodi fixtura NEM tudja eldonteni azt a
 * kerdest, ami a rácsot meghatarozza: a megengedett ertekek a minimumtol
 * indulnak, vagy a lepes tobbszorosei? Ha a ketto egyenlo, mindket olvasat
 * ugyanazt adja -- vagyis a valodi adat mindket megvalositason zold lenne.
 *
 * Ezert all itt SZANDEKOS utkozes-fixtura (min 3, lepes 5), ami a mai
 * katalogusban nem fordul elo. Nem kitalalt adat: ez az az eset, ami a ket
 * olvasatot szetvalasztja.
 */
describe("a lépésköz és a rendelési maximum", () => {
  it("a lista a lépésköz szerint ugrik, nem egyesével", () => {
    expect(
      kosarMennyisegOpciok({ minimum: 10, jelenlegi: 10, lepes: 10 }),
    ).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
  })

  /**
   * A RACS A MINIMUMTOL INDUL, NEM A LEPES TOBBSZOROSEITOL. A tobbszoros
   * olvasat itt 5-tol indulna, tehat epp a minimumot zarna ki -- ket szabaly,
   * ami ellentmond egymasnak.
   */
  it("ütköző minimum és lépésköz mellett a minimum a kiindulópont", () => {
    expect(
      kosarMennyisegOpciok({ minimum: 3, jelenlegi: 3, lepes: 5 }),
    ).toEqual([3, 8, 13, 18, 23, 28, 33, 38, 43, 48])
  })

  /**
   * A MAXIMUM 500, NEM 1000 -- ES EZT A KALIBRACIO DERITETTE KI.
   *
   * Az elso valtozat a VALODI adatot hasznalta (min 100, lepes 100, max 1000),
   * es a maximumot figyelmen kivul hagyo rontasnal ZOLD MARADT. Az ok egy
   * egybeeses: tiz opcio szazas lepessel PONTOSAN 1000-ig er, tehat a
   * tiz-opcios korlat ugyanazt a listat adja, mint a maximum.
   *
   * Vagyis a harom valos termek adata ezen az agon NEM TUD ELBUKNI. Ez
   * ugyanaz az alak, mint a lepeskoznel: a valodi ertekek egybeesnek, es epp
   * ezert nem mernek semmit.
   *
   * 500-zal a maximum ELOBB zar, mint a tiz-opcios korlat, tehat a ket
   * olvasat szetvalik.
   */
  it("a rendelési maximum lezárja a listát", () => {
    expect(
      kosarMennyisegOpciok({
        minimum: 100,
        jelenlegi: 100,
        lepes: 100,
        rendelesiMaximum: 500,
      }),
    ).toEqual([100, 200, 300, 400, 500])
  })

  /**
   * ES A VALODI ADAT KULON ALL, KONTROLLKENT: a harom termek listaja tenyleg
   * 100-tol 1000-ig er. Ez NEM a maximumot meri (lasd fent), hanem azt, hogy
   * a valos eset a vart listat adja.
   */
  it("a valódi hármas (min 100, lépés 100, max 1000) listája", () => {
    expect(
      kosarMennyisegOpciok({
        minimum: 100,
        jelenlegi: 100,
        lepes: 100,
        rendelesiMaximum: 1000,
      }),
    ).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000])
  })

  /**
   * A KET FELSO HATAR KOZUL A SZUKEBB NYER, es a ket ok kulonbozo: a keszlet
   * azt mondja meg, mennyi VAN, a rendelesi maximum azt, mennyit ENGEDUNK.
   */
  it("a készlet és a rendelési maximum közül a szűkebb nyer", () => {
    expect(
      kosarMennyisegOpciok({
        minimum: 10,
        jelenlegi: 10,
        lepes: 10,
        keszlet: 35,
        rendelesiMaximum: 100,
      }),
    ).toEqual([10, 20, 30])

    expect(
      kosarMennyisegOpciok({
        minimum: 10,
        jelenlegi: 10,
        lepes: 10,
        keszlet: 100,
        rendelesiMaximum: 25,
      }),
    ).toEqual([10, 20])
  })

  /** ISMERT POZITIV KONTROLL: lepeskoz nelkul a mai viselkedes beture ugyanaz. */
  it("lépésköz nélkül a mai lista változatlan", () => {
    expect(kosarMennyisegOpciok({ minimum: 10, jelenlegi: 10 })).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ])
  })

  it("hibás lépésköznél egyesével lép, nem áll le", () => {
    expect(
      kosarMennyisegOpciok({ minimum: 1, jelenlegi: 1, lepes: 0 }),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(
      kosarMennyisegOpciok({ minimum: 1, jelenlegi: 1, lepes: 2.5 }),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})
