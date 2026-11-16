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
  render(
    await OrderCompletedTemplate({
      order: rendeles(shipping),
      countryCode: "hu",
    }),
  )

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
      "A GLS követési szám akkor jelenik meg, amikor a csomagot feladtuk.",
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

/*
  A BOLTI ATVETEL "MI TORTENIK EZUTAN?" DOBOZA (acrobot 54187 es 54189).
  MI PIROSIT: egy tiszta bolti rendelesen nincs doboz; az atvetelkori fizetes sora kartyas rendelesen is megjelenik; az utalasnal nem a fizetesi lepes
  mondata all; egy futaros rendelesen megjelenik a bolti sor; a vegyes kosarban eltunik a csomag mondata a bolti sor mellol.
*/
describe("a bolti átvétel doboza a visszaigazoló oldalon", () => {
  const bolti = (provider: string) =>
    ({
      id: "order_60",
      display_id: 60,
      email: "vevo@example.test",
      total: 3000,
      currency_code: "huf",
      items: [
        { id: "i1", product_title: "Phytoplankton 1000 ml", quantity: 1 },
      ],
      shipping_methods: [{ name: "Bolti átvétel", total: 0, data: {} }],
      payment_collections: [{ payments: [{ provider_id: provider }] }],
    }) as never
  const doboz = async (provider: string) => {
    render(
      await OrderCompletedTemplate({
        order: bolti(provider),
        countryCode: "hu",
      }),
    )
    return screen.queryByTestId("mi-tortenik")
  }

  it("átvételkori fizetés: az üzlet és a két mondat", async () => {
    const d = await doboz("pp_system_default")
    expect(d?.textContent).toContain("Mi történik ezután?")
    expect(d?.textContent).toContain(
      "Az átvétel helye: Acropora üzlet, 1106 Budapest, Pesti Gábor utca 35.",
    )
    expect(d?.textContent).toContain(
      "Az üzletben átvehető. Fizetés átvételkor.",
    )
    expect(d?.textContent).not.toContain("követési")
  })

  it("előre utalás: a fizetési lépés saját mondata", async () => {
    const d = await doboz("pp_acropora_transfer")
    expect(d?.textContent).toContain(
      "Díjbekérő emailben, 8 napos fizetési határidővel.",
    )
    expect(d?.textContent).not.toContain("Fizetés átvételkor")
  })

  it("bankkártya: az üzlet, de fizetési sor nincs", async () => {
    const d = await doboz("pp_stripe_stripe")
    expect(screen.getAllByTestId("bolti-lepes")).toHaveLength(1)
    expect(d?.textContent).not.toContain("Fizetés átvételkor")
    expect(d?.textContent).not.toContain("Díjbekérő")
  })

  it("egy futáros rendelésen nincs bolti sor", async () => {
    await lap({ name: "GLS házhozszállítás", total: 3500, data: {} })
    expect(screen.queryByTestId("bolti-lepes")).toBeNull()
  })

  it("vegyes kosár: a csomag mondata és a bolti sor együtt áll", async () => {
    render(
      await OrderCompletedTemplate({
        order: rendeles({ name: "GLS házhozszállítás", total: 3500, data: {} }),
        par: bolti("pp_stripe_stripe"),
        parBolti: true,
        countryCode: "hu",
      }),
    )
    const d = screen.getByTestId("mi-tortenik")
    expect(d.textContent).toContain("Összekészítjük a csomagot.")
    expect(d.textContent).toContain("Az átvétel helye:")
  })
})

/*
  A VENDEG BEJARATA A VISSZAIGAZOLO OLDALON (a "Rendelesem" oldal hianylistaja, 2026-11-05).
  MI PIROSIT: a bejelentkezetlen latogato nem kap hivatkozast a vendeg lapra; a bejelentkezett kap egyet (neki a
  fiok rendelesei a bejarat); a hivatkozas masra visz; a felirat nem a szotarbol jon (angol oldalon is magyar).
*/
describe("a vendég bejárata a rendelés-visszaigazoló oldalon", () => {
  const fogyasztoi = {
    name: "GLS csomagpont",
    total: 1490,
    data: {},
  }
  const oldal = async (extra: { vendeg?: boolean; countryCode?: string }) =>
    render(
      await OrderCompletedTemplate({
        order: rendeles(fogyasztoi),
        countryCode: extra.countryCode ?? "hu",
        vendeg: extra.vendeg,
      }),
    )

  it("vendégnek van hivatkozás a Rendelés megtekintése lapra, bejelentkezettnek nincs", async () => {
    await oldal({ vendeg: true })
    const link = screen.getByTestId("rendeles-megtekintese-link")
    expect(link.getAttribute("href")).toBe("/rendeles-megtekintese")
    expect(link.textContent).toBe("Rendelés megtekintése")
    cleanup()
    await oldal({ vendeg: false })
    expect(screen.queryByTestId("rendeles-megtekintese-link")).toBeNull()
    cleanup()
    await oldal({})
    expect(screen.queryByTestId("rendeles-megtekintese-link")).toBeNull()
  })

  it("az angol oldalon a felirat angol", async () => {
    await oldal({ vendeg: true, countryCode: "en-hu" })
    expect(screen.getByTestId("rendeles-megtekintese-link").textContent).toBe(
      "View your order",
    )
  })
})
