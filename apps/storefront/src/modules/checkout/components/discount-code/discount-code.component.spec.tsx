import { readFileSync } from "fs"
import { join } from "path"

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const applyPromotions = vi.fn()

vi.mock("@lib/data/cart", () => ({
  applyPromotions: (...args: unknown[]) => applyPromotions(...args),
}))

import DiscountCode from "./index"

afterEach(cleanup)
beforeEach(() => {
  applyPromotions.mockReset()
})

const kosar = (promotions: unknown[] = []) =>
  ({ id: "cart-1", promotions }) as never

async function kodotKuld(kod = "ERVENYTELEN-TESZT-1234") {
  render(<DiscountCode cart={kosar()} />)
  screen.getByTestId("add-discount-button").click()

  const mezo = await screen.findByTestId("discount-input")
  ;(mezo as HTMLInputElement).value = kod
  // A `form action` FormData-t ad at; a mezo `name="code"` erteke ebbol jon,
  // ezert a beallitas UTAN kuldjuk be az urlapot.
  const urlap = mezo.closest("form") as HTMLFormElement
  urlap.requestSubmit()
}

/**
 * A HIBAUZENET A MUVELET VALASZABOL JON, NEM EGY KIVETELBOL.
 *
 * === A MERT HIBA (b4ea279c) ===
 *
 * Ervenytelen kodra a vevo EZT latta, angolul, a kod-mezo alatt:
 *
 *   "An error occurred in the Server Components render. The specific message is
 *    omitted in production builds to avoid leaking sensitive details..."
 *
 * Merve a kitelepitett lapon (2026-09-14, sajat eszkozzel): a szoveg a
 * `discount-error-message` jelolon BELUL allt -- tehat a komponens sajat
 * hibauzenet-helyerol jott, es nem valahonnan a lap mogul. Ez dontotte el, hogy
 * a hiba a kliens `catch` again van, nem a lap renderelesben.
 *
 * Az ok: a `applyPromotions` SZERVER-MUVELET, es egy szerver-muveletben DOBOTT
 * hiba uzenete a produkcios buildben nem jut el a klienshez -- a Next lecsereli
 * a fenti altalanos szovegre.
 *
 * === AMIT EZ A SPEC MER, ES AMIT NEM ===
 *
 * MERI: hogy a komponens a MUVELET VALASZAT rajzolja ki, es hogy siker eseten
 * nem ir ki semmit.
 *
 * NEM MERI: magat a Next-hatart. Az a produkcios build viselkedese, jsdom alatt
 * nem all elo -- ezert all mellette a kitelepites utani meres a kiszolgalt
 * lapon, ugyanazzal az eszkozzel, amivel a hibat megtalaltam
 * (`agents/murena/scripts/kedvezmenykod-hiba.cjs`).
 */
describe("az érvénytelen kedvezménykód válasza", () => {
  it("a művelet üzenetét írja ki, a saját hibahelyére", async () => {
    applyPromotions.mockResolvedValue({
      ok: false,
      uzenet: "Ez a kedvezménykód nem érvényes.",
    })

    await kodotKuld()

    await waitFor(() => {
      expect(screen.getByTestId("discount-error-message").textContent).toBe(
        "Ez a kedvezménykód nem érvényes.",
      )
    })
  })

  /**
   * ISMERT POZITIV KONTROLL a lenti tagadashoz: SIKER eseten a hibahely NINCS
   * ott. Enelkul a "nem latszik angol szoveg" allitast egy osszeomlott
   * komponens is kielegitene.
   */
  it("sikeres alkalmazás után nincs hibaüzenet", async () => {
    applyPromotions.mockResolvedValue({ ok: true })

    await kodotKuld("ERVENYES")

    await waitFor(() => expect(applyPromotions).toHaveBeenCalled())
    expect(screen.queryByTestId("discount-error-message")).toBeNull()
  })

  /**
   * ES A LENYEGI TAGADAS: a komponens NEM a kivetel uzenetebol dolgozik.
   *
   * === MIERT A FORRASRA MER, ES NEM VISELKEDESRE ===
   *
   * Elso alakja egy DOBO muveletet allitott elo (`mockRejectedValue`), es azt
   * merte, hogy a hibahelyre semmi nem kerul. Az allitas zold lett -- de a
   * futas EXIT 1-gyel zarult: a komponens (helyesen) nem kapja el a dobast,
   * tehat a rejtett igeret KEZELETLEN marad, es a vitest azt bukasnak veszi.
   *
   * Vagyis a viselkedes-teszt itt magat a mert TULAJDONSAGOT (hogy nincs
   * `catch`) buntette volna. A forras-allitas gyengebb, es ezt kimondom: azt
   * meri, hogy a `catch`-es alak nincs a fajlban, nem azt, hogy a kivetel nem
   * jut el a kepernyore. A ketto kozott az a kulonbseg, hogy ez egy MASIK
   * alakot (peldaul egy `.catch()` lancot) nem venne eszre.
   */
  it("a komponens nem ír kivétel-üzenetet a hibahelyre", () => {
    const kod = readFileSync(join(__dirname, "index.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")

    // ISMERT POZITIV KONTROLL: a fajlt tenyleg beolvastuk, es ez az a komponens.
    expect(kod).toContain("setErrorMessage")
    expect(kod).toContain("applyPromotions")

    expect(kod).not.toMatch(/catch\s*\(/)
    expect(kod).not.toContain("e.message")
  })
})

/**
 * A FELIRAT MAGYARUL, mert a vevo latja. Az eredeti starter angol szovege
 * (`Promotion(s) applied:`) ugyanabban a dobozban allt, mint a javitott
 * hibauzenet -- ket sorral feljebb.
 */
describe("az alkalmazott kedvezmények felirata", () => {
  it("magyarul áll, ha van alkalmazott kód", () => {
    render(
      <DiscountCode
        cart={kosar([{ id: "promo-1", code: "TAVASZ", is_automatic: false }])}
      />,
    )

    expect(screen.getByText("Alkalmazott kedvezmények:")).toBeTruthy()
  })

  /** ISMERT POZITIV KONTROLL: kod nelkul ez a szakasz egyaltalan nincs ott. */
  it("kód nélkül a szakasz nem jelenik meg", () => {
    render(<DiscountCode cart={kosar()} />)

    expect(screen.queryByText("Alkalmazott kedvezmények:")).toBeNull()
  })
})
