import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { en } from "@lib/i18n/dictionary/en"
import { hu } from "@lib/i18n/dictionary/hu"
import { sebessegKorlat } from "./hirlevel-feliratkozas"
import {
  erkezesUrlapKell,
  SZOLJ_LINK_UT,
  szoljFajtaOf,
  szoljFaj,
  szoljFeliratkozas,
  szoljUrlapKell,
} from "./szolj-hasonlo"

/*
  "SZÓLJ, HA JÖN HASONLÓ" (V2.4, 0c1265d2). MI PIROSIT: az urlap egy fajt nem nevezo cimnel ("sp.", "cf.") is all,
  amire a bolt 400-at adna; az urlap a kapcsolo nelkul vagy kaphato darabon is all; hozzajarulas nelkul is kimegy;
  a bolt mas torzset kap (a fajt vagy a hozzajarulas szoveget a kirakat kuldene); a korlat nem latogatonkent szamol;
  a bolt valaszkodjai mas mondatot kapnak; egy hibas kitoltes elveszti a beirt cimet; a latott hozzajarulas betuben
  elter attol, amit a bolt rogzit; a link a hirlevel boltbeli utjara megy.
*/
const urlap = (felulir: Record<string, unknown> = {}) => ({
  email: " teszt@pelda.hu ",
  hozzajarul: true,
  termekId: "prod_sold",
  ip: "203.0.113.5",
  ...felulir,
})
const laza = () => sebessegKorlat({ max: 100, ablakMs: 60_000 })
const boltHiba = (status: number) => Object.assign(new Error("x"), { status })

afterEach(() => vi.unstubAllEnvs())

describe("szoljFaj és szoljUrlapKell", () => {
  it("SZ-FAJ: a cim latin binomialisa, ha fajt nevez; a 'sp.', 'cf.', 'aff.' es a nem binomialis cim nem faj", () => {
    expect(szoljFaj("Acropora abrolhosensis ULTRA")).toBe(
      "acropora abrolhosensis",
    )
    for (const cim of [
      "Acropora sp. Tricolor",
      "Acropora spp.",
      "Acropora cf. tenuis",
      "Montipora aff. setosa",
      "Red Sea Reef Foundation A",
      null,
    ])
      expect([cim, szoljFaj(cim)]).toEqual([cim, null])
  })

  it("SZ-KELL: csak ELADVA, csak fajt nevezo cimnel, es csak a kapcsoloval", () => {
    vi.stubEnv("NEXT_PUBLIC_STOCK_ALERT", "on")
    expect(szoljUrlapKell("ELADVA", "Acropora tenuis kék")).toBe(true)
    expect(szoljUrlapKell("KAPHATO", "Acropora tenuis kék")).toBe(false)
    expect(szoljUrlapKell("ELFOGYOTT", "Acropora tenuis kék")).toBe(false)
    expect(szoljUrlapKell("ELADVA", "Acropora sp. kék")).toBe(false)
    for (const ertek of ["", "true", "yes", "ON"]) {
      vi.stubEnv("NEXT_PUBLIC_STOCK_ALERT", ertek)
      expect([ertek, szoljUrlapKell("ELADVA", "Acropora tenuis kék")]).toEqual([
        ertek,
        false,
      ])
    }
  })
})

describe("szoljFeliratkozas", () => {
  it("SZ-KULD: trimmelt cimmel, a termek azonositojaval, fajra, hozzajarulassal es a nyelvvel kuld, es kesz", async () => {
    const kuld = vi.fn(async () => ({ subscribed: true }))
    expect(await szoljFeliratkozas(urlap(), { kuld, korlat: laza() })).toEqual({
      allapot: "kesz",
    })
    expect(kuld).toHaveBeenCalledWith({
      product_id: "prod_sold",
      kind: "species",
      email: "teszt@pelda.hu",
      consent: true,
      locale: "hu",
    })
    await szoljFeliratkozas(urlap({ nyelv: "en" }), { kuld, korlat: laza() })
    expect(kuld.mock.calls[1]).toEqual([
      expect.objectContaining({ locale: "en" }),
    ])
  })

  it("SZ-HIBA: rossz cim, hozzajarulas nelkul: nem megy ki, korall mondata all, a beirt cim megmarad", async () => {
    const kuld = vi.fn()
    expect(
      await szoljFeliratkozas(urlap({ email: "nem-cim " }), {
        kuld,
        korlat: laza(),
      }),
    ).toEqual({
      allapot: "hiba",
      uzenet: "Ellenőrizd az e-mail címet, valami hiányzik belőle.",
      ertekek: { email: "nem-cim" },
    })
    expect(
      await szoljFeliratkozas(urlap({ hozzajarul: false }), {
        kuld,
        korlat: laza(),
      }),
    ).toMatchObject({
      uzenet: "Az értesítéshez a hozzájárulás szükséges.",
      ertekek: { email: "teszt@pelda.hu" },
    })
    expect(kuld).not.toHaveBeenCalled()
  })

  it("SZ-KORLAT: a latogatonkenti korlat a bolt hivasa elott all meg; mas latogato atmegy", async () => {
    const kuld = vi.fn(async () => ({}))
    const korlat = sebessegKorlat({ max: 1, ablakMs: 60_000 })
    await szoljFeliratkozas(urlap(), { kuld, korlat })
    expect(await szoljFeliratkozas(urlap(), { kuld, korlat })).toMatchObject({
      uzenet: "Túl sok kérés érkezett innen. Próbáld újra pár perc múlva.",
    })
    expect(
      await szoljFeliratkozas(urlap({ ip: "198.51.100.7" }), { kuld, korlat }),
    ).toEqual({ allapot: "kesz" })
    expect(kuld).toHaveBeenCalledTimes(2)
  })

  it("SZ-BOLT: a bolt 429-e korlat, 403-a kikapcsolt, minden mas az altalanos hiba; angolul angol", async () => {
    const eset = async (status: number, nyelv: "hu" | "en" = "hu") =>
      (
        (await szoljFeliratkozas(urlap({ nyelv }), {
          kuld: async () => {
            throw boltHiba(status)
          },
          korlat: laza(),
        })) as { uzenet: string }
      ).uzenet
    const figyel = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    expect(await eset(429)).toBe(hu.stockAlert.errorLimit)
    expect(await eset(403)).toBe(hu.stockAlert.errorOff)
    expect(await eset(400)).toBe(hu.stockAlert.errorFailed)
    expect(await eset(500)).toBe(hu.stockAlert.errorFailed)
    expect(await eset(403, "en")).toBe(en.stockAlert.errorOff)
    figyel.mockRestore()
  })
})

