import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import ZaroSor from "./zarosor"

afterEach(cleanup)

/**
 * AZ ASZTALI ZAROSOR ALLITASAI.
 *
 * A tervben KET also elem all, es soha nem egyszerre: a mobil RAGADO sav
 * (cimke, ar, gomb) es ez az asztali zarosor (belyegkep, nev, keszlet-sor, ar,
 * gomb). A ket komponens `lg:hidden` illetve `hidden lg:flex`.
 *
 * A HALO HATARA: a jsdom nem szamol elrendezest, tehat itt az OSZTALYOKAT es a
 * SZERKEZETET merjuk, nem a latvanyt. A tenyleges meretek a kiszolgalt lapon
 * mérhetok (`scripts/asztali-zarosor-terv.cjs` a tervoldalon,
 * `scripts/telepites-utani-markerek.cjs` a mienken).
 */
describe("az asztali zárósor", () => {
  const teljes = (
    <ZaroSor
      kepUrl="https://pelda.hu/kep.jpg"
      nev="Acropora tenuis · A-1042"
      cimke="Utolsó darab"
      ar={<span>24 900 Ft</span>}
      cselekves={<a href="#x">Kosárba</a>}
    />
  )

  it("a négy rész mind megjelenik", () => {
    render(teljes)

    expect(screen.getByTestId("zarosor-belyeg-kep")).toBeTruthy()
    expect(screen.getByTestId("zarosor-nev").textContent).toContain("A-1042")
    expect(screen.getByTestId("zarosor-cimke").textContent).toBe("Utolsó darab")
    expect(screen.getByTestId("zarosor-ar")).toBeTruthy()
    expect(screen.getByTestId("zarosor-cselekves")).toBeTruthy()
  })

  /**
   * A KET ALSO ELEM SOHA NEM LATSZIK EGYSZERRE. Ez a fele: a zarosor MOBILON
   * rejtve van. A masik felet a `ragados-sav.component.spec` meri (`lg:hidden`).
   */
  it("mobilon nem látszik", () => {
    render(teljes)

    const kod = screen.getByTestId("zarosor").className
    expect(kod).toMatch(/(^|\s)hidden(?![-\w])/)
    expect(kod).toMatch(/lg:flex(?![-\w])/)
  })

  /**
   * A TERVBELI MERETEK, MERVE (2026-09-10, a tervfajl 1440 pixeles kereteiben):
   * belso margo 20px 44px, koz 20px, a gomb 50 magas.
   */
  it("a tervbeli belső margót és közt viseli", () => {
    render(teljes)

    const kod = screen.getByTestId("zarosor").className
    expect(kod).toMatch(/px-11(?![-\w])/)
    expect(kod).toMatch(/py-5(?![-\w])/)
    expect(kod).toMatch(/gap-5(?![-\w])/)
  })

  /**
   * A BELYEGKEP HELYE AKKOR IS MEGVAN, HA NINCS KEP -- kulonben a sor
   * geometriaja termekenkent ugralna. A tervben 48x48, lekerekites nelkul.
   */
  it("kép nélkül is megmarad a bélyegkép helye", () => {
    render(<ZaroSor nev="Valami" ar={<span>1 Ft</span>} />)

    const hely = screen.getByTestId("zarosor-belyeg")
    expect(hely).toBeTruthy()
    expect(hely.className).toMatch(/h-12(?![-\w])/)
    expect(hely.className).toMatch(/w-12(?![-\w])/)
    expect(screen.queryByTestId("zarosor-belyeg-kep")).toBeNull()
  })

  /**
   * TARTALOM NELKUL NINCS SOR. Egy ures zarosor a lap aljan nem "meg nincs
   * kesz", hanem egy csik a semmirol.
   */
  it("tartalom nélkül nem rajzolódik ki", () => {
    render(<ZaroSor />)

    expect(screen.queryByTestId("zarosor")).toBeNull()
  })

  /**
   * A TOKENEK NEVE, NEM AZ ERTEKE. Az erteket a `terv-tokenek.spec` allitja.
   * A hatter a HALVANY felulet (a tervben 0.205 soteten), a keret a
   * `--terv-keret`, a masodik sor a halvany szoveg.
   */
  it("a tervbeli tokeneket viseli", () => {
    render(teljes)

    expect(screen.getByTestId("zarosor").className).toContain(
      "bg-[var(--terv-hatter-halvany)]",
    )
    expect(screen.getByTestId("zarosor").style.borderColor).toBe(
      "var(--terv-keret)",
    )
    expect(screen.getByTestId("zarosor-cimke").style.color).toBe(
      "var(--terv-szoveg-halvany)",
    )
  })
})
