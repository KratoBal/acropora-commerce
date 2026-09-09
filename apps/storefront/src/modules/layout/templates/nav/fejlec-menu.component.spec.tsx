import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FejlecMenu, MENU_SORREND, menuSorrendben } from "./fejlec-menu"

/**
 * UGYANAZ A HAMIS, AMIT A REPO MAR HASZNAL (stock-state, product-actions,
 * allapot.ssr): a `LocalizedClientJelolo` az orszagkodot a router-bol veszi, es
 * az jsdom-ban `null`. Nem uj mechanizmus -- a meglevo alakot veszem at, hogy
 * ne keletkezzen masodik ut ugyanarra.
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const kat = (nev: string, gyerekek: string[] = []) =>
  ({
    id: `id-${nev}`,
    name: nev,
    handle: nev.toLowerCase(),
    category_children: gyerekek.map((gy) => ({
      id: `id-${gy}`,
      name: gy,
      handle: gy.toLowerCase(),
    })),
  }) as never

/**
 * A KET MECHANIKA KULON ALL, ES KULON IS MERHETO.
 *
 * Balazs kerese ketto: a menupont NYISSON (ne navigaljon), es a sav TUNJON EL
 * gorgetesre. Ezek fuggetlenek -- az egyik elromolhat ugy, hogy a masik all,
 * ezert nem egy allitas meri oket.
 *
 * AMIT EZ A SPEC NEM MER: hogy melyik NEGY kategoria all a savban. Az kulon
 * kerdes, Balazsnal -- a komponens a KAPOTT halmazt rajzolja ki, es ez a spec
 * epp ezt hasznalja ki: sajat, kitalalt halmazt ad neki.
 */
describe("a fejléc menüje nyílik, nem ugrik", () => {
  it("a menüpont GOMB, nem hivatkozás", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS", "LPS"])]} />)

    const tetel = screen.getByTestId("fejlec-menu-tetel")

    expect(tetel.tagName).toBe("BUTTON")
    expect(tetel.getAttribute("aria-expanded")).toBe("false")
  })

  it("kattintásra kinyílik, és a gyerekek megjelennek", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS", "LPS"])]} />)

    expect(screen.queryByTestId("fejlec-menu-lenyilo")).toBeNull()

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    expect(screen.getByTestId("fejlec-menu-lenyilo")).toBeTruthy()
    expect(screen.getAllByTestId("fejlec-menu-gyerek")).toHaveLength(2)
  })

  /**
   * A GYOKER ELERHETO MARAD -- ez a keres masik fele.
   *
   * "ne ugorjon EGYBOL a termekek fokategoriara" nem azt jelenti, hogy a
   * fokategoria elerhetetlen legyen. A lenyilo tetejen ott all a sajat
   * hivatkozasa, kulon soron.
   */
  it("a lenyílóban ott a gyökér saját hivatkozása is", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS"])]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))

    const gyoker = screen.getByTestId("fejlec-menu-gyoker-link")
    expect(gyoker.getAttribute("href")).toContain("/categories/korallok")
  })
})

describe("a kategória-sáv görgetésre eltűnik", () => {
  const gorget = (y: number) => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true })
    fireEvent.scroll(window)
  }

  it("a lap tetején látszik", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok")]} />)

    expect(screen.getByTestId("fejlec-menu").getAttribute("data-latszik")).toBe(
      "igen",
    )
  })

  it("lejjebb görgetve eltűnik", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok")]} />)

    gorget(400)

    expect(screen.getByTestId("fejlec-menu").getAttribute("data-latszik")).toBe(
      "nem",
    )
  })

  /**
   * ES A NYITOTT LENYILO IS BEZARUL. Enelkul egy lebego panel maradna a
   * kepernyon, mikozben a sav, amihez tartozik, mar nem latszik.
   */
  it("görgetéskor a nyitott lenyíló is bezárul", () => {
    render(<FejlecMenu kategoriak={[kat("Korallok", ["SPS"])]} />)

    fireEvent.click(screen.getByTestId("fejlec-menu-tetel"))
    expect(screen.getByTestId("fejlec-menu-lenyilo")).toBeTruthy()

    gorget(400)

    expect(screen.queryByTestId("fejlec-menu-lenyilo")).toBeNull()
  })
})

/**
 * A NEGY MENUPONT ES A SORRENDJUK BALAZS SZAVABOL JON, NEM ADATBOL.
 *
 * "MIndenhol: Termékek, Halak, Korallok, Gerinctelenek" (2026-09-09 09:54).
 *
 * MIERT ALL ITT KULON ALLITAS A SORRENDRE: mert a sorrend semmilyen adatbol
 * NEM vezetheto le. Meret szerint sem (Korallok 8, Gerinctelenek 27, megis a
 * Korallok all elorebb), es a bolt `rank` mezojebol sem (az
 * Termekek, Gerinctelenek, Halak, Korallok sorrendet ad). Egy szamolt sorrend
 * tehat CSENDBEN mast adna -- ez az allitas epp azt fogja meg.
 */
describe("a menü négy pontja, Balázs sorrendjében", () => {
  it("a rögzített lista pontosan a kért négy név, ebben a sorrendben", () => {
    expect([...MENU_SORREND]).toEqual([
      "Termékek",
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
  })

  it("a kapott halmazt a rögzített sorrendbe rakja, nem a saját sorrendjében hagyja", () => {
    /* A bolt `rank` szerinti sorrendje -- szandekosan MAS, mint a kert. */
    const boltSzerint = [
      kat("Termékek"),
      kat("Gerinctelenek"),
      kat("Halak"),
      kat("Korallok"),
    ]

    expect(menuSorrendben(boltSzerint).map((k) => k.name)).toEqual([
      "Termékek",
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
  })

  /**
   * EGY HIANYZO NEV KIMARAD, ES NEM HELYETTESITUNK. Ha egy kategoria nincs a
   * boltban, az adat-kerdes -- nem talalunk ki helyette masikat.
   */
  it("hiányzó kategória egyszerűen kimarad", () => {
    const csakKetto = [kat("Termékek"), kat("Korallok")]

    expect(menuSorrendben(csakKetto).map((k) => k.name)).toEqual([
      "Termékek",
      "Korallok",
    ])
  })

  it("a sávban is ebben a sorrendben rajzolódnak", () => {
    render(
      <FejlecMenu
        kategoriak={[kat("Gerinctelenek"), kat("Termékek"), kat("Halak")]}
      />,
    )

    const nevek = screen
      .getAllByTestId("fejlec-menu-tetel")
      .map((e) => e.textContent)

    expect(nevek).toEqual(["Termékek", "Halak", "Gerinctelenek"])
  })
})