describe("a bolt mondata és a link útja", () => {
  /*
    A LATOTT HOZZAJARULAS A ROGZITETT: a bolt a sajat mondatat rogzíti (a kirakat nem kuldi), tehat a lapon allo
    mondatnak betura a bolt `STOCK_ALERT_CONSENT` mondatanak kell lennie, mindket nyelven.
  */
  it("SZ-HOZZAJARULAS: a magyar es az angol mondat betűre a bolt subject.ts-e", () => {
    const bolt = readFileSync(
      join(__dirname, "../../../../backend/src/modules/stock-alert/subject.ts"),
      "utf-8",
    )
    // pozitiv kontroll: tenyleg a bolt mondatait olvastuk
    expect(bolt).toContain("export const STOCK_ALERT_CONSENT")
    expect(bolt).toContain(JSON.stringify(hu.stockAlert.consent))
    expect(bolt).toContain(JSON.stringify(en.stockAlert.consent))
  })

  it("SZ-LINK: a ket link a bolt ertesites-utjara megy, nem a hirlevelere", () => {
    expect(SZOLJ_LINK_UT).toEqual({
      megerosites: "/store/stock-alerts/confirm",
      leiratkozas: "/store/stock-alerts/unsubscribe",
    })
  })
})

/*
  "ÉRTESÍTS, HA MEGÉRKEZIK" (V2.6 S3b): ugyanaz a feliratkozas, a bolt `product` fajtajaval. MI PIROSIT: a termekre varo urlap
  a FAJT kuldene (a bolt a cim fajara iratna fel: barmelyik darabra szolna, nem erre); az ismeretlen vagy hianyzo fajta a
  termeket kapna (a kliens nem hivhat elo a regi alaktol eltero viselkedest); a termek-urlap a kapcsolo nelkul all; a
  termek hozzajarulas-mondata betuben elter a bolt rogzitettjetol.
*/
describe("a feliratkozas fajtaja", () => {
  it("SZ-FAJTA: a kuldott kind a kert fajta; hianyzo fajta a faj (a V2.4 alak)", async () => {
    const kuld = vi.fn(async () => ({ subscribed: true }))
    await szoljFeliratkozas(urlap({ fajta: "product" }), {
      kuld,
      korlat: laza(),
    })
    expect(kuld).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "product", product_id: "prod_sold" }),
    )
    await szoljFeliratkozas(urlap(), { kuld, korlat: laza() })
    expect(kuld).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "species" }),
    )
  })

  it("SZ-FAJTA-OLVASO: csak a `product` szo ad termeket, minden mas (ismeretlen, ures, nem szoveg) a fajt", () => {
    expect(szoljFajtaOf("product")).toBe("product")
    for (const ertek of [
      "species",
      "",
      "Product",
      "PRODUCT",
      null,
      undefined,
      7,
      {},
    ])
      expect(szoljFajtaOf(ertek)).toBe("species")
  })

  it("SZ-ERKEZES-KELL: az erkezes-urlap csak a kapcsoloval, es csak ha az erkezes latszik", () => {
    vi.stubEnv("NEXT_PUBLIC_STOCK_ALERT", "on")
    expect(erkezesUrlapKell(true)).toBe(true)
    expect(erkezesUrlapKell(false)).toBe(false)
    for (const ertek of ["", "true", "yes", "ON"]) {
      vi.stubEnv("NEXT_PUBLIC_STOCK_ALERT", ertek)
      expect([ertek, erkezesUrlapKell(true)]).toEqual([ertek, false])
    }
  })

  it("SZ-HOZZAJARULAS-TERMEK: a termek mondata, magyarul es angolul, betuben a bolt subject.ts-e", () => {
    const bolt = readFileSync(
      join(__dirname, "../../../../backend/src/modules/stock-alert/subject.ts"),
      "utf-8",
    )
    expect(bolt).toContain("export const STOCK_ALERT_CONSENT")
    expect(bolt).toContain(JSON.stringify(hu.stockAlert.productConsent))
    expect(bolt).toContain(JSON.stringify(en.stockAlert.productConsent))
    // a ket fajta mondata kulon: a termek-mondat nem a fajte
    expect(hu.stockAlert.productConsent).not.toBe(hu.stockAlert.consent)
  })
})
