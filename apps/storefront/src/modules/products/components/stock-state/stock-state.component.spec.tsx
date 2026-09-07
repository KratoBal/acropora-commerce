import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import StockState from "./index"

/**
 * A KIRAJZOLÁS MÉRÉSE -- AZ AZ ÁG, AMI A VEVŐ ELÉ KERÜL.
 *
 * === MIÉRT VAN EGYÁLTALÁN ===
 *
 * A döntést (`availabilityOf`) tíz állítás fedi, de a kirajzolást eddig SEMMI.
 * Épp azt az ágat nem, amiért az egész készült: hogy az "Eladva" állapotban nem
 * letiltott gomb áll, hanem továbbvivő hivatkozás. Egy jelentés, ami kimondja,
 * hogy egy utat semmi nem mér, és mégis kiküldi rajta a funkciót, nem jelentés.
 *
 * === A HAMIS, AMI KELL: a countryCode ===
 *
 * A `LocalizedClientLink` a `useParams`-ból veszi az ország-kódot. Nem a linket
 * cseréljük ki hamisra, hanem a keret hívását: így a MI komponensünk valódi
 * hivatkozást rajzol, és a `href` a maga teljes alakjában mérhető.
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

describe("a készlet-állapot kirajzolása", () => {
  it("KAPHATÓ állapotban a kosár-gomb kattintható, és a kattintás továbbmegy", async () => {
    const kosarba = vi.fn()
    render(
      <StockState
        availability="KAPHATO"
        similarHref="/collections/elo-korallok"
        onAddToCart={kosarba}
      />,
    )

    const gomb = screen.getByTestId("add-product-button")
    expect(gomb).not.toBeDisabled()
    expect(gomb).toHaveTextContent("Kosárba")

    gomb.click()
    expect(kosarba).toHaveBeenCalledTimes(1)
  })

  it("ELFOGYOTT állapotban a gomb ott van, de le van tiltva", () => {
    const kosarba = vi.fn()
    render(
      <StockState
        availability="ELFOGYOTT"
        similarHref="/collections/elo-korallok"
        onAddToCart={kosarba}
      />,
    )

    const gomb = screen.getByTestId("add-product-button")
    expect(gomb).toBeDisabled()
    expect(gomb).toHaveTextContent("Elfogyott")
  })

  /**
   * A LÉNYEG: NEM LETILTOTT GOMB, HANEM MÁSIK GOMB.
   *
   * Két állítás, mert az egyik önmagában kevés. Hogy a hivatkozás OTT VAN, azt
   * egy olyan doboz is teljesítené, ami MELLÉ teszi a letiltott kosár-gombot --
   * és pont az a zsákutca, amit el akartunk kerülni. Ezért áll mellette a
   * hiányt mérő állítás is.
   */
  it("ELADVA állapotban továbbvivő hivatkozás áll, NEM kosár-gomb", () => {
    render(
      <StockState
        availability="ELADVA"
        similarHref="/collections/elo-korallok"
        onAddToCart={() => undefined}
      />,
    )

    const link = screen.getByRole("link", {
      name: /Hasonló példányok megnézése/,
    })
    expect(link).toHaveAttribute("href", "/hu/collections/elo-korallok")

    expect(screen.queryByTestId("add-product-button")).toBeNull()
    expect(screen.getByText("Eladva")).toBeTruthy()
  })

  /**
   * A KÉT KIRAJZOLÁSI HELY NEM ÜTKÖZIK.
   *
   * A lap a gomb-oszlopban ÉS a lebegő mobil sávon is kirajzolja ezt a dobozt.
   * Ha mind a kettő ugyanazt az azonosítót viselné, a végponti keresés
   * kétértelmű lenne -- és az a hiba csendes: a teszt az elsőt találná meg.
   */
  it("a testId paraméter az ELADVA ágon is végigmegy", () => {
    render(
      <StockState
        availability="ELADVA"
        similarHref="/store"
        onAddToCart={() => undefined}
        testId="mobile-cart-button"
      />,
    )

    expect(screen.getByTestId("mobile-cart-button-eladva")).toBeTruthy()
  })
})
