import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/font/google", () => ({
  Hanken_Grotesk: () => ({ variable: "hanken" }),
  Belleza: () => ({ variable: "belleza" }),
}))

import TokenMintalap, { dynamic, mintalapEngedelyezett } from "./page"

/**
 * A TOKEN-MINTALAP ELESBEN NEM ELERHETO.
 *
 * MI PIROSIT: ha a lap a kapcsolo nelkul is renderel (elesben latszana); ha a
 * kapcsolo mas erteket is elfogad (egy "true" vagy "0" nem kapcsolhatja be);
 * ha a dontes build-idoben szuletne (akkor a build kornyezete dontene).
 */
describe("/tokenek", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("keresre dont, nem build-idoben", () => {
    expect(dynamic).toBe("force-dynamic")
  })

  it("csak a pontos '1' ertek kapcsolja be", () => {
    expect(mintalapEngedelyezett({})).toBe(false)
    expect(mintalapEngedelyezett({ ACROPORA_TOKEN_MINTALAP: "true" })).toBe(
      false,
    )
    expect(mintalapEngedelyezett({ ACROPORA_TOKEN_MINTALAP: "0" })).toBe(false)
    expect(mintalapEngedelyezett({ ACROPORA_TOKEN_MINTALAP: "1" })).toBe(true)
  })

  it("kapcsolo nelkul 404 (notFound), a lap nem renderel", () => {
    vi.stubEnv("ACROPORA_TOKEN_MINTALAP", "")
    expect(() => TokenMintalap()).toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/,
    )
  })

  it("bekapcsolva renderel", () => {
    vi.stubEnv("ACROPORA_TOKEN_MINTALAP", "1")
    expect(TokenMintalap()).toBeTruthy()
  })
})
