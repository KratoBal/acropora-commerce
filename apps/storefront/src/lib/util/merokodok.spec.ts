import { describe, expect, it } from "vitest"

import {
  gtagScriptCim,
  lathatoUtvonal,
  merheto,
  merokodAzonositok,
  mitToltsunk,
  sutiDomainek,
  torlendoSutik,
  vanMerokod,
} from "./merokodok"

/**
 * A MEROKODOK TISZTA SZABALYAI (kartya dc8cabd2). MI PIROSIT: egy ures vagy hibas azonosito betoltest enged (egy kitalalt
 * ertek script-cimbe vagy inline hivasba kerulne); a Statisztika a Marketing eszkozeit is engedi, vagy forditva; dontes nelkul
 * barmi tolthetne; a Statisztika visszavonasa a Marketing sutijeit viszi (vagy a Marketingé a statisztikaiakat); a rendeles es a
 * fiok lapja (token az URL-ben) latszik a merofelnek; a lekerdezes (kereses, token) benne marad az utvonalban.
 */
const JO = {
  NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ABCDE12345",
  NEXT_PUBLIC_GOOGLE_ADS_ID: "AW-123456789",
  NEXT_PUBLIC_META_PIXEL_ID: "1234567890123456",
}

describe("merokodAzonositok", () => {
  it("a jo alakot megtartja (szokozok nelkul), minden mast null-ra ejt", () => {
    expect(
      merokodAzonositok({
        ...JO,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: " G-ABCDE12345 ",
      }),
    ).toEqual({
      ga4: "G-ABCDE12345",
      ads: "AW-123456789",
      meta: "1234567890123456",
    })
    for (const rossz of [
      "",
      "   ",
      "G-",
      "G-abcde12345",
      "UA-12345-1",
      'G-ABCDE12345"',
      "G-ABCDE12345;alert(1)",
      "G-ABCDE12345 G-ZZZZZZZZZZ",
      "https://x.example/G-ABCDE12345",
      "G-ABCDE12345\n",
    ])
      expect(
        merokodAzonositok({ NEXT_PUBLIC_GA_MEASUREMENT_ID: rossz }).ga4,
        JSON.stringify(rossz),
      ).toBe(rossz.trim() === "G-ABCDE12345" ? "G-ABCDE12345" : null)
    expect(
      merokodAzonositok({ NEXT_PUBLIC_GOOGLE_ADS_ID: "AW-12" }).ads,
    ).toBeNull()
    expect(
      merokodAzonositok({ NEXT_PUBLIC_GOOGLE_ADS_ID: "123456789" }).ads,
    ).toBeNull()
    expect(
      merokodAzonositok({ NEXT_PUBLIC_META_PIXEL_ID: "123" }).meta,
    ).toBeNull()
    expect(
      merokodAzonositok({
        NEXT_PUBLIC_META_PIXEL_ID: "12345678901234567890123",
      }).meta,
    ).toBeNull()
    expect(
      merokodAzonositok({ NEXT_PUBLIC_META_PIXEL_ID: "12345abcde" }).meta,
    ).toBeNull()
  })

  it("ures kornyezetben nincs merokod", () => {
    expect(vanMerokod(merokodAzonositok({}))).toBe(false)
    expect(vanMerokod(merokodAzonositok(JO))).toBe(true)
  })
})

describe("mitToltsunk", () => {
  const azon = merokodAzonositok(JO)
  const dontes = (statisztika: boolean, marketing: boolean) => ({
    statisztika,
    marketing,
  })

  it("dontes nelkul semmi, a kategoriak kulon engednek", () => {
    expect(mitToltsunk(null, azon)).toEqual({
      ga4: null,
      ads: null,
      meta: null,
    })
    expect(mitToltsunk(dontes(false, false), azon)).toEqual({
      ga4: null,
      ads: null,
      meta: null,
    })
    expect(mitToltsunk(dontes(true, false), azon)).toEqual({
      ga4: "G-ABCDE12345",
      ads: null,
      meta: null,
    })
    expect(mitToltsunk(dontes(false, true), azon)).toEqual({
      ga4: null,
      ads: "AW-123456789",
      meta: "1234567890123456",
    })
    expect(mitToltsunk(dontes(true, true), azon)).toEqual(azon)
  })

  it("azonosito nelkuli eszkoz a kategoriaval sem toltodik", () => {
    expect(
      mitToltsunk(dontes(true, true), { ga4: null, ads: null, meta: null }),
    ).toEqual({
      ga4: null,
      ads: null,
      meta: null,
    })
  })
})

