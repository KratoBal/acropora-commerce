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

  it("a Kosár szó kis méreten rejtve áll, lg-től látszik", () => {
    const { container } = render(<KosarLink darab={3} />)

    const szo = szoSpanja(container)

    /* ISMERT POZITIV KONTROLL: a szo egyaltalan ki van rajzolva. */
    expect(szo).toBeTruthy()

    expect(szo!.className).toContain("hidden")
    expect(szo!.className).toContain("lg:inline")
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
    expect(link.textContent).toContain("·")
    expect(link.textContent).not.toContain("Cart (")
    expect(link.textContent).not.toContain("(2)")
  })

  /**
   * A GOMB GEOMETRIAJA A TERVBOL -- SZINTEN ATKOLTOZOTT ALLITAS.
   *
   * A kosar-gomb a keresovel AZONOS magassagu (46 pixel), es a tervben is igy
   * all: a ket elem egy vonalban zar. A 20 pixeles belso margo (`px-5`)
   * ugyanabbol a bejarasbol jon.
   */
  it("a gomb magassága és belső margója a tervből", () => {
    render(<KosarLink darab={0} />)

    const link = screen.getByTestId("nav-cart-link")

    expect(link.className).toContain("h-[46px]")
    expect(link.className).toContain("px-5")
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
