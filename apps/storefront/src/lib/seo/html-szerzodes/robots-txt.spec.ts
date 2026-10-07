import { describe, expect, it } from "vitest"

import { robotsEngedi } from "./robots-txt"

/**
 * A robots.txt ERTELMEZO (FE-8). Erre epul a 4. pont tesztje: ha az ertelmezo
 * teved, a "a kereso nincs tiltva" allitas akkor is zold, ha tiltva van.
 *
 * MI PIROSIT: ha a hosszabb minta nem nyer; ha a `*` vagy a `$` nem ugy illeszt,
 * ahogy a Google; ha egy masik ugynok csoportja szamit bele.
 */
describe("robots.txt értelmezés", () => {
  it("a teljes tiltás mindent tilt, az üres Disallow semmit", () => {
    expect(robotsEngedi("User-agent: *\nDisallow: /", "/hu")).toBe(false)
    expect(robotsEngedi("User-agent: *\nDisallow:", "/hu")).toBe(true)
    expect(robotsEngedi("", "/hu")).toBe(true)
  })

  it("az út elejére illeszt, és a hosszabb minta nyer", () => {
    const txt = "User-agent: *\nDisallow: /hu/cart\nAllow: /hu/cart/info"
    expect(robotsEngedi(txt, "/hu/cart")).toBe(false)
    expect(robotsEngedi(txt, "/hu/cart?x=1")).toBe(false)
    expect(robotsEngedi(txt, "/hu/cart/info")).toBe(true)
    expect(robotsEngedi(txt, "/en/hu/cart")).toBe(true)
  })

  it("a * és a $ a Google szerint", () => {
    const txt = "User-agent: *\nDisallow: /*?q=\nDisallow: /*.pdf$"
    expect(robotsEngedi(txt, "/hu/store?q=hanna")).toBe(false)
    expect(robotsEngedi(txt, "/hu/store")).toBe(true)
    expect(robotsEngedi(txt, "/a.pdf")).toBe(false)
    expect(robotsEngedi(txt, "/a.pdf?x")).toBe(true)
  })

  it("egyenlő hossznál az Allow nyer", () => {
    const txt = "User-agent: *\nDisallow: /hu\nAllow: /hu"
    expect(robotsEngedi(txt, "/hu/x")).toBe(true)
  })

  it("a saját csoport felülírja a *-ot, a más ügynöké nem számít", () => {
    const txt =
      "User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nDisallow: /hu"
    expect(robotsEngedi(txt, "/hu")).toBe(true)
    expect(robotsEngedi(txt, "/hu", "bingbot")).toBe(false)
    expect(robotsEngedi(txt, "/hu", "duckduckbot")).toBe(false)
  })
})
