import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useParams: () => ({ countryCode: "hu" }) }))

import Rendelesek from "."

afterEach(() => cleanup())

const rendeles = (
  id: string,
  display_id: number,
  extra: Record<string, unknown> = {},
) =>
  ({
    id,
    display_id,
    total: 396980,
    currency_code: "huf",
    created_at: "2026-09-28T10:00:00.000Z",
    payment_status: "captured",
    items: [{ quantity: 2 }, { quantity: 1 }],
    ...extra,
  }) as never
const allapot = (order_id: string, status: string, label: string) => ({
  order_id,
  status,
  label,
  updated_at: "2026-09-29T10:00:00.000Z",
})

/**
 * A RENDELESEIM (249:37). MI PIROSIT: ha a nyitott kartyan nincs szam, cimke,
 * osszeg vagy reszletek-link; ha a cimke nem a bolt magyar neve; ha a lezart
 * a nyitottak koze kerul; ha ures listanal ures lap all mondat helyett.
 */
describe("a Rendeléseim lap", () => {
  it("nyitott kártya: szám, a bolt címkéje, összeg, dátum és fizetés, részletek-link", () => {
    render(
      <Rendelesek
        rendelesek={[rendeles("order_1", 12)]}
        allapotok={[allapot("order_1", "confirmed", "Visszaigazolva")]}
      />,
    )
    const kartya = screen.getByTestId("rendeles-nyitott")
    expect(within(kartya).getByTestId("rendeles-szam").textContent).toBe("#12")
    const cimke = within(kartya).getByTestId("rendeles-allapot")
    expect(cimke.textContent).toBe("Visszaigazolva")
    expect(cimke.getAttribute("data-fajta")).toBe("nyitott")
    // A keret szovegstilusa nagybetus (249:42, textCase UPPER); a szoveg a bolt neve.
    expect(cimke.className).toContain("uppercase")
    expect(kartya.textContent).toContain("2026. szeptember 28. · kifizetve")
    expect(within(kartya).getByTestId("rendeles-osszeg").textContent).toMatch(
      /396\s?980/,
    )
    expect(
      within(kartya).getByTestId("rendeles-reszletek").getAttribute("href"),
    ).toBe("/hu/account/orders/details/order_1")
  })

  it("a lezárt a Korábbi rendelések alatt, teljesítve-címkével és tételszámmal", () => {
    render(
      <Rendelesek
        rendelesek={[rendeles("order_1", 12), rendeles("order_2", 9)]}
        allapotok={[
          allapot("order_1", "pending_processing", "Feldolgozásra vár"),
          allapot("order_2", "closed", "Megrendelés lezárva"),
        ]}
      />,
    )
    expect(screen.getAllByTestId("rendeles-nyitott")).toHaveLength(1)
    const korabbi = screen.getByTestId("rendeles-korabbi")
    expect(screen.getByText("Korábbi rendelések")).toBeTruthy()
    expect(korabbi.textContent).toContain("#9")
    expect(korabbi.textContent).toContain("3 tétel")
    expect(
      within(korabbi)
        .getAllByTestId("rendeles-allapot")[0]
        .getAttribute("data-fajta"),
    ).toBe("teljesitve")
  })

  it("állapot nélkül a kártya címke nélkül áll, nem esik ki", () => {
    render(<Rendelesek rendelesek={[rendeles("order_1", 12)]} allapotok={[]} />)
    expect(screen.getByTestId("rendeles-nyitott")).toBeTruthy()
    expect(screen.queryByTestId("rendeles-allapot")).toBeNull()
  })

  it("rendelés nélkül mondat és Vásárlás link", () => {
    render(<Rendelesek rendelesek={[]} allapotok={[]} />)
    expect(screen.getByTestId("no-orders-container").textContent).toContain(
      "Még nincs rendelésed.",
    )
    expect(
      screen.getByTestId("continue-shopping-button").getAttribute("href"),
    ).toBe("/hu/store")
  })
})

/**
 * EGY LEADÁSBÓL KÉT RENDELÉS (P4-2). MI PIROSIT: ha a pár száma nem látszik a
 * kártyán; ha rossz irányt mond (melyik a bolti); ha a listán nem szereplő
 * párra is kiír valamit.
 */
describe("egy leadásból két rendelés", () => {
  const fo = rendeles("order_1", 12, {
    metadata: { acropora_pickup_order_id: "order_2" },
  })
  const bolti = rendeles("order_2", 13, {
    metadata: { acropora_parent_order_id: "order_1" },
  })

  it("mindkét kártya megnevezi a párját, a fajtájával", () => {
    render(<Rendelesek rendelesek={[fo, bolti]} allapotok={[]} />)
    expect(
      screen.getAllByTestId("rendeles-kapcsolt").map((e) => e.textContent),
    ).toEqual([
      "Egy leadásból: #13, bolti átvétel",
      "Egy leadásból: #12, kiszállítás",
    ])
  })

  it("ha a pár nincs a listán, nem ír ki semmit", () => {
    render(<Rendelesek rendelesek={[fo]} allapotok={[]} />)
    expect(screen.queryByTestId("rendeles-kapcsolt")).toBeNull()
  })
})
