import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { szerverFa } from "@lib/teszt/szerver-fa"

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
  it("a bolt opcióit nevesíti: a bolti átvétel 0 Ft, a futár-módok 'az ár a cím megadása után látszik'", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
      ),
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

  it("a fizetés rész egy mondat: se mód, se szám (a backend cím nélkül üres listát ad)", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
      ),
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

  it("a bolt válasza nélkül (null vagy üres lista) a doboz nem jelenik meg", async () => {
    const { rerender } = render(
      await szerverFa(
        <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
      ),
    )
    expect(screen.getByTestId("atvetel-fizetes")).toBeInTheDocument()
    rerender(
      await szerverFa(
        <AtvetelFizetes opciok={null} currencyCode="huf" countryCode="hu" />,
      ),
    )
    expect(screen.queryByTestId("atvetel-fizetes")).toBeNull()
    rerender(
      await szerverFa(
        <AtvetelFizetes opciok={[]} currencyCode="huf" countryCode="hu" />,
      ),
    )
    expect(screen.queryByTestId("atvetel-fizetes")).toBeNull()
  })

  it("egy élő állatos kosár egyetlen sort kap, és a futár-módokat nem találja ki", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes
          opciok={[OPCIOK[0]!]}
          currencyCode="huf"
          countryCode="hu"
        />,
      ),
    )
    expect(screen.getAllByTestId("atvetel-sor")).toHaveLength(1)
    expect(screen.queryByText("GLS házhozszállítás")).toBeNull()
  })

  it("vegyes kosárnál kimondja, hogy a futár-módok csak a kiszállítandó rendelésre vonatkoznak; másképp nem mondja", async () => {
    const { rerender } = render(
      await szerverFa(
        <AtvetelFizetes
          opciok={OPCIOK}
          currencyCode="huf"
          countryCode="hu"
          szetvalasztott
        />,
      ),
    )
    expect(screen.getByTestId("atvetel-futar-resz")).toHaveTextContent(
      "A futár-módok csak a kiszállítandó rendelésre vonatkoznak",
    )
    rerender(
      await szerverFa(
        <AtvetelFizetes opciok={OPCIOK} currencyCode="huf" countryCode="hu" />,
      ),
    )
    expect(screen.queryByTestId("atvetel-futar-resz")).toBeNull()
    rerender(
      await szerverFa(
        <AtvetelFizetes
          opciok={OPCIOK}
          currencyCode="huf"
          countryCode="en-hu"
          szetvalasztott
        />,
      ),
    )
    expect(screen.getByTestId("atvetel-futar-resz")).toHaveTextContent(
      "The courier options apply only to the order that is delivered",
    )
  })

  it("a bolti átvétel felirata a szótárból jön: az angol oldalon az angol, és osztályozás nélkül a futár-mód neve marad a bolt neve", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes
          opciok={OPCIOK}
          currencyCode="huf"
          countryCode="en-hu"
        />,
      ),
    )
    const sorok = screen.getAllByTestId("atvetel-sor")
    expect(sorok[0]).toHaveTextContent("Pickup in the store")
    expect(sorok[1]).toHaveTextContent("GLS házhozszállítás")
  })

  it("az angol oldal angol címeket kap, az opciók nevei a bolt válaszából jönnek", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes
          opciok={OPCIOK}
          currencyCode="huf"
          countryCode="en-hu"
        />,
      ),
    )
    expect(screen.getByTestId("atvetel-resz")).toHaveTextContent(
      "Receiving the order",
    )
    expect(screen.getByTestId("fizetes-resz")).toHaveTextContent("Payment")
    expect(screen.getAllByTestId("atvetel-sor")[1]).toHaveTextContent(
      "The price shows once you enter the address",
    )
  })

  /*
    A MOD NEVE A SZOTARBOL (a kirakat angol nezete, 2026-11-19): a kosar doboza a bolt magyar nevet irta az angol oldalra. MI PIROSIT: ha a
    pénztár által ismert mód (Foxpost, GLS pont és ház, a nehézáru is) neve az angol oldalon magyar marad; ha a magyar oldal neve elvész;
    ha az ismeretlen opció neve is a szótárból jönne (a bolt neve marad); ha az osztályozás hiánya a neveket elrontja.
  */
  const OSZTALY = {
    foxpostOptionId: "so_3",
    glsPont: [{ option_id: "so_4", heavy: false }],
    glsHaz: [
      { option_id: "so_2", heavy: false },
      { option_id: "so_5", heavy: true },
    ],
  }
  const OPCIOK_SOK = [
    ...OPCIOK,
    {
      id: "so_4",
      name: "GLS csomagpont",
      price_type: "calculated",
      service_zone: { fulfillment_set: { type: "shipping" } },
    },
    {
      id: "so_5",
      name: "GLS nehézáru házhozszállítás",
      price_type: "calculated",
      service_zone: { fulfillment_set: { type: "shipping" } },
    },
    {
      id: "so_6",
      name: "Valami új bolti mód",
      price_type: "calculated",
      service_zone: { fulfillment_set: { type: "shipping" } },
    },
  ]
  const nevek = () =>
    screen
      .getAllByTestId("atvetel-sor")
      .map((sor) => sor.querySelector("span")?.textContent)

  it("az angol oldalon a pénztár által ismert módok neve angol, az ismeretlené marad a bolt neve", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes
          opciok={OPCIOK_SOK}
          osztaly={OSZTALY}
          currencyCode="huf"
          countryCode="en-hu"
        />,
      ),
    )
    expect(nevek()).toEqual([
      "Pickup in the store",
      "GLS home delivery",
      "FOXPOST",
      "GLS pickup point",
      "GLS heavy-goods home delivery",
      "Valami új bolti mód",
    ])
  })

  it("a magyar oldalon ugyanazok a módok a szótár magyar nevén állnak", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes
          opciok={OPCIOK_SOK}
          osztaly={OSZTALY}
          currencyCode="huf"
          countryCode="hu"
        />,
      ),
    )
    expect(nevek()).toEqual([
      "Átvétel üzletben",
      "GLS házhozszállítás",
      "FOXPOST",
      "GLS csomagpont",
      "GLS nehézáru házhozszállítás",
      "Valami új bolti mód",
    ])
  })

  it("osztályozás nélkül a bolt nevei maradnak", async () => {
    render(
      await szerverFa(
        <AtvetelFizetes
          opciok={OPCIOK_SOK}
          osztaly={null}
          currencyCode="huf"
          countryCode="en-hu"
        />,
      ),
    )
    expect(nevek()?.slice(1)).toEqual([
      "GLS házhozszállítás",
      "Foxpost csomagpont",
      "GLS csomagpont",
      "GLS nehézáru házhozszállítás",
      "Valami új bolti mód",
    ])
  })
})
