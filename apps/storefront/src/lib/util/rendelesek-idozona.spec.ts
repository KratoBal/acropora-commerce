import { describe, expect, it, vi } from "vitest"

/*
 * A TESZT-FOLYAMAT MASIK IDOZONABAN FUT (a P5-4a kalibraciojabol). A gep
 * Europe/Budapest zonaban van, ezert a `timeZone` opciot kiveve minden
 * datum-allitas zold maradt: a hiba itt nem latszott, egy UTC-ben futo
 * szerveren viszont a hajnali rendelesek elozo napra csusznanak.
 */
vi.hoisted(() => {
  process.env.TZ = "America/New_York"
})

import { rendelesDatum, rendelesDatumRovid } from "./rendelesek"

describe("a rendelés dátuma más időzónájú szerveren is budapesti", () => {
  /** KONTROLL: a folyamat tenyleg nem budapesti idoben fut. */
  it("a folyamat időzónája tényleg nem Budapest", () => {
    expect(new Date("2026-09-28T22:30:00.000Z").getDate()).toBe(28)
  })

  it("este fél 11 UTC Budapesten már másnap", () => {
    expect(rendelesDatum("2026-09-28T22:30:00.000Z")).toBe(
      "2026. szeptember 29.",
    )
    expect(rendelesDatumRovid("2026-09-28T22:30:00.000Z")).toBe("2026. 09. 29.")
  })
})
