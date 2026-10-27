import { describe, expect, it, vi } from "vitest"

import {
  HIRLEVEL_UZENET,
  hirlevelFeliratkozas,
  sebessegKorlat,
} from "./hirlevel-feliratkozas"

/*
  A FELIRATKOZAS MAGJA (kirakat-lablec-kep). MI PIROSIT: hozzajarulas nelkul
  is kimegy; a korlat a bolt iranyaba nem latogatonkent szamol (a bolt a
  kirakat szerverenek cimet latja, barracuda #577); a bolt valaszkodjai mas
  mondatot kapnak; egy hibas kitoltes elveszti, amit a vevo beirt.
*/
const urlap = (felulir: Record<string, unknown> = {}) => ({
  nev: " Teszt Elek ",
  email: " teszt@pelda.hu ",
  hozzajarul: true,
  ip: "203.0.113.5",
  ...felulir,
})
const laza = () => sebessegKorlat({ max: 100, ablakMs: 60_000 })
const boltHiba = (status: number) => Object.assign(new Error("x"), { status })

describe("hirlevelFeliratkozas", () => {
  it("trimmelve, hozzájárulással küld, és kész", async () => {
    const kuld = vi.fn(async () => ({ subscribed: true }))
    expect(
      await hirlevelFeliratkozas(urlap(), { kuld, korlat: laza() }),
    ).toEqual({
      allapot: "kesz",
    })
    expect(kuld).toHaveBeenCalledWith({
      name: "Teszt Elek",
      email: "teszt@pelda.hu",
      consent: true,
    })
  })

  it("hozzájárulás vagy érvényes cím nélkül nem küld, és megtartja a beírtat", async () => {
    const kuld = vi.fn()
    const nincs = await hirlevelFeliratkozas(urlap({ hozzajarul: false }), {
      kuld,
      korlat: laza(),
    })
    expect(nincs).toEqual({
      allapot: "hiba",
      uzenet: HIRLEVEL_UZENET.hozzajarulas,
      ertekek: { nev: "Teszt Elek", email: "teszt@pelda.hu" },
    })
    for (const rossz of [{ email: "nem-cim" }, { nev: " " }])
      expect(
        (await hirlevelFeliratkozas(urlap(rossz), { kuld, korlat: laza() }))
          .allapot,
      ).toBe("hiba")
    expect(kuld).not.toHaveBeenCalled()
  })

  it("látogatónként számol: a hatodik ugyanarról a címről nem megy ki, más látogató igen", async () => {
    const kuld = vi.fn(async () => ({}))
    const korlat = sebessegKorlat({ max: 5, ablakMs: 60_000 })
    for (let i = 0; i < 5; i++)
      await hirlevelFeliratkozas(urlap({ email: `a${i}@pelda.hu` }), {
        kuld,
        korlat,
      })
    const hatodik = await hirlevelFeliratkozas(urlap({ email: "f@pelda.hu" }), {
      kuld,
      korlat,
    })
    expect(hatodik).toMatchObject({ uzenet: HIRLEVEL_UZENET.korlat })
    expect(kuld).toHaveBeenCalledTimes(5)
    expect(
      await hirlevelFeliratkozas(urlap({ ip: "198.51.100.7" }), {
        kuld,
        korlat,
      }),
    ).toEqual({ allapot: "kesz" })
  })

  it("a bolt válaszkódjai a vevő mondatára fordulnak", async () => {
    const eset = async (status: number) =>
      hirlevelFeliratkozas(urlap(), {
        kuld: async () => {
          throw boltHiba(status)
        },
        korlat: laza(),
      })
    expect(await eset(429)).toMatchObject({ uzenet: HIRLEVEL_UZENET.korlat })
    expect(await eset(403)).toMatchObject({
      uzenet: HIRLEVEL_UZENET.kikapcsolva,
    })
    expect(await eset(400)).toMatchObject({ uzenet: HIRLEVEL_UZENET.email })
    const figyel = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(await eset(500)).toMatchObject({ uzenet: HIRLEVEL_UZENET.hiba })
    figyel.mockRestore()
  })
})
