import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { VasarlasKontextus } from "./kontextus"
import { EgysegarSor, egysegarVaz } from "./egysegar-sor"

afterEach(cleanup)

/**
 * AZ EGYSEGAR-SOR A TERMEKLAPON (audit P1/3). MI PIROSIT: ha a sor kitalalt
 * egysegarat mutat bizonytalan nevhez; ha tobbvaltozatu termeken valtozat-
 * valasztas nelkul is megjelenik; ha az ar nem a kivalasztott valtozate (vagy
 * nem az akcios); ha a kontextus nelkuli lap hibat dob.
 */
const valtozat = (id: string, ar: number, opciok: string[] = []) => ({
  id,
  options: opciok.map((value) => ({ value })),
  calculated_price: {
    calculated_amount: ar,
    original_amount: ar,
    currency_code: "huf",
    calculated_price: { price_list_type: "default" },
  },
})
const termek = (cim: string, valtozatok: unknown[]) =>
  ({ id: "prod_1", title: cim, variants: valtozatok }) as never

describe("az egységár a vásárlási állapotból", () => {
  it("egyváltozatú terméken a név és az ár alapján számol", () => {
    const t = termek("Aquaforest Pro Bio F 25g", [valtozat("v1", 1250)])
    expect(egysegarVaz(t, undefined)?.ar).toBe(50000)
    expect(
      egysegarVaz(t, (t as never as { variants: never[] }).variants[0])?.ar,
    ).toBe(50000)
  })

  it("többváltozatú terméken változat nélkül nincs, a kiválasztottal a változat opcióját és árát használja", () => {
    const v1 = valtozat("v1", 1000, ["100 ml"])
    const v2 = valtozat("v2", 3000, ["250 ml"])
    const t = termek("Tápoldat", [v1, v2])
    expect(egysegarVaz(t, undefined)).toBeNull()
    expect(egysegarVaz(t, v2 as never)).toMatchObject({
      alap: "l",
      ar: 12000,
      kiszereles: "250 ml",
    })
    expect(egysegarVaz(t, v1 as never)).toMatchObject({ ar: 10000 })
  })

  it("bizonytalan név: nincs egységár", () => {
    const t = termek("Eledel 4x25g", [valtozat("v1", 1000)])
    expect(egysegarVaz(t, undefined)).toBeNull()
  })
})

describe("az egységár-sor", () => {
  const allapot = (t: unknown, v: unknown) =>
    ({ product: t, selectedVariant: v }) as never

  it("kiírja forintban, az alapegységgel", () => {
    const t = termek("Tengeri só 20 kg", [valtozat("v1", 20000)])
    render(
      <VasarlasKontextus.Provider
        value={allapot(t, (t as never as { variants: unknown[] }).variants[0])}
      >
        <EgysegarSor />
      </VasarlasKontextus.Provider>,
    )
    const sor = screen.getByTestId("vaz-egysegar")
    expect(sor.textContent).toMatch(/^Egységár: .*1\s?000.*Ft\/kg$/)
    expect(sor.getAttribute("data-kiszereles")).toBe("20 kg")
  })

  it("bizonytalan névnél és kontextus nélkül nincs sor", () => {
    const t = termek("Eledel 4x25g", [valtozat("v1", 1000)])
    const { container, rerender } = render(
      <VasarlasKontextus.Provider value={allapot(t, undefined)}>
        <EgysegarSor />
      </VasarlasKontextus.Provider>,
    )
    expect(container.firstChild).toBeNull()
    rerender(<EgysegarSor />)
    expect(container.firstChild).toBeNull()
  })
})
