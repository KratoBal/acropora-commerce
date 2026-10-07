import { describe, expect, it } from "vitest"

import { orszagAtiranyitasKod } from "./orszag-atiranyitas"

/**
 * AZ ORSZAGKOD NELKULI UT: 301, HA A CEL MINDENKINEK UGYANAZ (FE-6).
 *
 * MI PIROSIT: ha egy orszagnal nem 301 jon (a mai teszt kirakat esete, ahol a
 * keresonek vegleges atiranyitast kell latnia), vagy ha tobb orszagnal 301 jon
 * (akkor a cel latogatofuggo, es a vegleges atiranyitast a bongeszo megjegyezne).
 */
describe("az országkód nélküli út átirányítása", () => {
  it("egy ország: 301", () => {
    expect(orszagAtiranyitasKod(1)).toBe(301)
  })

  it("több ország, vagy üres régió-térkép: 307", () => {
    expect(orszagAtiranyitasKod(2)).toBe(307)
    expect(orszagAtiranyitasKod(0)).toBe(307)
  })
})
