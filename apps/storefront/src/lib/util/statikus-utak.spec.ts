import { describe, expect, it } from "vitest"

import { statikusGyokerUt } from "./statikus-utak"

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
    expect(statikusGyokerUt("/sitemap.xml")).toBe(true)
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
