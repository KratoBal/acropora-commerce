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

import SzoljHasonlo from "."

/*
  "SZÓLJ, HA JÖN HASONLÓ" URLAP (V2.4). MI PIROSIT: egy mezo neve nem az, amit a szerveroldali akcio olvas (a
  termek, a cim, a hozzajarulas, a nyelv); a latott hozzajarulas nem korall mondata, vagy a tajekoztato linkje
  nem az adatkezelesre visz; az angol lapon magyar szoveg.
*/
describe("SzoljHasonlo", () => {
  afterEach(cleanup)

  it("SZU-MEZOK: korall cime es szovege, a cim mezo, a rejtett termek es nyelv, a hozzajarulas a tajekoztato linkjevel", () => {
    const { container } = render(<SzoljHasonlo termekId="prod_sold" />)
    expect(
      screen.getByRole("heading", { name: "Szólj, ha jön hasonló" }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        "Add meg az e-mail címedet, és értesítünk, amikor ilyen fajt újra kapunk.",
      ),
    ).toBeTruthy()
    expect(screen.getByLabelText("E-mail cím").getAttribute("name")).toBe(
      "email",
    )
    expect(screen.getByRole("checkbox").getAttribute("name")).toBe("consent")
    const rejtett = (nev: string) =>
      container.querySelector<HTMLInputElement>(
        `input[type=hidden][name=${nev}]`,
      )?.value
    expect(rejtett("product_id")).toBe("prod_sold")
    expect(rejtett("locale")).toBe("hu")
    expect(screen.getByTestId("szolj-hasonlo-hozzajarulas").textContent).toBe(
      "Hozzájárulok, hogy erre a címre értesítést küldjetek erről a fajról.",
    )
    expect(
      screen.getByTestId("szolj-hasonlo-adatkezeles").getAttribute("href"),
    ).toBe("/jogi/adatkezeles")
    expect(
      screen.getByRole("button", { name: "Értesítést kérek" }),
    ).toBeTruthy()
  })

  it("SZU-ANGOL: az angol lapon angolul, es a nyelv angol", () => {
    const { container } = render(
      <SzoljHasonlo termekId="prod_sold" locale="en" />,
    )
    expect(screen.getByRole("button", { name: "Notify me" })).toBeTruthy()
    expect(screen.getByTestId("szolj-hasonlo-hozzajarulas").textContent).toBe(
      "I agree to be notified at this address about this species.",
    )
    expect(
      container.querySelector<HTMLInputElement>("input[name=locale]")?.value,
    ).toBe("en")
  })
})
