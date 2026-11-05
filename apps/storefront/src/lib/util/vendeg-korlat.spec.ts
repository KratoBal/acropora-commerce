import { describe, expect, it } from "vitest"

import {
  engedelyezett,
  KERESES_KORLAT,
  keresesKorlat,
  latogatoKulcs,
  szamlaKorlat,
} from "./vendeg-korlat"

/**
 * A VENDEG-RENDELESLAP LATOGATONKENTI KORLATJA. MI PIROSIT: ha egy latogato a keret felett tovabb kerdezhet; ha egy latogato
 * mas latogato keretet fogyasztja; ha a fejlec nelkuli kerest korlat ala tesszuk KOZOS kulccsal (egy hibas proxy-beallitas az
 * egesz boltot kizarna); ha a latogato kulcsa nem a proxy `x-real-ip` fejlece (az `x-forwarded-for` elejet a latogato allitja).
 */
const fejlec = (mezok: Record<string, string>) => ({
  get: (nev: string) => mezok[nev.toLowerCase()] ?? null,
})

describe("latogatoKulcs", () => {
  it("is the proxy's x-real-ip, trimmed; the forwarded-for list is NOT used", () => {
    expect(latogatoKulcs(fejlec({ "x-real-ip": " 203.0.113.7 " }))).toBe(
      "203.0.113.7",
    )
    expect(
      latogatoKulcs(fejlec({ "x-forwarded-for": "198.51.100.1, 203.0.113.7" })),
    ).toBeNull()
  })
  it("is null without the header or with an empty one", () => {
    expect(latogatoKulcs(fejlec({}))).toBeNull()
    expect(latogatoKulcs(fejlec({ "x-real-ip": "  " }))).toBeNull()
  })
})

describe("engedelyezett", () => {
  it("lets a visitor ask up to the limit and refuses the next, per visitor", () => {
    const korlat = keresesKorlat()
    const t = 1_000_000
    for (let i = 0; i < KERESES_KORLAT.max; i += 1)
      expect(engedelyezett(korlat, "a", t)).toBe(true)
    expect(engedelyezett(korlat, "a", t)).toBe(false)
    // another visitor has their own allowance
    expect(engedelyezett(korlat, "b", t)).toBe(true)
  })

  it("gives the allowance back after the window", () => {
    const korlat = keresesKorlat()
    const t = 1_000_000
    for (let i = 0; i < KERESES_KORLAT.max; i += 1)
      engedelyezett(korlat, "a", t)
    expect(engedelyezett(korlat, "a", t + KERESES_KORLAT.ablakMs + 1)).toBe(
      true,
    )
  })

  it("without a key it never counts and never refuses (no shared key)", () => {
    const korlat = szamlaKorlat()
    for (let i = 0; i < 500; i += 1)
      expect(engedelyezett(korlat, null)).toBe(true)
    // and a null key left no trace: the first real visitor starts from zero
    expect(engedelyezett(korlat, "x")).toBe(true)
  })
})
