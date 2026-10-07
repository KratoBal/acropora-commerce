import { readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ISMERT_LAP_SZAKASZOK,
  orszagAtiranyitasKod,
} from "./orszag-atiranyitas"

/**
 * AZ ORSZAGKOD NELKULI UT: 301, HA A CEL MINDENKINEK UGYANAZ ES LETEZO LAP (FE-6).
 *
 * MI PIROSIT: ha egy orszagnal egy ismert lapra nem 301 jon; ha tobb orszagnal
 * 301 jon; ha egy rossz orszagkodu vagy ismeretlen ut 301-et kap (a cel nem
 * letezik, es a kereso vegleg megjegyezne); ha a lap-szakaszok listaja elter a
 * `app/[countryCode]` alatti mappaktol.
 */
describe("az országkód nélküli út átirányítása", () => {
  it("egy ország, ismert lap vagy a gyökér: 301", () => {
    expect(orszagAtiranyitasKod(1, "/")).toBe(301)
    expect(orszagAtiranyitasKod(1, "/products/hanna-hi780")).toBe(301)
    expect(orszagAtiranyitasKod(1, "/categories/korallok/sps")).toBe(301)
  })

  it("több ország, vagy üres régió-térkép: 307", () => {
    expect(orszagAtiranyitasKod(2, "/products/x")).toBe(307)
    expect(orszagAtiranyitasKod(0, "/")).toBe(307)
  })

  it("rossz országkód vagy ismeretlen első szakasz: 307, nem végleges", () => {
    expect(orszagAtiranyitasKod(1, "/de/termek")).toBe(307)
    expect(orszagAtiranyitasKod(1, "/hu-/termek")).toBe(307)
    expect(orszagAtiranyitasKod(1, "/barmi")).toBe(307)
    expect(orszagAtiranyitasKod(1, "/_next/data/x/hu.json")).toBe(307)
  })

  it("a lap-szakaszok listája a kirakat mappáiból áll", () => {
    const gyoker = join(__dirname, "..", "..", "app", "[countryCode]")
    const mappak = readdirSync(gyoker, { withFileTypes: true })
      .filter((c) => c.isDirectory() && c.name.startsWith("("))
      .flatMap((csoport) =>
        readdirSync(join(gyoker, csoport.name), { withFileTypes: true })
          // a `%5F` mappa belso ut (`/_p`, `/_v`, `/_szurt`, FE-7 3. resz):
          // kivulrol 404, nem nyilvanos lap-szakasz (`belso-utvonalak.js`)
          .filter((m) => m.isDirectory() && !/^([([_@]|%5F)/.test(m.name))
          .map((m) => m.name),
      )
      .sort()
    expect(mappak.length).toBeGreaterThan(5)
    expect([...ISMERT_LAP_SZAKASZOK].sort()).toEqual(mappak)
  })
})
