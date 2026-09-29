import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { KosarLink, kosarFelirat } from "./kosar-link"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

/**
 * A MOBIL FEJLEC CSAK A SZAMOT MUTATJA.
 *
 * A tervlap mobil kerete (390 pixel) nem a "Kosár · N" rovidebb valtozatat
 * adja, hanem CSAK A SZAMOT: a "Kosár" szo eltunik. Asztalin ott all.
 *
 * NEGY FUGGETLEN ERTEK, NEGY NEV: hogy a szam MINDIG latszik; hogy a szo a
 * kis mereten REJTVE all; hogy a felolvaso MINDKET mereten teljes mondatot
 * kap; es hogy a nav tartaleka nem egy MASODIK masolat.
 */
describe("a kosár-hivatkozás a fejlécben", () => {
  const szoSpanja = (c: HTMLElement) =>
    Array.from(c.querySelectorAll("span")).find((s) =>
      (s.textContent ?? "").includes("Kosár"),
    )

  it("a szám minden méretben látszik", () => {
    const { container } = render(<KosarLink darab={3} />)

    const szam = Array.from(container.querySelectorAll("span")).find(
      (s) => (s.textContent ?? "").trim() === "3",
    )

    expect(szam).toBeTruthy()
    expect(szam!.className).not.toContain("hidden")
  })

  it("a Kosár szó kis méreten rejtve áll, a fejléc töréspontjától (small) látszik", () => {
    const { container } = render(<KosarLink darab={3} />)

    const szo = szoSpanja(container)

    /* ISMERT POZITIV KONTROLL: a szo egyaltalan ki van rajzolva. */
    expect(szo).toBeTruthy()

    expect(szo!.className).toContain("hidden")
    expect(szo!.className).toContain("small:inline")
  })

  /**
   * A FELOLVASO MINDKET MERETEN TELJES MONDATOT KAP.
   *
   * Enelkul a mobil alak egy magaban allo szam lenne, aminek semmi nem mondja
   * meg a jelenteset. A szoveges reszek `aria-hidden`-ek, tehat a nev
   * KIZAROLAG az `aria-label`-bol jon -- kulonben a felolvaso a szot es a
   * szamot ketszer hallana.
   */
  it("a felolvasó teljes mondatot kap, a látható szövegtől függetlenül", () => {
    render(<KosarLink darab={3} />)

    const link = screen.getByTestId("nav-cart-link")

    expect(link.getAttribute("aria-label")).toBe("Kosár · 3")
    expect(link.getAttribute("aria-label")).toBe(kosarFelirat(3))

    for (const span of Array.from(link.querySelectorAll("span"))) {
      expect(span.getAttribute("aria-hidden")).toBe("true")
    }
  })

  /**
   * A FELIRAT MAGYAR, A TERV ALAKJABAN -- ATKOLTOZOTT ALLITAS.
   *
   * Eddig a `nav.spec.ts` merte, a `cart-dropdown/index.tsx` SZOVEGEN. Amikor
   * a gomb ide kerult, az az allitas pirosra ment, es helyesen: a pozitiv
   * kontrollja sult el. A fajlnev atirasa helyett renderelesre allt at, mert
   * mostantol VAN kozos renderelheto hely.
   *
   * A tagadas is atjott: eddig `Cart (0)` allt itt, angolul, a lap legjobban
   * lathato pontjan. A kozeppont a terv alakja, nem zarojel.
   */
  it("a felirat magyar, a terv alakjában", () => {
    render(<KosarLink darab={2} />)
    const link = screen.getByTestId("nav-cart-link")

    expect(link.textContent).toContain("Kosár")
    // P1b: a Figma alakja "Kosár 0" (234:38, 201:7), pont nelkul.
    expect(link.textContent?.replace(/\s+/g, " ").trim()).toBe("Kosár 2")
    expect(link.textContent).not.toContain("Cart (")
    expect(link.textContent).not.toContain("(2)")
  })

  /**
   * A FELIRAT GEOMETRIAJA A FIGMABOL (P1b, 2026-09-29). Korabban itt a regi
   * terv 46 pixeles, kitoltott gombja allt; a Figma fejlec-frame-jeiben a kosar
   * egy felirat: 13 pixel, a mod cimszineben, asztalon 600-as, mobilon 500-as
   * sulyban (234:38, 201:7; 196:10, 226:129). Doboz nincs.
   */
  it("a felirat mérete, színe és súlya a Figmából", () => {
    render(<KosarLink darab={0} />)

    const link = screen.getByTestId("nav-cart-link")

    expect(link.className).toContain("text-[13px]")
    expect(link.className).toContain("text-acr-mode-heading")
    expect(link.className).toContain("font-medium")
    expect(link.className).toContain("small:font-semibold")
    expect(link.className).not.toContain("h-[46px]")
  })

  /**
   * A NAV TARTALEKA NEM MASODIK MASOLAT.
   *
   * Korabban ket helyen allt betuere ugyanaz a gomb: itt a valodi
   * darabszammal, a `nav/index.tsx` `Suspense` tartalekaban nullaval. Ket
   * masolat ugyanarra elcsuszik, es itt a csuszas RITKAN latszana -- a
   * tartalek csak a betoltes elso pillanataiban all a lapon, tehat a mobil
   * alak hianya ott hetekig eszrevetlen maradhatna.
   *
   * A MEGJEGYZESEKET KISZEDJUK, kulonben a sajat magyarazo szovegunk lenne a
   * talalat: a fenti bekezdes maga is leirja a keresett szot.
   */
  it("a nav Suspense-tartaléka ezt a komponenst használja, nem másolatot", () => {
    const nyers = readFileSync(
      join(__dirname, "..", "..", "templates", "nav", "index.tsx"),
      "utf-8",
    )
    const kodSzoveg = nyers
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")

    /* ISMERT POZITIV KONTROLL: tenyleg a navot olvastuk be. */
    expect(kodSzoveg).toContain("KosarLink")

    expect(kodSzoveg).not.toContain("Kosár")
  })
})
