import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

import NemLetezoOldal from "./page"

/**
 * A MINDENT ELKAPO OLDAL (2026-11-19). MI PIROSIT: ha egy ismeretlen cim nem 404-et adna
 * (megjelenne valami, vagy 200 lenne az allapot); ha az oldal kikerulne a (main)
 * csoportbol (akkor a gyoker keret nelkuli not-found-ja jonne megint, nem a bolt kerete).
 */
describe("az ismeretlen cim kezelese", () => {
  it("notFound-ot dob: 404, a (main) not-found-ja", () => {
    expect(() => NemLetezoOldal()).toThrow("NEXT_NOT_FOUND")
  })

  it("a (main) csoportban all, ahol a fejlec es a lablec is van", () => {
    expect(__dirname).toContain("(main)")
    expect(__dirname).toContain("[countryCode]")
  })
})
