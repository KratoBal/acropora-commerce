import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ADATKEZELES_CIM, ASZF_CIM } from "@lib/util/aszf"
import { MEGRENDEL_GOMB_FELIRAT } from "@lib/util/megrendeles"

import AszfNegyzet, { AszfProvider } from "./index"

afterEach(cleanup)

/**
 * A MEGRENDELES GOMBJA ES A PIPA (commerce-audit-p0, P0-1; Balazs 2026-10-27
 * 09:27 UTC). MI PIROSIT: ha a gomb felirata „Megrendel”-tol elterne anelkul,
 * hogy ez a spec vele mozdulna (a tobbi spec a konstanst hasznalja, ez az
 * egyetlen, ami a SZO SZERINTI felirat); ha a pipa szovege eltervel az UNAS
 * penztarabol vettol, vagy a ket kifejezes nem hivatkozas; ha a pipa nem
 * kotelezo.
 *
 * AMIT NEM MER: hogy a szerver is megallitja a pipa nelkuli leadast. Azt a
 * hatter `require-aszf-acceptance.unit.spec.ts` allitja.
 */
describe("a megrendelés gombja és a jelölőnégyzet szövege", () => {
  it("a gomb felirata szó szerint „Megrendel”", () => {
    expect(MEGRENDEL_GOMB_FELIRAT).toBe("Megrendel")
  })

  it("a pipa szövege szó szerint az UNAS pénztáráé", () => {
    render(
      <AszfProvider>
        <AszfNegyzet />
      </AszfProvider>,
    )
    expect(screen.getByTestId("aszf-negyzet").textContent).toBe(
      "Elfogadom az Általános szerződési feltételeket és az Adatkezelési tájékoztatót. Tudomásul veszem, hogy a megrendelés elküldése fizetési kötelezettséggel jár.",
    )
  })

  it("a két kifejezés hivatkozás a kirakat saját jogi oldalaira", () => {
    render(
      <AszfProvider>
        <AszfNegyzet />
      </AszfProvider>,
    )
    const aszf = screen.getByRole("link", {
      name: "Általános szerződési feltételeket",
    })
    const adat = screen.getByRole("link", { name: "Adatkezelési tájékoztatót" })
    expect(aszf).toHaveAttribute("href", ASZF_CIM)
    expect(adat).toHaveAttribute("href", ADATKEZELES_CIM)
    expect(screen.getAllByRole("link")).toHaveLength(2)
  })

  it("a pipa kötelező, és alapból nincs bejelölve", () => {
    render(
      <AszfProvider>
        <AszfNegyzet />
      </AszfProvider>,
    )
    const pipa = screen.getByTestId("aszf-pipa")
    expect(pipa).toBeRequired()
    expect(pipa).not.toBeChecked()
  })
})
