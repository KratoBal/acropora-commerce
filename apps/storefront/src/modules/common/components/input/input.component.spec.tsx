import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import Input from "./index"

/**
 * A MEZO NEVE A CIMKEJEBOL (FE-9, axe `label`).
 *
 * MI PIROSIT: ha a `<label htmlFor>` es a mezo `id`-je szetcsuszik (a penztar
 * cim-urlapjan igy allt 8 mezo nev nelkul), vagy ha ket azonos `name`-u mezo
 * ugyanazt az `id`-t kapja.
 */
describe("az Input címkéje", () => {
  afterEach(cleanup)

  it("a címke a mezőt nevezi meg", () => {
    render(<Input name="shipping_address.first_name" label="Keresztnév" />)
    const mezo = screen.getByLabelText(/Keresztnév/)
    expect(mezo.tagName).toBe("INPUT")
    expect(mezo.getAttribute("name")).toBe("shipping_address.first_name")
  })

  it("két azonos nevű mező két különböző id-t kap", () => {
    render(
      <>
        <Input name="first_name" label="Szállítási név" />
        <Input name="first_name" label="Számlázási név" />
      </>,
    )
    const a = screen.getByLabelText(/Szállítási név/)
    const b = screen.getByLabelText(/Számlázási név/)
    expect(a).not.toBe(b)
    expect(a.id).not.toBe(b.id)
  })

  it("a hívó id-je elsőbbséget kap", () => {
    render(<Input name="email" id="sajat-email" label="E-mail" />)
    expect(screen.getByLabelText(/E-mail/).id).toBe("sajat-email")
  })
})
