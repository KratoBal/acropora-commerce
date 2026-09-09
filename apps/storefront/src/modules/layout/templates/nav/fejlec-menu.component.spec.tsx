import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FejlecMenu } from "./fejlec-menu"

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
