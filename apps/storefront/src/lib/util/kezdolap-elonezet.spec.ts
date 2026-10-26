import { describe, expect, it } from "vitest"

import {
  elonezetBekapcsolva,
  elonezetFejlecek,
  elonezetiUt,
  osOrigin,
} from "./kezdolap-elonezet"

/*
  AZ ELONEZETI UT KAPUJA. MI PIROSIT: ha a kapcsolo barmi mas ertekre is
  bekapcsol, mint a pontos `true`; ha a `frame-ancestors` joker, tobb cim vagy
  ervenytelen cim mellett is nyitva marad (a hiba a kerekeket ZARJA, nem nyitja);
  ha egy mas utvonal (a kezdolap maga, vagy egy hasonlo nevu) elonezeti ut
  fejleceket kap; ha a fejlec gyorsitotarazhato vagy indexelheto.
*/
describe("az előnézeti út kapuja", () => {
  it("csak a pontos true kapcsolja be", () => {
    expect(elonezetBekapcsolva({ HOMEPAGE_PREVIEW_ENABLED: "true" })).toBe(true)
    for (const rossz of [undefined, "", "1", "TRUE", "True", "yes", " true"])
      expect(elonezetBekapcsolva({ HOMEPAGE_PREVIEW_ENABLED: rossz })).toBe(
        false,
      )
  })

  it("az OS címe csak egy érvényes origin", () => {
    expect(osOrigin({ ACROPORA_OS_ORIGIN: "https://os.acropora.hu" })).toBe(
      "https://os.acropora.hu",
    )
    expect(osOrigin({ ACROPORA_OS_ORIGIN: "https://os.acropora.hu/" })).toBe(
      "https://os.acropora.hu",
    )
    expect(osOrigin({ ACROPORA_OS_ORIGIN: "http://localhost:3000" })).toBe(
      "http://localhost:3000",
    )
    for (const rossz of [
      undefined,
      "",
      "*",
      "https://*.acropora.hu",
      "https://a.hu https://b.hu",
      "https://a.hu; script-src *",
      "https://a.hu/utvonal",
      "https://a.hu?x=1",
      "https://user:pw@a.hu",
      "javascript:alert(1)",
      "ftp://a.hu",
      "os.acropora.hu",
    ])
      expect(osOrigin({ ACROPORA_OS_ORIGIN: rossz })).toBeNull()
  })

  it("a fejlécek: egyetlen frame-ancestors, noindex, nincs gyorsítótár; hibás cím esetén 'none'", () => {
    const jo = elonezetFejlecek({
      ACROPORA_OS_ORIGIN: "https://os.acropora.hu",
    })
    expect(jo["Content-Security-Policy"]).toBe(
      "frame-ancestors https://os.acropora.hu",
    )
    expect(jo["X-Robots-Tag"]).toContain("noindex")
    expect(jo["Cache-Control"]).toBe("private, no-store")
    expect(
      elonezetFejlecek({ ACROPORA_OS_ORIGIN: "*" })["Content-Security-Policy"],
    ).toBe("frame-ancestors 'none'")
    expect(elonezetFejlecek({})["Content-Security-Policy"]).toBe(
      "frame-ancestors 'none'",
    )
  })

  it("csak az országkóddal álló előnézeti út", () => {
    expect(elonezetiUt("/hu/kezdolap-elonezet")).toBe(true)
    expect(elonezetiUt("/hu/kezdolap-elonezet/")).toBe(true)
    for (const mas of [
      "/hu",
      "/hu/store",
      "/kezdolap-elonezet",
      "/hu/kezdolap-elonezet/x",
      "/hu/kezdolap-elonezetx",
      "/hu/x/kezdolap-elonezet",
    ])
      expect(elonezetiUt(mas)).toBe(false)
  })
})
