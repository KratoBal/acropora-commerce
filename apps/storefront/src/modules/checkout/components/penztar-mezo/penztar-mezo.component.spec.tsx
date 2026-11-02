import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let orszagKod = "hu"
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszagKod }),
}))

import { PenztarGomb, PenztarMezo, PenztarOrszag } from "./index"

afterEach(cleanup)
beforeEach(() => {
  orszagKod = "hu"
})

/**
 * A PÉNZTÁR SAJÁT MEZŐI. Mit mér: a címke a mezőhöz kötött (felolvasó), a
 * kötelező jelölés, az ország neve a lap nyelvén (a régió rekordja egynyelvű),
 * a gomb állapota (a `loading` forgóval és `aria-busy`-val, a `disabled`
 * külön).
 */
describe("a pénztár mezői", () => {
  it("a címke a mezőt nevezi meg, a kötelező csillag a felolvasónak rejtve", () => {
    render(
      <PenztarMezo
        name="email"
        label="E-mail-cím"
        required
        autoComplete="email"
      />,
    )
    const mezo = screen.getByLabelText(/E-mail-cím/)
    expect(mezo.tagName).toBe("INPUT")
    expect(mezo).toBeRequired()
    expect(mezo.getAttribute("autocomplete")).toBe("email")
    expect(screen.getByText("*").getAttribute("aria-hidden")).toBe("true")
  })

  it("az országok neve a lap nyelvén áll", () => {
    const region = {
      id: "r",
      countries: [{ iso_2: "hu", display_name: "Hungary" }],
    } as never
    const { unmount } = render(
      <PenztarOrszag name="c" region={region} value="hu" onChange={() => {}} />,
    )
    expect(screen.getByRole("option", { name: "Magyarország" })).toBeTruthy()
    unmount()
    orszagKod = "en-hu"
    render(
      <PenztarOrszag name="c" region={region} value="hu" onChange={() => {}} />,
    )
    expect(screen.getByRole("option", { name: "Hungary" })).toBeTruthy()
    // a felirat és az első sor is a lap nyelvén: "Country"
    expect(screen.getAllByText("Country").length).toBeGreaterThan(0)
  })
})

describe("a pénztár gombja", () => {
  it("alapból nyomható, forgó nélkül", () => {
    render(<PenztarGomb type="button">Tovább</PenztarGomb>)
    const gomb = screen.getByRole("button", { name: "Tovább" })
    expect(gomb).toBeEnabled()
    expect(screen.queryByTestId("penztar-gomb-forgo")).toBeNull()
  })

  it("betöltés alatt letiltott, foglalt, és forgót mutat", () => {
    render(
      <PenztarGomb type="button" loading>
        Tovább
      </PenztarGomb>,
    )
    const gomb = screen.getByRole("button", { name: "Tovább" })
    expect(gomb).toBeDisabled()
    expect(gomb.getAttribute("aria-busy")).toBe("true")
    expect(screen.getByTestId("penztar-gomb-forgo")).toBeTruthy()
  })

  it("a disabled külön áll: letiltott, de nem foglalt, forgó nélkül", () => {
    render(
      <PenztarGomb type="button" disabled>
        Tovább
      </PenztarGomb>,
    )
    const gomb = screen.getByRole("button", { name: "Tovább" })
    expect(gomb).toBeDisabled()
    expect(gomb.getAttribute("aria-busy")).toBe("false")
    expect(screen.queryByTestId("penztar-gomb-forgo")).toBeNull()
  })
})
