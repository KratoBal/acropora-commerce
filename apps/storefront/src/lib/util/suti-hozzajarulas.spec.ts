import { describe, expect, it } from "vitest"

import {
  consentAlapSzkript,
  consentJelek,
  olvasDontes,
  SUTI_ELETTARTAM_MP,
  SUTI_HOZZAJARULAS_VERZIO,
  SUTI_NEV,
  sutiErtek,
  sutiSor,
  type SutiDontes,
} from "./suti-hozzajarulas"

/**
 * A SUTI-HOZZAJARULAS TISZTA RESZE (d5515c7d). MI PIROSIT: ha dontes nelkul
 * barmelyik jel `granted`; ha a statisztika a hirdetesi jeleket nyitja (vagy
 * forditva); ha mas verzioju vagy serult suti dontesnek szamit; ha a suti
 * nem Path=/ vagy nem Lax; ha a <head> szkriptje mast ad, mint a modul.
 */
const D: SutiDontes = {
  verzio: SUTI_HOZZAJARULAS_VERZIO,
  idopont: "2026-11-11T19:00:00.000Z",
  statisztika: true,
  marketing: false,
}
const suti = (d: SutiDontes) =>
  `masik=1; ${SUTI_NEV}=${sutiErtek(d)}; harmadik=x`

describe("a Consent Mode jelei", () => {
  it("dontes nelkul mind a negy denied", () => {
    expect(consentJelek(null)).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    })
  })

  it("a statisztika csak az analytics_storage, a marketing csak a harom ad_ jel", () => {
    expect(consentJelek({ statisztika: true, marketing: false })).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    })
    expect(consentJelek({ statisztika: false, marketing: true })).toEqual({
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "denied",
    })
  })
})

describe("a suti olvasasa", () => {
  it("visszaadja a dontest a tobbi suti kozul", () => {
    expect(olvasDontes(suti(D))).toEqual(D)
    expect(
      olvasDontes(suti({ ...D, statisztika: false, marketing: true })),
    ).toEqual({
      ...D,
      statisztika: false,
      marketing: true,
    })
  })

  it.each([
    ["nincs suti", "masik=1"],
    ["regi verzio", suti({ ...D, verzio: "2020-01-01" })],
    ["serult ertek", `${SUTI_NEV}=%7Bnem-json`],
    [
      "rossz kategoria-ertek",
      `${SUTI_NEV}=${encodeURIComponent(JSON.stringify({ v: SUTI_HOZZAJARULAS_VERZIO, t: "x", s: true, m: 0 }))}`,
    ],
    ["hasonlo nevu masik suti", `x${SUTI_NEV}=${sutiErtek(D)}`],
  ])("%s: nincs dontes", (_, szoveg) => {
    expect(olvasDontes(szoveg)).toBeNull()
  })
})

describe("a suti sora", () => {
  it("az egesz bolt, Lax, 180 nap; Secure csak https-en", () => {
    const sor = sutiSor(D, true)
    expect(sor).toContain("Path=/")
    expect(sor).toContain("SameSite=Lax")
    expect(sor).toContain(`Max-Age=${SUTI_ELETTARTAM_MP}`)
    expect(SUTI_ELETTARTAM_MP).toBe(15552000)
    expect(sor).toContain("Secure")
    expect(sutiSor(D, false)).not.toContain("Secure")
  })
})

describe("a <head> szkriptje", () => {
  // lefuttatja a szkriptet egy sajat window/document parral, es visszaadja a dataLayer-t
  const futtat = (cookie: string) => {
    const window = { dataLayer: undefined as unknown[] | undefined } as Record<
      string,
      unknown
    >
    const document = { cookie }
    new Function("window", "document", consentAlapSzkript())(window, document)
    return (window.dataLayer as IArguments[]).map((a) => Array.from(a))
  }

  it("elso lepes: default, minden hirdetesi es statisztikai jel denied, varakozassal", () => {
    const [elso, ...tobbi] = futtat("")
    expect(elso).toEqual([
      "consent",
      "default",
      {
        ...consentJelek(null),
        functionality_storage: "granted",
        security_storage: "granted",
        wait_for_update: 500,
      },
    ])
    expect(tobbi).toEqual([])
  })

  it.each([
    { statisztika: true, marketing: false },
    { statisztika: false, marketing: true },
    { statisztika: true, marketing: true },
    { statisztika: false, marketing: false },
  ])(
    "tarolt dontesnel (%j) ugyanazt az update-et adja, mint a modul",
    (valasz) => {
      const sorok = futtat(suti({ ...D, ...valasz }))
      expect(sorok).toHaveLength(2)
      expect(sorok[1]).toEqual(["consent", "update", consentJelek(valasz)])
    },
  )

  it.each([
    ["regi verzio", suti({ ...D, verzio: "2020-01-01" })],
    ["serult suti", `${SUTI_NEV}=%7Bx`],
    ["hasonlo nevu masik suti", `x${SUTI_NEV}=${sutiErtek(D)}`],
  ])("%s: nincs update, es nem dob", (_, cookie) => {
    expect(futtat(cookie)).toHaveLength(1)
  })
})