describe("gtagScriptCim", () => {
  it("az elso engedelyezett azonositoval, kodolva; semmi nelkul null", () => {
    expect(
      gtagScriptCim({ ga4: "G-ABCDE12345", ads: "AW-123456789", meta: null }),
    ).toBe("https://www.googletagmanager.com/gtag/js?id=G-ABCDE12345")
    expect(
      gtagScriptCim({ ga4: null, ads: "AW-123456789", meta: "1234567890" }),
    ).toBe("https://www.googletagmanager.com/gtag/js?id=AW-123456789")
    expect(
      gtagScriptCim({ ga4: null, ads: null, meta: "1234567890" }),
    ).toBeNull()
  })
})

describe("torlendoSutik", () => {
  const sutik =
    "_ga=GA1.2.3; _ga_ABC123=GS1; _gid=x; _gat_UA=1; _gcl_au=1; _fbp=fb.1; _fbc=fb.2; acropora_suti=x; _medusa_cart_id=c; _gal=nem"
  it("kategoriankent kulon: a Statisztika a Google Analytics sutijeit, a Marketing a Google Ads es Meta sutijeit viszi, a bolt sajatjat soha", () => {
    expect(torlendoSutik(sutik, "statisztika")).toEqual([
      "_ga",
      "_ga_ABC123",
      "_gid",
      "_gat_UA",
    ])
    expect(torlendoSutik(sutik, "marketing")).toEqual([
      "_gcl_au",
      "_fbp",
      "_fbc",
    ])
    for (const kat of ["statisztika", "marketing"] as const) {
      const nevek = torlendoSutik(sutik, kat)
      expect(nevek).not.toContain("acropora_suti")
      expect(nevek).not.toContain("_medusa_cart_id")
      expect(nevek).not.toContain("_gal")
    }
    expect(torlendoSutik("", "statisztika")).toEqual([])
  })
})

describe("merheto es lathatoUtvonal", () => {
  it("a rendeles es a fiok lapjarol nincs esemeny, a lekerdezes (kereses, token) elmarad", () => {
    expect(merheto("/hu/rendeles-fizetese/titkos-token-123")).toBeNull()
    expect(merheto("/hu/order/order_01ABC")).toBeNull()
    expect(merheto("/hu/account/orders")).toBeNull()
    expect(merheto("/hu/termek/valami?q=titok&token=abc#reszlet")).toBe(
      "/hu/termek/valami",
    )
    expect(merheto("/hu")).toBe("/hu")
  })

  it("a latszo utvonal a rendelesnel es a fioknal altalanos, nem az igazi", () => {
    expect(lathatoUtvonal("/hu/rendeles-fizetese/titkos-token-123")).toBe(
      "/hu/rendeles",
    )
    expect(lathatoUtvonal("/hu/order/order_01ABC")).toBe("/hu/rendeles")
    expect(lathatoUtvonal("/hu/account/orders/x")).toBe("/hu/fiok")
    expect(lathatoUtvonal("/hu/termek/valami?q=a")).toBe("/hu/termek/valami")
  })
})

describe("sutiDomainek", () => {
  it("a domain nelkuli alak, a hoszt es minden szulo-domain (legalabb ket cimke)", () => {
    expect(sutiDomainek("shop-staging.acropora.hu")).toEqual([
      undefined,
      "shop-staging.acropora.hu",
      ".shop-staging.acropora.hu",
      ".acropora.hu",
    ])
    expect(sutiDomainek("localhost")).toEqual([undefined, "localhost"])
  })
})
