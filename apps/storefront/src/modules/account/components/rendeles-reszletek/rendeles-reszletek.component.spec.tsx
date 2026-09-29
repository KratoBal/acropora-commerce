import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useParams: () => ({ countryCode: "hu" }) }))

import RendelesReszletek from "."

afterEach(() => cleanup())

const RENDELES = {
  id: "order_1",
  display_id: 1,
  currency_code: "huf",
  created_at: "2026-09-29T13:06:53.470Z",
  total: 4950,
  payment_status: "awaiting",
  items: [
    {
      id: "i1",
      title: "Aquavital Perlonvatta 100g",
      product_title: "Aquavital Perlonvatta 100g",
      quantity: 1,
      total: 1000,
      metadata: {},
    },
    {
      id: "i2",
      title: "Utánvét kezelési díj",
      product_title: null,
      quantity: 1,
      total: 450,
      metadata: { acropora_line_item_kind: "fee" },
    },
  ],
  shipping_methods: [{ name: "GLS házhozszállítás", total: 3500 }],
  shipping_address: {
    first_name: "P5",
    last_name: "Teszt",
    address_1: "Minta utca 12.",
    postal_code: "1111",
    city: "Budapest",
  },
  billing_address: {
    first_name: "P5",
    last_name: "Teszt",
    address_1: "Minta utca 12.",
    postal_code: "1111",
    city: "Budapest",
    company: null,
    metadata: {},
  },
  payment_collections: [
    { payments: [], payment_sessions: [{ provider_id: "pp_acropora_cod" }] },
  ],
} as never

const ALLAPOT = {
  order_id: "order_1",
  status: "pending_processing",
  label: "Feldolgozásra vár",
  updated_at: "x",
}

/**
 * A RENDELES RESZLETEI (249:96). MI PIROSIT: ha a fej nem a rendelesszamot,
 * az allapotot es a fizetesi modot mutatja; ha a dijsor a Tételek koze kerul;
 * ha a vegosszeg "Fizetett"-nek mondja a fizetesre varo rendelest; ha a
 * kerdes-link nem a bolt cimere, a rendelesszammal megy; ha allapot nelkul
 * a lap elesik.
 */
describe("a rendelés részletei", () => {
  it("a fej: szám, állapot, dátum, fizetési mód, végösszeg, fizetési állapot", () => {
    render(<RendelesReszletek rendeles={RENDELES} allapot={ALLAPOT} />)
    expect(screen.getByTestId("rendeles-szam").textContent).toBe("#1")
    expect(screen.getAllByTestId("rendeles-allapot")[0].textContent).toBe(
      "Feldolgozásra vár",
    )
    const sor = screen.getByTestId("rendeles-fej-sor").textContent ?? ""
    expect(sor).toContain("2026. szeptember 29.")
    expect(sor).toContain("Utánvét")
    expect(sor).toMatch(/4\s?950/)
    expect(sor).toContain("fizetésre vár")
  })

  it("a Tételek a terméket mutatja, a díjat nem; a Teljesítés a szállítási módot és címet", () => {
    render(<RendelesReszletek rendeles={RENDELES} allapot={ALLAPOT} />)
    const tetelek = screen.getByTestId("rendeles-tetelek")
    expect(within(tetelek).getAllByRole("listitem")).toHaveLength(1)
    expect(tetelek.textContent).toContain("Aquavital Perlonvatta 100g")
    expect(tetelek.textContent).not.toContain("Utánvét kezelési díj")
    const teljesites = screen.getByTestId("rendeles-teljesites")
    expect(teljesites.textContent).toContain("GLS házhozszállítás")
    expect(teljesites.textContent).toContain(
      "Szállítási cím: 1111 Budapest, Minta utca 12.",
    )
  })

  it("az összesítő a díjjal és Végösszeggel, nem Fizetett összeggel", () => {
    render(<RendelesReszletek rendeles={RENDELES} allapot={ALLAPOT} />)
    const osszesites =
      screen.getByTestId("rendeles-osszesites").textContent ?? ""
    expect(osszesites).toContain("Utánvét kezelési díj")
    expect(osszesites).toContain("Végösszeg")
    expect(osszesites).not.toContain("Fizetett összeg")
  })

  it("a kérdés a bolt címére megy, a rendelésszámmal; vissza a Rendeléseimhez", () => {
    render(<RendelesReszletek rendeles={RENDELES} allapot={ALLAPOT} />)
    expect(screen.getByTestId("rendeles-kerdes").getAttribute("href")).toBe(
      "mailto:webshop@acropora.hu?subject=Rendel%C3%A9s%20%231",
    )
    expect(
      screen.getByTestId("vissza-rendelesekhez").getAttribute("href"),
    ).toBe("/hu/account/orders")
  })

  it("állapot nélkül is áll, címke nélkül", () => {
    render(<RendelesReszletek rendeles={RENDELES} allapot={null} />)
    expect(screen.getByTestId("rendeles-szam")).toBeTruthy()
    expect(screen.queryByTestId("rendeles-allapot")).toBeNull()
  })
})
