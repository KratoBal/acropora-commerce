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
vi.mock("@modules/layout/templates/nav", () => ({ default: () => null }))
vi.mock("@modules/layout/templates/footer", () => ({ default: () => null }))
vi.mock("@modules/layout/components/kosar-allapot", () => ({
  KosarAllapotProvider: () => null,
}))
vi.mock("@modules/layout/components/kosar-allapot/kosar-sziget", () => ({
  default: () => null,
}))

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
})
