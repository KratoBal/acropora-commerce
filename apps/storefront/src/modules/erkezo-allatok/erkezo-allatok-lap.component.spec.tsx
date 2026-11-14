import { cleanup, render, screen, within } from "@testing-library/react"
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

import type { ArrivingAnimal } from "@lib/util/livestock-arrivals"

import ErkezoAllatokLap from "./erkezo-allatok-lap"

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V2.6 S4c, the arriving animals page). A kind not under its own heading, or in the wrong order; a name,
  day or stage missing; a day already past said as a date; a linked arrival with no link, or a link for one whose handle the
  shop did not give; the empty list drawing nothing instead of saying so; Hungarian text on the English page.
*/
const animal = (over: Partial<ArrivingAnimal> = {}): ArrivingAnimal => ({
  id: "la_1",
  kind: "FISH",
  label: "Acanthurus japonicus",
  expectedOn: "2026-11-20",
  stage: "ordered",
  productId: null,
  speciesKey: null,
  speciesBuyable: false,
  ...over,
})

describe("ErkezoAllatokLap", () => {
  it("draws the kinds under their headings in order, with the name, the day and the stage", () => {
    render(
      <ErkezoAllatokLap
        animals={[
          animal({ id: "c", kind: "CORAL", label: "Zoanthus" }),
          animal({ id: "f", stage: "in_transit" }),
        ]}
        handles={{}}
        ma="2026-11-10"
      />,
    )
    expect(screen.getByRole("heading", { name: "Érkező állatok" })).toBeTruthy()
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
    expect(headings).toEqual(["Halak", "Korallok"])
    const fish = screen.getByTestId("erkezo-FISH")
    expect(fish.textContent).toContain("Acanthurus japonicus")
    expect(fish.querySelector("[data-testid=erkezo-nap]")!.textContent).toBe(
      "Várható érkezés: 2026. november 20.",
    )
    expect(
      fish.querySelector("[data-testid=erkezo-allapot]")!.textContent,
    ).toBe("Úton van")
  })

  it("a day that has passed is not said as a date: the arrival is late", () => {
    render(
      <ErkezoAllatokLap animals={[animal()]} handles={{}} ma="2026-11-21" />,
    )
    expect(screen.getByTestId("erkezo-nap").textContent).toBe(
      "Az érkezés késik, új időpontot még nem tudunk mondani.",
    )
  })

  it("the day itself is still expected, not late", () => {
    render(
      <ErkezoAllatokLap animals={[animal()]} handles={{}} ma="2026-11-20" />,
    )
    expect(screen.getByTestId("erkezo-nap").textContent).toMatch(
      /Várható érkezés/,
    )
  })

  it("a linked arrival links to its product page when the shop gave the handle, and only then", () => {
    render(
      <ErkezoAllatokLap
        animals={[
          animal({ id: "a", productId: "prod_1" }),
          animal({ id: "b", productId: "prod_2", label: "Másik" }),
          animal({ id: "c", productId: null, label: "Kötetlen" }),
        ]}
        handles={{ prod_1: "japan-doktorhal" }}
        ma="2026-11-10"
      />,
    )
    const links = screen.getAllByTestId("erkezo-link")
    expect(links).toHaveLength(1)
    expect(links[0]!.getAttribute("href")).toBe("/termek/japan-doktorhal")
    expect(screen.getAllByTestId("erkezo-sor")).toHaveLength(3)
  })

  it("says so when there is nothing on its way", () => {
    render(<ErkezoAllatokLap animals={[]} handles={{}} ma="2026-11-10" />)
    expect(screen.getByTestId("erkezo-ures").textContent).toMatch(
      /Most nincs úton lévő állat/,
    )
    expect(screen.queryAllByTestId("erkezo-sor")).toHaveLength(0)
  })

  it("speaks English on the English page, the day included", () => {
    render(
      <ErkezoAllatokLap
        animals={[animal({ productId: "prod_1" })]}
        handles={{ prod_1: "x" }}
        ma="2026-11-10"
        locale="en"
      />,
    )
    expect(
      screen.getByRole("heading", { name: "Arriving animals" }),
    ).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Fish")
    expect(screen.getByTestId("erkezo-nap").textContent).toBe(
      "Expected: 20 November 2026",
    )
    expect(screen.getByTestId("erkezo-link").textContent).toBe(
      "View the product page",
    )
  })
})

describe("ErkezoAllatokLap: the species sign-up (S4c-2)", () => {
  it("only on a free row naming a species that cannot be bought now, with the switch; it sends the ROW's id, never a product", () => {
    render(
      <ErkezoAllatokLap
        animals={[
          animal({
            id: "la_free",
            label: "Amphiprion ocellaris",
            speciesKey: "amphiprion ocellaris",
          }),
          animal({
            id: "la_bound",
            label: "Acropora tenuis",
            speciesKey: "acropora tenuis",
            productId: "prod_1",
            kind: "CORAL",
          }),
          animal({
            id: "la_buyable",
            label: "Zebrasoma flavescens",
            speciesKey: "zebrasoma flavescens",
            speciesBuyable: true,
          }),
          animal({
            id: "la_group",
            label: "Zoanthus",
            speciesKey: null,
            kind: "CORAL",
          }),
        ]}
        handles={{}}
        ma="2026-11-10"
        feliratkozas
      />,
    )
    const forms = screen.getAllByTestId("erkezes-feliratkozas")
    expect(forms).toHaveLength(1)
    const form = forms[0]!
    expect(
      (form.querySelector('input[name="arrival_id"]') as HTMLInputElement)
        .value,
    ).toBe("la_free")
    expect(
      (form.querySelector('input[name="kind"]') as HTMLInputElement).value,
    ).toBe("species")
    expect(form.querySelector('input[name="product_id"]')).toBeNull()
    const row = screen
      .getAllByTestId("erkezo-sor")
      .find((r) => within(r).queryByText("Amphiprion ocellaris"))!
    expect(within(row).getByTestId("erkezes-feliratkozas")).toBeTruthy()
  })

  it("no sign-up without the switch", () => {
    render(
      <ErkezoAllatokLap
        animals={[animal({ speciesKey: "acanthurus japonicus" })]}
        handles={{}}
        ma="2026-11-10"
      />,
    )
    expect(screen.queryByTestId("erkezes-feliratkozas")).toBeNull()
  })
})
