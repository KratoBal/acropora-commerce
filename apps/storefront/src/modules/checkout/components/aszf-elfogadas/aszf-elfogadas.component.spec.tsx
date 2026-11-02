import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ADATKEZELES_CIM, ASZF_CIM } from "@lib/util/aszf"
import { MEGRENDEL_GOMB_FELIRAT } from "@lib/util/megrendeles"

import { useAszf } from "./index"
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

/**
 * A TESZT-MOD (Balazs, 2026-11-02 10:05 UTC). MI PIROSIT: ha teszt-modban a pipa
 * megmaradna (a gomb sosem lenne engedelyezve, vagy sajat ASZF-szoveg jelenne
 * meg); ha az eles cimen a teszt-mod bekapcsolna; ha ertek nelkul a pipa
 * eltunne.
 */
describe("a pénztár jogi sora teszt-módban", () => {
  afterEach(() => vi.unstubAllEnvs())

  function Allapot() {
    const { elfogadva } = useAszf()
    return <span data-testid="allapot">{String(elfogadva)}</span>
  }
  const kirak = () =>
    render(
      <AszfProvider>
        <AszfNegyzet />
        <Allapot />
      </AszfProvider>,
    )

  it("teszt kirakaton a pipa helyén a figyelmeztetés áll, és a gomb nem vár a pipára", () => {
    vi.stubEnv("NEXT_PUBLIC_LEGAL_GATE_MODE", "test")
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://shop-staging.acropora.hu")
    kirak()
    expect(screen.getByTestId("jogi-teszt-figyelmeztetes").textContent).toBe(
      "Teszt kirakat: a jogi dokumentumok az átálláskor a Fogyasztóbarátból jönnek.",
    )
    expect(screen.queryByTestId("aszf-pipa")).toBeNull()
    expect(screen.getByTestId("allapot").textContent).toBe("true")
  })

  it("az éles címen a pipa marad és kötelező, akkor is, ha a kapcsoló `test`", () => {
    vi.stubEnv("NEXT_PUBLIC_LEGAL_GATE_MODE", "test")
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://shop.acropora.hu")
    kirak()
    expect(screen.queryByTestId("jogi-teszt-figyelmeztetes")).toBeNull()
    expect(screen.getByTestId("aszf-pipa")).toBeTruthy()
    expect(screen.getByTestId("allapot").textContent).toBe("false")
  })

  it("érték nélkül a pipa marad", () => {
    vi.stubEnv("NEXT_PUBLIC_LEGAL_GATE_MODE", "")
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://shop-staging.acropora.hu")
    kirak()
    expect(screen.getByTestId("aszf-pipa")).toBeTruthy()
    expect(screen.queryByTestId("jogi-teszt-figyelmeztetes")).toBeNull()
  })
})
