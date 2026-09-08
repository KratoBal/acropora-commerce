import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import CartLineState, { NotIncrementable } from "./index"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

/**
 * A KOSARSOR HAROM ALLAPOTANAK KIRAJZOLASA.
 *
 * A dontest a `line-state.ts` meri; itt az all, hogy a vevo mit LAT. A ketto
 * kulon hiba lehet, es a masodik csendes: a dontes helyes marad, mikozben a
 * lapon nem latszik semmi.
 */
describe("a kosársor állapotának kirajzolása", () => {
  /**
   * AZ ISMERT POZITIV KONTROLL AZ ELSO ALLITAS: enelkul a "NORMAL semmit nem
   * rajzol" allitas egy olyan dobozon is zold lenne, ami SOHA nem rajzol
   * semmit.
   */
  it("EGYEDI állapotban ott a jelvény és az ígéret-mondat", () => {
    render(<CartLineState state="EGYEDI" similarHref="/store" />)

    expect(screen.getByTestId("cart-line-egyedi")).toHaveTextContent(
      "1 db · Egyedi",
    )
    expect(
      screen.getByText(/A fotón pontosan ezt a példányt látod/),
    ).toBeTruthy()
  })

  it("NORMAL állapotban semmi nem kerül a sorba", () => {
    const { container } = render(
      <CartLineState state="NORMAL" similarHref="/store" />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  /**
   * AZ ELKELT SORBAN KET DOLOG KELL, ES A MASODIK A LENYEG: a vevonek nem elég
   * megtudnia, hogy elkelt -- kapnia kell egy utat tovabb. Es az igeret-mondat
   * NEM allhat ott: az egy megvehető peldanyrol beszelne.
   */
  it("ELKELT állapotban továbbvivő hivatkozás áll, ígéret-mondat nélkül", () => {
    render(<CartLineState state="ELKELT" similarHref="/collections/wysiwyg" />)

    expect(screen.getByTestId("cart-line-elkelt")).toHaveTextContent("Elkelt")
    expect(
      screen.getByRole("link", { name: /Hasonló példányok/ }),
    ).toHaveAttribute("href", "/hu/collections/wysiwyg")
    expect(screen.queryByText(/ez kerül a kosaradba/)).toBeNull()
  })

  it("az egyedi példány mennyisége nem növelhető, és ezt ki is mondja", () => {
    render(<NotIncrementable />)

    expect(screen.getByTestId("cart-line-nem-novelheto")).toHaveTextContent(
      "Nem növelhető",
    )
  })
})
