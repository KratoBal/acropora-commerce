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

import type { ErkezoAllat } from "@lib/util/erkezo-allatok"
import { ErkezoAllatokLap } from "./erkezo-allatok-lap"

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V2.6 S4c, the page). A day already past said as a date; the kind, name or state missing; a bound row not
  linked to its product page; the sign-up drawn without the switch, on a bound row, or not sending the ROW's id; an empty list
  without its sentence.
*/
const sor = (felul: Partial<ErkezoAllat> = {}): ErkezoAllat => ({
  id: "lvarr_1",
  fajta: "FISH",
  nev: "Amphiprion ocellaris",
  nap: "2026-11-20",
  allapot: "ORDERED",
  termekId: null,
  fajKulcs: "amphiprion ocellaris",
  fajKaphato: false,
  ...felul,
})

describe("ErkezoAllatokLap", () => {
  it("lists kind, name, day and state; links a bound row; says a late day as late; the sign-up only on the free species row with the switch, sending the row's id", () => {
    render(
      <ErkezoAllatokLap
        cim="Érkező állatok"
        sorok={[
          sor(),
          sor({
            id: "lvarr_2",
            fajta: "CORAL",
            nev: "Acropora tenuis",
            termekId: "prod_1",
            allapot: "IN_TRANSIT",
            nap: "2026-11-01",
          }),
        ]}
        handleOf={{ prod_1: "acropora-tenuis-kek" }}
        ma="2026-11-10"
        feliratkozas
      />,
    )
    const [elso, masodik] = screen.getAllByTestId("erkezo-allat")
    expect(within(elso!).getByText("Hal")).toBeTruthy()
    expect(within(elso!).getByTestId("erkezo-allat-nap").textContent).toBe(
      "Várható érkezés: 2026. november 20.",
    )
    expect(within(elso!).getByText("Megrendelve")).toBeTruthy()
    const urlap = within(elso!).getByTestId("erkezes-feliratkozas")
    expect(
      (urlap.querySelector('input[name="arrival_id"]') as HTMLInputElement)
        .value,
    ).toBe("lvarr_1")
    expect(
      (urlap.querySelector('input[name="kind"]') as HTMLInputElement).value,
    ).toBe("species")
    expect(urlap.querySelector('input[name="product_id"]')).toBeNull()
    expect(within(masodik!).getByText("Korall")).toBeTruthy()
    expect(
      within(masodik!)
        .getByRole("link", { name: "Acropora tenuis" })
        .getAttribute("href"),
    ).toBe("/termek/acropora-tenuis-kek")
    expect(
      within(masodik!).getByTestId("erkezo-allat-nap").textContent,
    ).toMatch(/késik/)
    expect(within(masodik!).getByText("Úton van")).toBeTruthy()
    expect(within(masodik!).queryByTestId("erkezes-feliratkozas")).toBeNull()
  })

  it("no sign-up without the switch; an empty list says so", () => {
    const { rerender } = render(
      <ErkezoAllatokLap
        cim="Érkező állatok"
        sorok={[sor()]}
        handleOf={{}}
        ma="2026-11-10"
        feliratkozas={false}
      />,
    )
    expect(screen.queryByTestId("erkezes-feliratkozas")).toBeNull()
    rerender(
      <ErkezoAllatokLap
        cim="Érkező állatok"
        sorok={[]}
        handleOf={{}}
        ma="2026-11-10"
        feliratkozas
      />,
    )
    expect(screen.getByTestId("erkezo-allatok-ures")).toBeTruthy()
  })
})
