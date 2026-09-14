import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/cart", () => ({
  deleteLineItem: vi.fn(async () => undefined),
}))

import DeleteButton from "./index"

afterEach(cleanup)

/**
 * A JELÖLŐ ÁTÉR-E A GOMBIG.
 *
 * === MIÉRT VAN ERRE ÁLLÍTÁS ===
 *
 * A hívó (`cart/components/item`) már ma is átadott egy
 * `data-testid="product-delete-button"` értéket, a komponens viszont nem vette
 * át. Mérve 2026-09-14 a kiszolgált kosár-lapon: a található jelölők
 * `cart-item-count` és `product-row` -- törlő gomb NINCS közöttük.
 *
 * ÉS A FORDÍTÓ NEM SZÓLT RÓLA. Egy ismeretlen prop egy saját komponensen
 * normálisan típushiba; a KÖTŐJELES JSX-attribútumot viszont a TypeScript
 * átengedi (nem érvényes azonosító, tehát kimarad a többlet-prop
 * ellenőrzésből). Se fordítási, se futási jele nem volt: a hívó azt hitte, van
 * mérőhelye, és nem volt.
 *
 * Ez nem szépséghiba: egy nem létező jelölőre írt mérés NULLÁT ad, és a nulla
 * ugyanúgy néz ki, mint egy hiányzó gomb. Engem is megállított -- az üres
 * kosár mérésénél emiatt nem tudtam a sort levenni.
 *
 * === KALIBRÁCIÓ (2026-09-14; mindkét körben 9 teszt futott le) ===
 *
 *   a komponens megint ELDOBJA a jelölőt      2 piros
 *   a jelölő a BURKÁRA kerül, nem a gombra    2 piros
 *
 * A MÁSODIK A LÉNYEGI: egy jelölő, ami ott VAN, csak a rossz elemen, kívülről
 * működőnek látszik -- a keresés megtalálja, a kattintás viszont nem a gombra
 * megy. Ezért méri az állítás a `tagName`-et, nem csak a meglétet.
 */
describe("a törlő gomb jelölője", () => {
  it("az átadott jelölő a GOMBON áll, nem a burkán", () => {
    render(<DeleteButton id="item-1" data-testid="product-delete-button" />)

    const jelolt = screen.getByTestId("product-delete-button")
    expect(jelolt.tagName).toBe("BUTTON")
  })

  /**
   * ISMERT POZITÍV KONTROLL: jelölő NÉLKÜL a gomb attól még ott van. Enélkül a
   * fenti állítást egy olyan változat is kielégítené, ami MINDIG kiírja ezt az
   * egy értéket -- és akkor nem az átadást mérnénk.
   */
  it("jelölő nélkül is megjelenik a gomb, jelölő nélkül", () => {
    render(<DeleteButton id="item-1" />)

    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(screen.queryByTestId("product-delete-button")).toBeNull()
  })

  it("egy másik jelölőt is átvesz, nem csak ezt az egyet", () => {
    render(<DeleteButton id="item-1" data-testid="masik-jelolo" />)

    expect(screen.getByTestId("masik-jelolo").tagName).toBe("BUTTON")
  })
})
