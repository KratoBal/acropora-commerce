import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/szolj-hasonlo", () => ({
  szoljFeliratkozasAkcio: vi.fn(async () => ({ allapot: "kesz" })),
}))
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

import Erkezik from "."

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V2.6 S3b, the arrival on the product page). The day not said in the page's language, or a day already
  past said as a date; the stage missing or the wrong one; the notify form drawn without the switch (the caller decides) or
  missing with it; the form not for the PRODUCT (it would wait for any piece of the species, which is not what the page says),
  or showing the species sentence instead of the product's consent sentence; Hungarian text on the English page.
*/
const ordered = { expectedOn: "2026-11-13", stage: "ordered" as const }
const inTransit = { expectedOn: "2026-11-13", stage: "in_transit" as const }

describe("Erkezik", () => {
  it("says the expected day and the stage, and has no form without the switch", () => {
    render(
      <Erkezik
        erkezes={inTransit}
        termekId="prod_1"
        urlap={false}
        ma="2026-11-10"
      />,
    )
    expect(screen.getByRole("heading", { name: "Érkezik" })).toBeTruthy()
    expect(screen.getByTestId("erkezik-nap").textContent).toBe(
      "Várható érkezés: 2026. november 13.",
    )
    expect(screen.getByTestId("erkezik-allapot").textContent).toBe("Úton van")
    expect(screen.queryByTestId("szolj-hasonlo")).toBeNull()
  })

  it("says Megrendelve for the ordered stage", () => {
    render(
      <Erkezik
        erkezes={ordered}
        termekId="prod_1"
        urlap={false}
        ma="2026-11-10"
      />,
    )
    expect(screen.getByTestId("erkezik-allapot").textContent).toBe(
      "Megrendelve",
    )
  })

  it("a day that has passed is not said as a date: the arrival is late, and no new day is promised", () => {
    render(
      <Erkezik
        erkezes={ordered}
        termekId="prod_1"
        urlap={false}
        ma="2026-11-14"
      />,
    )
    expect(screen.getByTestId("erkezik-nap").textContent).toBe(
      "Az érkezés késik, új időpontot még nem tudunk mondani.",
    )
    expect(screen.getByTestId("erkezik-nap").textContent).not.toMatch(/2026/)
  })

  it("with the switch draws the notify form FOR THE PRODUCT: the hidden kind, the product's own texts and consent sentence", () => {
    const { container } = render(
      <Erkezik erkezes={ordered} termekId="prod_1" urlap ma="2026-11-10" />,
    )
    const rejtett = (nev: string) =>
      container.querySelector<HTMLInputElement>(
        `input[type=hidden][name=${nev}]`,
      )?.value
    expect(rejtett("kind")).toBe("product")
    expect(rejtett("product_id")).toBe("prod_1")
    expect(
      screen.getByRole("heading", { name: "Értesíts, ha megérkezik" }),
    ).toBeTruthy()
    expect(screen.getByTestId("szolj-hasonlo-hozzajarulas").textContent).toBe(
      "Hozzájárulok, hogy erre a címre értesítést küldjetek erről a termékről.",
    )
    expect(screen.queryByText(/erről a fajról/)).toBeNull()
  })

  it("on a product that can be ordered now it says so, in the day's line, and a late arrival too", () => {
    const { rerender } = render(
      <Erkezik
        erkezes={ordered}
        termekId="prod_1"
        urlap={false}
        rendelheto
        ma="2026-11-10"
      />,
    )
    expect(screen.getByTestId("erkezik-nap").textContent).toBe(
      "Rendelhető, várható érkezés: 2026. november 13.",
    )
    rerender(
      <Erkezik
        erkezes={ordered}
        termekId="prod_1"
        urlap={false}
        rendelheto
        ma="2026-11-14"
      />,
    )
    expect(screen.getByTestId("erkezik-nap").textContent).toBe(
      "Rendelhető, de az érkezés késik, új időpontot még nem tudunk mondani.",
    )
    expect(screen.getByTestId("erkezik-nap").textContent).not.toMatch(/2026/)
  })

  it("the orderable wording is not the default: without the flag the line is the plain one", () => {
    render(
      <Erkezik
        erkezes={ordered}
        termekId="prod_1"
        urlap={false}
        ma="2026-11-10"
      />,
    )
    expect(screen.getByTestId("erkezik-nap").textContent).not.toMatch(
      /Rendelhető/,
    )
  })

  it("speaks English on the orderable line too", () => {
    render(
      <Erkezik
        erkezes={ordered}
        termekId="prod_1"
        urlap={false}
        rendelheto
        ma="2026-11-10"
        locale="en"
      />,
    )
    expect(screen.getByTestId("erkezik-nap").textContent).toBe(
      "Available to order, expected: 13 November 2026",
    )
  })

  it("speaks English on the English page, the day included", () => {
    render(
      <Erkezik
        erkezes={inTransit}
        termekId="prod_1"
        urlap
        ma="2026-11-10"
        locale="en"
      />,
    )
    expect(screen.getByRole("heading", { name: "Arriving" })).toBeTruthy()
    expect(screen.getByTestId("erkezik-nap").textContent).toBe(
      "Expected: 13 November 2026",
    )
    expect(screen.getByTestId("erkezik-allapot").textContent).toBe("On its way")
    expect(screen.getByTestId("szolj-hasonlo-hozzajarulas").textContent).toBe(
      "I agree to be notified at this address about this product.",
    )
  })
})
