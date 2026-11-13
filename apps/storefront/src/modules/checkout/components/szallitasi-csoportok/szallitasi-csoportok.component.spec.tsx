import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import SzallitasiCsoportok from "./index"

afterEach(cleanup)

/**
 * A SZALLITASI CSOPORT CIMKEJE A FIZETESI LEPESEN (acrobot 49701, a teszt kirakat kepen merve): a boltban atvett kosar
 * "1. KISZALLITAS" csoportot mutatott. MI PIROSIT: ha a szemelyes atvetel csoportja Kiszallitas marad; ha a sima
 * kiszallitas is Atvetel lenne; ha az atvetel a vevo hazcimet irna ki a bolt cime helyett.
 */
const kosar = {
  currency_code: "huf",
  items: [
    {
      id: "i1",
      product_title: "Reef LED 160 Pro",
      quantity: 1,
      total: 1000,
    },
  ],
  shipping_address: {
    address_1: "Minta utca 12.",
    postal_code: "1111",
    city: "Budapest",
    country_code: "hu",
  },
  shipping_methods: [{ name: "Átvétel a boltban", total: 0, data: {} }],
} as never

const csoport = () => screen.getByTestId("szallitasi-csoport")

describe("a szállítási csoport címkéje", () => {
  it("személyes átvételnél Átvétel, és a bolt címe áll", () => {
    render(
      <SzallitasiCsoportok
        cart={kosar}
        boltiTetelek={[]}
        szemelyesAtvetel
        countryCode="hu"
      />,
    )
    expect(csoport().textContent).toContain("1. Átvétel")
    expect(csoport().textContent).not.toContain("Kiszállítás")
    expect(csoport().textContent).toContain("Pesti Gábor utca 35")
    expect(csoport().textContent).not.toContain("Minta utca")
  })

  it("átvétel jelzése nélkül a régi Kiszállítás áll, a vevő címével", () => {
    render(
      <SzallitasiCsoportok cart={kosar} boltiTetelek={[]} countryCode="hu" />,
    )
    expect(csoport().textContent).toContain("1. Kiszállítás")
    expect(csoport().textContent).toContain("Minta utca 12.")
  })

  it("angolul a Pickup címke áll", () => {
    render(
      <SzallitasiCsoportok
        cart={kosar}
        boltiTetelek={[]}
        szemelyesAtvetel
        countryCode="en-hu"
      />,
    )
    expect(csoport().textContent).toContain("1. Pickup")
  })
})
