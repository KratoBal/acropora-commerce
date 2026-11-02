import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock("@modules/checkout/components/foxpost-logo", () => ({
  default: () => <span data-testid="foxpost-logo" />,
}))

import OrderCompletedMinimal from "./order-completed-minimal"
import OrderCompletedTemplate from "./order-completed-template"

afterEach(cleanup)

/**
 * A VISSZAIGAZOLÓ OLDAL KÉT NYELVEN. Mit mér: a fejléc, a teljesítés blokkjai,
 * az összesítő és a minimális oldal szövege a lap nyelvén áll; a nulla
 * szállítás "Ingyenes" / "Free"; a vegyes rendelés két teljesítése címkézve
 * (1. kiszállítandó, 2. személyes átvétel); a márkanevek és a kapott adatok
 * (a pont neve, címe) nem fordulnak. A rendelés adatainak láthatósági szabálya
 * (audit P1) a page.spec-ben van, ez a kirajzolás nyelvét méri.
 */
const rendeles = (
  id: string,
  szam: number,
  mod: Record<string, unknown>,
  szolgaltato = "pp_stripe_stripe",
) =>
  ({
    id,
    display_id: szam,
    email: "vevo@example.test",
    total: 9800,
    currency_code: "huf",
    items: [{ id: `${id}_i`, product_title: "Reef Salt", quantity: 2 }],
    shipping_address: {
      postal_code: "1111",
      city: "Budapest",
      address_1: "Teszt utca 1.",
    },
    shipping_methods: [mod],
    payment_collections: [{ payments: [{ provider_id: szolgaltato }] }],
  }) as never

const hazhoz = { name: "GLS házhozszállítás", total: 0 }
const bolti = { name: "Átvétel a boltban", total: 0 }

describe("a visszaigazoló oldal nyelve", () => {
  it("magyarul a régi szavak állnak", async () => {
    render(
      await OrderCompletedTemplate({
        order: rendeles("o1", 50, hazhoz),
        countryCode: "hu",
      }),
    )
    expect(screen.getByText("Rendelés sikeres")).toBeTruthy()
    expect(screen.getByText("Teljesítés")).toBeTruthy()
    expect(screen.getByText("1. Kiszállítandó rendelés")).toBeTruthy()
    expect(screen.getByTestId("rendeleseim").textContent).toBe(
      "Rendeléseim megnyitása",
    )
  })

  it("angolul a fejléc, a teljesítés és az összesítő angol; a vegyes rendelés két teljesítése címkézve", async () => {
    render(
      await OrderCompletedTemplate({
        order: rendeles("o1", 50, hazhoz),
        par: rendeles("o2", 51, bolti, "pp_acropora_cod"),
        parBolti: true,
        countryCode: "en-hu",
      }),
    )
    expect(screen.getByText("Order placed")).toBeTruthy()
    expect(screen.getByText("Fulfilment")).toBeTruthy()
    expect(screen.getByText("1. Order to be delivered")).toBeTruthy()
    expect(screen.getByText("2. Pickup in the store")).toBeTruthy()
    expect(screen.getByTestId("ket-teljesites").textContent).toBe(
      "The two fulfilments can be followed as separate orders.",
    )
    const osszesito = screen.getByTestId("rendeles-osszesito")
    expect(osszesito.textContent).toContain("Order summary")
    expect(osszesito.textContent).toContain("Card")
    expect(screen.getByTestId("rendeleseim").textContent).toBe("Open my orders")
    // a tétel sora és a nulla szállítás
    expect(document.body.textContent).toContain("Reef Salt · qty 2")
    expect(document.body.textContent).toContain("Shipping: Free")
    expect(document.body.textContent).not.toContain("Teljesítés")
  })

  it("a bolti rész nem kap szállítási sort, a kapott pontadat nem fordul", async () => {
    render(
      await OrderCompletedTemplate({
        order: rendeles("o1", 50, {
          name: "GLS csomagpont",
          total: 1490,
          data: {
            gls_pickup_point: {
              id: "L1",
              name: "GLS Automata – Allee",
              address: "1117 Budapest, Október huszonharmadika utca 8–10.",
              type: "parcel-locker",
              hours: [1, 2, 3, 4, 5].map((day) => ({
                day,
                from: "08:00",
                to: "20:00",
              })),
            },
          },
        }),
        countryCode: "en-hu",
      }),
    )
    const blokk = screen.getByTestId("teljesites-blokk").textContent ?? ""
    // a GLS adata (név, cím) változatlan, a nyitvatartás napjai a lap nyelvén
    expect(blokk).toContain("GLS Automata – Allee")
    expect(blokk).toContain("Mon–Fri 8–20")
    expect(screen.getByTestId("mi-tortenik").textContent).toContain(
      "The GLS tracking number appears",
    )
  })

  it("az utánvétes rendelés az átvételkor fizetendőt és a díjat angolul mondja", async () => {
    render(
      await OrderCompletedTemplate({
        order: rendeles(
          "o1",
          50,
          { name: "GLS csomagpont", total: 1490 },
          "pp_acropora_cod",
        ),
        countryCode: "en-hu",
      }),
    )
    expect(screen.getByTestId("atvetelkor-fizetendo").textContent).toContain(
      "To pay on receipt:",
    )
    expect(document.body.textContent).toContain("Cash on delivery")
  })

  it("a minimális oldal két nyelven", () => {
    const { unmount } = render(
      <OrderCompletedMinimal displayId={50} countryCode="hu" />,
    )
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Köszönjük a rendelésed!",
    )
    unmount()
    render(<OrderCompletedMinimal displayId={50} countryCode="en-hu" />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Thank you for your order!",
    )
    expect(screen.getByTestId("rendeleseim").textContent).toBe("Open my orders")
  })
})
