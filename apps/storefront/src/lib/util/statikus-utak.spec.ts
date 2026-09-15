import { describe, expect, it } from "vitest"

import { existsSync } from "node:fs"
import { join } from "node:path"

import { STATIKUS_GYOKER_UTAK, statikusGyokerUt } from "./statikus-utak"

/**
 * A SOFT-404 JAVITASA: MELYIK UT KERULI MEG AZ ORSZAGKOD-ATIRANYITAST.
 *
 * A keszlet NEM azt meri, hogy a lista elemei atmennek -- azt egy MINDENT atengedo
 * fuggveny is teljesitene, es pontosan az volt a regi hiba (`pathname.includes(".")`).
 * A donto allitasok a KIZART esetek: egy tetszoleges pontos cim MA NEM kerulheti meg,
 * mert epp attol kapott 200-at a not-found lap torzsevel.
 */
describe("gyoker szintu statikus utak", () => {
  it("a nevesitett utak megkerulik az atiranyitast", () => {
    expect(statikusGyokerUt("/robots.txt")).toBe(true)
  })

  /**
   * ES MINDEN BEJEGYZESHEZ KELL EGY FORRAS, AMI TENYLEGESEN KISZOLGALJA.
   *
   * A fajl fejlece eddig is kimondta ezt a szabalyt -- es a lista maga sertette
   * meg: a `/sitemap.xml` ugy allt rajta, hogy sitemap nem letezett. A
   * kovetkezmenyet az elo teszt-kirakaton mertuk (2026-09-15): 200-as valasz egy
   * RENDES LAPPAL (69 957 bajt, `<title>Acropora`) ott, ahol vagy sitemapnak
   * vagy 404-nek kellene allnia. Egy keresonek ez nem hianyzo sitemap, hanem egy
   * HTML sitemap.
   *
   * A FENTI KESZLET EZT NEM TUDTA MEGFOGNI, es ez a lenyeg: azok az allitasok a
   * LISTABOL veszik a bemenetuket, tehat a listat igazoljak. Ez az egy a lemezre
   * nez -- ugyanaz a lepes, mint amikor egy halo listaja a forrasbol jon, nem
   * kezbol.
   *
   * A KET ISMERT NEXT-KONVENCIO a `robots.ts` es a `sitemap.ts`; barmi mas
   * bejegyzeshez a `public/` mappaban kell allnia a fajlnak.
   */
  it("minden bejegyzes mogott all valami, ami kiszolgalja", () => {
    const gyoker = join(__dirname, "..", "..")
    const kiszolgalo: Record<string, string> = {
      "/robots.txt": join(gyoker, "app", "robots.ts"),
      "/sitemap.xml": join(gyoker, "app", "sitemap.ts"),
    }

    const fedetlen = STATIKUS_GYOKER_UTAK.filter((ut) => {
      const metadataUt = kiszolgalo[ut]
      if (metadataUt && existsSync(metadataUt)) return false
      return !existsSync(join(gyoker, "..", "public", ut.replace(/^\//, "")))
    })

    expect(fedetlen).toEqual([])
  })

  /**
   * EZ AZ AZ ALLITAS, AMIERT A KARTYA LETEZIK. A regi, pont-alapu alak IGAZAT adott
   * ra, es ettol lett a valasz 200 a not-found torzzsel. Ha valaki visszateszi a
   * pont-ellenorzest, ez pirosodik.
   */
  it("egy tetszoleges pontos cim NEM kerulheti meg", () => {
    expect(statikusGyokerUt("/nincs-ilyen-fajl.txt")).toBe(false)
    expect(statikusGyokerUt("/nincs.js")).toBe(false)
    expect(statikusGyokerUt("/a.b")).toBe(false)
  })

  /**
   * A GYOKER SZINT KULON FELTETEL. A `/hu/robots.txt` ma is rendes 404-et ad, es azt
   * nem szabad megkerulesse tenni: az orszagkodos utat a rendes utvonal-feloldas
   * kezeli.
   */
  it("csak a gyoker szinten all, melyebben nem", () => {
    expect(statikusGyokerUt("/hu/robots.txt")).toBe(false)
    expect(statikusGyokerUt("/hu/sitemap.xml")).toBe(false)
  })

  it("a rendes lapok nem kerulik meg", () => {
    expect(statikusGyokerUt("/hu/termekek")).toBe(false)
    expect(statikusGyokerUt("/")).toBe(false)
  })
})
