// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

/*
  AZ ELRENDEZES NEM OLVAS SUTIT (FE-7, Balazs 2026-10-07 07:44 UTC). Az
  elrendezes minden publikus lap folott all: ha itt egyszer `cookies()` fut
  (a vevo vagy a kosar lekerese miatt), az OSSZES lap dinamikus lesz, es a
  valasz `private, no-store`. Merve elotte a teszt kirakaton: mind a tiz
  laptipus ilyen volt.

  MI PIROSIT: az elrendezes ujra lekeri a kosarat vagy a vevot, vagy barmi mast,
  ami sutit olvas.
*/
const suti = vi.hoisted(() => ({ olvasasok: 0 }))
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => {
    suti.olvasasok++
    return { get: () => undefined }
  },
  headers: async () => {
    suti.olvasasok++
    return new Headers()
  },
}))

const adat = vi.hoisted(() => ({
  retrieveCart: vi.fn(async () => null),
  retrieveCustomer: vi.fn(async () => null),
}))
vi.mock("@lib/data/cart", () => ({ retrieveCart: adat.retrieveCart }))
vi.mock("@lib/data/customer", () => ({
  retrieveCustomer: adat.retrieveCustomer,
}))
vi.mock("@modules/layout/templates/aruhaz-keret", () => ({
  default: () => null,
}))

import AruhazKeret from "@modules/layout/templates/aruhaz-keret"
import KezdolapElrendezes from "../(kezdolap)/layout"
import PageLayout from "./layout"

describe("a publikus elrendezés", () => {
  it("se kosarat, se vevőt nem kér le, és sütit nem olvas", async () => {
    await PageLayout({
      children: null,
      params: Promise.resolve({ countryCode: "hu" }),
    })

    expect(adat.retrieveCart).not.toHaveBeenCalled()
    expect(adat.retrieveCustomer).not.toHaveBeenCalled()
    expect(suti.olvasasok).toBe(0)
  })

  /*
    A KEZDOLAP ES A TOBBI LAP UGYANAZT A KERETET KAPJA (Balazs, 2026-10-26:
    "minden aloldalon a kezdolap fejlece es lablece"). MI PIROSIT: ha valamelyik
    elrendezes ujra sajat vazat epit (a regi fejleccel), mert akkor a ketto
    megint szetcsuszik; vagy ha az orszagkod nem jut el a keretig.
  */
  it("a kezdőlap és a többi lap ugyanazt a keretet hívja, az országkóddal", async () => {
    for (const Elrendezes of [PageLayout, KezdolapElrendezes]) {
      const elem = (await Elrendezes({
        children: "tartalom",
        params: Promise.resolve({ countryCode: "hu" }),
      })) as { type: unknown; props: Record<string, unknown> }
      expect(elem.type).toBe(AruhazKeret)
      expect(elem.props.countryCode).toBe("hu")
      expect(elem.props.children).toBe("tartalom")
    }
  })
})
