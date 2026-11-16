import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import AtvetelFizetes from "./index"

afterEach(cleanup)

const OPCIOK = [
  {
    id: "so_1",
    name: "Bolti átvétel",
    price_type: "flat",
    amount: 0,
    service_zone: { fulfillment_set: { type: "pickup" } },
  },
  {
    id: "so_2",
    name: "GLS házhozszállítás",
    price_type: "calculated",
    service_zone: { fulfillment_set: { type: "shipping" } },
  },
  {
    id: "so_3",
    name: "Foxpost csomagpont",
    price_type: "calculated",
    service_zone: { fulfillment_set: { type: "shipping" } },
  },
]

/*
  AZ ÁTVÉTEL ÉS FIZETÉS DOBOZA (task t-20261116-kosar-dobozok). MI PIROSÍT: a doboz a bolt válasza nélkül is megjelenik és állít
  valamit; a számolt ár összegként jelenik meg; a bolti átvétel nulla ára hiányzik; a fizetés rész módot vagy számot nevez (a backend
  cím nélkül nem ad listát); az angol oldal magyar szöveget kap.
*/
describe("az átvétel és fizetés doboza a kosár lapon", () => {
  it("a bolt opcióit nevesíti: a bolti átvétel 0 Ft, a futár-módok 'az ár a cím megadása után látszik'", () => {
    render(
      <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
    )

    const sorok = screen.getAllByTestId("atvetel-sor")
    expect(sorok).toHaveLength(3)
    // a bolti átvétel a PÉNZTÁR felirata alatt áll, nem a bolt opció-nevén (acrobot 54117)
    expect(sorok[0]).toHaveTextContent("Átvétel üzletben")
    expect(sorok[0]).not.toHaveTextContent("Bolti átvétel")
    expect(sorok[0]).toHaveTextContent(/0\s?Ft/)
    expect(sorok[1]).toHaveTextContent("GLS házhozszállítás")
    expect(sorok[1]).toHaveTextContent("Az ár a cím megadása után látszik")
    expect(sorok[1]).not.toHaveTextContent(/\d/)
    expect(sorok[2]).toHaveTextContent("Foxpost csomagpont")
    expect(screen.getByTestId("atvetel-resz")).toHaveTextContent(
      "Az átvétel módját a pénztárban választod ki",
    )
  })

  it("a fizetés rész egy mondat: se mód, se szám (a backend cím nélkül üres listát ad)", () => {
    render(
      <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
    )

    const resz = screen.getByTestId("fizetes-resz")
    expect(resz).toHaveTextContent("Fizetés")
    expect(resz).toHaveTextContent("A fizetési módot a pénztárban választod ki")
    expect(resz.textContent).not.toMatch(/\d/)
    for (const mod of [
      "Bankkártya",
      "Utánvét",
      "Stripe",
      "SimplePay",
      "Átutalás",
    ])
      expect(resz.textContent).not.toContain(mod)
  })

  it("a bolt válasza nélkül (null vagy üres lista) a doboz nem jelenik meg", () => {
    const { rerender } = render(
      <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
    )
    expect(screen.getByTestId("atvetel-fizetes")).toBeInTheDocument()
    rerender(
      <AtvetelFizetes opciok={null} currencyCode="huf" countryCode="hu" />,
    )
    expect(screen.queryByTestId("atvetel-fizetes")).toBeNull()
    rerender(<AtvetelFizetes opciok={[]} currencyCode="huf" countryCode="hu" />)
    expect(screen.queryByTestId("atvetel-fizetes")).toBeNull()
  })

  it("egy élő állatos kosár egyetlen sort kap, és a futár-módokat nem találja ki", () => {
    render(
      <AtvetelFizetes
        opciok={[OPCIOK[0]!]}
        currencyCode="huf"
        countryCode="hu"
      />,
    )
    expect(screen.getAllByTestId("atvetel-sor")).toHaveLength(1)
    expect(screen.queryByText("GLS házhozszállítás")).toBeNull()
  })

  it("vegyes kosárnál kimondja, hogy a futár-módok csak a kiszállítandó rendelésre vonatkoznak; másképp nem mondja", () => {
    const { rerender } = render(
      <AtvetelFizetes
        opciok={OPCIOK}
        currencyCode="huf"
        countryCode="hu"
        szetvalasztott
      />,
    )
    expect(screen.getByTestId("atvetel-futar-resz")).toHaveTextContent(
      "A futár-módok csak a kiszállítandó rendelésre vonatkoznak",
    )
    rerender(
      <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
    )
    expect(screen.queryByTestId("atvetel-futar-resz")).toBeNull()
    rerender(
      <AtvetelFizetes
        opciok={OPCIOK}
        currencyCode="huf"
        countryCode="en-hu"
        szetvalasztott
      />,
    )
    expect(screen.getByTestId("atvetel-futar-resz")).toHaveTextContent(
      "The courier options apply only to the order that is delivered",
    )
  })

  it("a bolti átvétel felirata a szótárból jön: az angol oldalon az angol, és a futár-mód neve marad a bolt neve", () => {
    render(
      <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="en-hu" />,
    )
    const sorok = screen.getAllByTestId("atvetel-sor")
    expect(sorok[0]).toHaveTextContent("Pickup in the store")
    expect(sorok[1]).toHaveTextContent("GLS házhozszállítás")
  })

  it("az angol oldal angol címeket kap, az opciók nevei a bolt válaszából jönnek", () => {
    render(
      <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="en-hu" />,
    )
    expect(screen.getByTestId("atvetel-resz")).toHaveTextContent(
      "Receiving the order",
    )
    expect(screen.getByTestId("fizetes-resz")).toHaveTextContent("Payment")
    expect(screen.getAllByTestId("atvetel-sor")[1]).toHaveTextContent(
      "The price shows once you enter the address",
    )
  })
})
