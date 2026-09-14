import { describe, expect, it } from "vitest"

import { keresesSzuro } from "./kereses-szuro"

/**
 * A NULLA TALALAT AGA, VISELKEDESSEL MERVE.
 *
 * Ez a suite azert keletkezett, mert a forras-szovegre mert valtozata NEM
 * discriminalt: a feltetelt `=== 0`-rol `=== -1`-re rontva minden szelet zold
 * maradt (a valtozo es a korai visszateres a helyen volt). A kalibracio fogta
 * meg, nem a szemem.
 *
 * === KALIBRACIO (2026-09-14; minden korben 20 teszt futott le) ===
 *
 *   a VEGSO dontes romlik el (`ids.length`)      2 piros, nev szerint
 *   a metszet helyett felulirja a szurot         3 piros, nev szerint
 *   a KORAI visszateres romlik el                0 piros
 *
 * A HARMADIK NEM HIBA, HANEM LELET: az ures lista a metszeten at is ures marad,
 * tehat a zaro dontes ugyanugy elkapja. A korai visszateres olvashatosagot ad,
 * nem vedelmet -- es ezt a fuggveny melle oda is irtam, hogy ne latszodjon
 * teherviselonek.
 */
describe("a keresés találataiból az azonosító-szűrő", () => {
  it("üres találati listánál NEM indul lekérdezés", () => {
    expect(keresesSzuro([])).toEqual({ nullaTalalat: true })
  })

  /**
   * ISMERT POZITIV KONTROLL: talalatokkal VISZONT indul, es pontosan azokkal.
   * Enelkul a fenti tagadast egy olyan valtozat is kielegitene, ami MINDIG
   * nulla talalatot mond.
   */
  it("találatokkal a lista változatlanul megy tovább", () => {
    expect(keresesSzuro(["prod_1", "prod_2"])).toEqual({
      nullaTalalat: false,
      ids: ["prod_1", "prod_2"],
    })
  })

  it("meglévő szűrővel a KETTŐ METSZETE megy tovább", () => {
    expect(keresesSzuro(["prod_1", "prod_2", "prod_3"], ["prod_2"])).toEqual({
      nullaTalalat: false,
      ids: ["prod_2"],
    })
  })

  /**
   * ES A VESZELYESEBB AG: ha a metszet URES, az ugyanaz, mint a nulla talalat.
   * Felulirva a meglevo szuro csendben eltunne, es a vevo olyan termekeket
   * latna, amiket a hivo kizart.
   */
  it("üres metszet ugyanúgy nulla találat", () => {
    expect(keresesSzuro(["prod_1"], ["prod_9"])).toEqual({ nullaTalalat: true })
  })

  it("üres meglévő szűrő is üres metszet, nem „nincs szűrő”", () => {
    expect(keresesSzuro(["prod_1"], [])).toEqual({ nullaTalalat: true })
  })
})
