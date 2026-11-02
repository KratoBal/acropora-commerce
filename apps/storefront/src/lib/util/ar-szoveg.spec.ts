import { translator } from "@lib/i18n/dictionary"
import { describe, expect, it } from "vitest"

import { arSzoveg } from "./ar-szoveg"

describe("az összeg szövege", () => {
  it("a nulla Ingyenes / Free, nem 0 Ft", () => {
    expect(arSzoveg(0, "huf", translator("hu"))).toBe("Ingyenes")
    expect(arSzoveg(0, "huf", translator("en"))).toBe("Free")
  })

  it("a nem nulla összeg pénzként áll", () => {
    // a formázó tagoló szóköze nem szóköz: szóközök nélkül keresünk
    expect(arSzoveg(3500, "huf", translator("hu")).replace(/\s/g, "")).toBe(
      "3500Ft",
    )
  })
})
