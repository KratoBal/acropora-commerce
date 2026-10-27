import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  SAJAT_HIVATKOZASOK,
  CEG,
  REGI_BOLT_HIVATKOZASOK,
} from "@modules/layout/templates/footer/hivatkozasok"

import { ElerhetosegekLap, telHref } from "./elerhetosegek-lap"

afterEach(cleanup)

/**
 * AZ ELERHETOSEGEK OLDALA (audit P1/11). MI PIROSIT: ha az oldal mas adatot
 * mutat, mint a lablec (a ceg-adat ket helyen allna); ha a telefon nem
 * kattinthato vagy rossz `tel:` cimet kap (a `/` es a kotojel benne marad); ha az
 * e-mail nem `mailto:`; ha a nyitvatartas sorai kiesnek; ha a lablec
 * "Elérhetőségek" linkje ismet a regi boltra mutat.
 */
describe("az Elérhetőségek oldal", () => {
  it("a lábléc céges adatait mutatja, kattintható telefonnal és e-maillel", () => {
    render(<ElerhetosegekLap cim="Elérhetőségek" />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Elérhetőségek",
    )
    expect(screen.getByTestId("elerhetoseg-cim").textContent).toBe(CEG.cim)
    const tel = screen.getByTestId("elerhetoseg-telefon") as HTMLAnchorElement
    expect(tel.textContent).toBe(CEG.telefon)
    expect(tel.getAttribute("href")).toBe("tel:+36202676801")
    const mail = screen.getByTestId("elerhetoseg-email") as HTMLAnchorElement
    expect(mail.getAttribute("href")).toBe(`mailto:${CEG.email}`)
    const sorok = screen
      .getByTestId("elerhetoseg-nyitvatartas")
      .querySelectorAll("li")
    expect(Array.from(sorok).map((s) => s.textContent)).toEqual([
      ...CEG.nyitvatartas,
    ])
  })

  it("a tel: cím csak a számjegyeket és a + jelet tartja meg", () => {
    expect(telHref("+36-20/267-6801")).toBe("tel:+36202676801")
    expect(telHref("06 1 234 5678")).toBe("tel:0612345678")
  })

  it("a lábléc Elérhetőségek linkje saját oldalra visz, nem a régi boltra", () => {
    const sajat = SAJAT_HIVATKOZASOK.find((h) => h.cimke === "Elérhetőségek")
    expect(sajat?.cim).toBe("/elerhetosegek")
    expect(sajat?.oszlop).toBe("informaciok")
    expect(
      REGI_BOLT_HIVATKOZASOK.some((h) => h.cimke === "Elérhetőségek"),
    ).toBe(false)
  })
})
