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

import OrderCompletedTemplate from "./order-completed-template"

/*
  A SIKEROLDAL GLS-RENDELÉSNÉL (a GLS-prompt 10. pontja; Figma 508:451).
  MI PIROSIT: a GLS-pont blokkja nem a fajtája logójával áll; a „Mi történik
  ezután?” nem a GLS mondatát mondja; egy FOXPOST-rendelés GLS-logót vagy a
  GLS mondatát kapja.
*/
afterEach(cleanup)

const rendeles = (shipping: Record<string, unknown>) =>
  ({
    id: "order_50",
    display_id: 50,
    email: "vevo@example.test",
    total: 9800,
    currency_code: "huf",
    items: [{ id: "i1", product_title: "Salifert KH/Alk teszt", quantity: 1 }],
    shipping_address: {
      postal_code: "1111",
      city: "Budapest",
      address_1: "Teszt utca 1.",
    },
    shipping_methods: [shipping],
    payment_collections: [{ payments: [{ provider_id: "pp_stripe_stripe" }] }],
  }) as never

const lap = async (shipping: Record<string, unknown>) =>
  render(await OrderCompletedTemplate({ order: rendeles(shipping) }))

describe("a sikeroldal GLS-rendelésnél", () => {
  it("a GLS Automata logója, a nyitvatartás és a GLS következő lépése", async () => {
    await lap({
      name: "GLS csomagpont",
      total: 1490,
      data: {
        gls_pickup_point: {
          id: "L1",
          name: "GLS Automata – Allee",
          address: "1117 Budapest, Október huszonharmadika utca 8–10.",
          type: "parcel-locker",
          hours: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
            day,
            from: "00:00",
            to: "24:00",
          })),
        },
      },
    })
    expect(screen.getByTestId("teljesites-logo").getAttribute("src")).toBe(
      "/images/gls-automata.png",
    )
    expect(screen.getByTestId("teljesites-blokk").textContent).toContain(
      "1117 Budapest, Október huszonharmadika utca 8–10. · 0–24",
    )
    expect(screen.getByTestId("mi-tortenik").textContent).toContain(
      "A GLS követési szám akkor jelenik meg, amikor az Acropora OS-ben létrehoztuk és feladtuk a küldeményt.",
    )
  })

  it("a FOXPOST-rendelés nem kap GLS-logót és GLS-mondatot", async () => {
    await lap({
      name: "Foxpost csomagpont",
      total: 1150,
      data: {
        foxpost_pickup_point: {
          id: "hu04",
          name: "FOXPOST A-BOX",
          address: "1026 Budapest, X",
        },
      },
    })
    expect(screen.queryByTestId("teljesites-logo")).toBeNull()
    expect(screen.getByTestId("mi-tortenik").textContent).not.toContain("GLS")
  })
})
