import { describe, expect, it, vi } from "vitest"

import { CEG } from "@lib/ceg"
import { KEZDOLAP_SZOVEGEK, maradtMinta } from "../szovegek"

/**
 * A FEJLEC INFO-SAVJA NEM KITALALT TENY (2026-11-19, kirakat-kinezet lista): a sav
 * telefonszama es nyitvatartasa kitalalt volt (`+36 1 234 5678`, `10-19`), es a
 * lablec ugyanezt mast mondta. A sav kezdoerteke mostantol a LABLEC adata (`CEG`), a
 * valodi szam es nyitvatartas, tehat nem minta: az OS nem ismeri ezeket a kulcsokat
 * (nem szerkesztheto onnan), a kirakat pedig nem allit semmit, amit a lablec nem.
 * MI PIROSIT: ha a sav telefonszama elter a lablec szamatol; ha a nyitvatartas
 * valamelyik sora hianyzik belole vagy a lablecben nem szereplo nap kerul bele; ha
 * a kitalalt szam visszakerul; ha egy savkulcs ujra mintakent jelolodik (a
 * "MINTA ADAT" cimke visszajonne); ha az uj szoveg a lablecnek ellentmondana.
 */
const sav = (n: number) => {
  const sor = KEZDOLAP_SZOVEGEK.find((s) => s.kulcs === `fejlec.sav.${n}`)
  if (!sor) throw new Error(`nincs fejlec.sav.${n}`)
  return sor
}

describe("a fejléc info-sávja a lábléc adata", () => {
  it("a telefonszám a lábléc száma", () => {
    expect(sav(4).alap).toContain(CEG.telefon)
    expect(sav(4).alap).not.toContain("1 234 5678")
  })

  it("a nyitvatartás a lábléc nyitvatartása, a zárva napok nélkül", () => {
    const nyitva = CEG.nyitvatartas.filter((n) => !/zárva/i.test(n))
    expect(nyitva.length).toBeGreaterThan(0)
    for (const sor of nyitva) expect(sav(3).alap).toContain(sor)
    for (const sor of CEG.nyitvatartas.filter((n) => /zárva/i.test(n)))
      expect(sav(3).alap).not.toContain(sor.split(" ")[0])
    // a régi, kitalált "ma 10-19" nincs többé
    expect(sav(3).alap).not.toMatch(/10[–-]19/)
  })

  it("egyik sávkulcs sem minta: nincs MINTA ADAT cimke és a kapu nem számolja", () => {
    for (const n of [1, 2, 3, 4]) expect(sav(n).minta).toBeUndefined()
    expect(
      maradtMinta(null).filter((k) => k.startsWith("fejlec.sav.")),
    ).toEqual([])
  })

  it("a szállítás sora csak olyat állít, ami a boltban van (Foxpost, GLS), kitalált határidőt nem", () => {
    expect(sav(2).alap).toMatch(/Foxpost/)
    expect(sav(2).alap).toMatch(/GLS/)
    expect(sav(2).alap).not.toMatch(/\d\s*[–-]\s*\d\s*munkanap/)
  })

  /*
    A SAV A LABLEC ADATABOL SZARMAZIK, NEM EGY MASOLATBOL. A fenti allitasok egy beegetett masolatra is
    zoldek volnak (ma ugyanazt a szamot irja mindketto), ezert itt a `CEG` MAS ERTEKEKKEL jon vissza, es a
    sav szoveget ugyanazokkal a kulcsokkal kell megkapni: egy masolat a REGI szamot mutatna.
  */
  it("a CEG adatainak megvaltozasa a savba is atmegy (a magyar es az angol szotar, a katalogus)", async () => {
    vi.resetModules()
    vi.doMock("@lib/ceg", () => ({
      CEG: {
        nev: "Teszt Kft.",
        cim: "1111 Teszt",
        telefon: "+36-1/000-0000",
        email: "teszt@example.test",
        nyitvatartas: ["Hétfő 8-9", "Vasárnap Zárva"],
      },
      CEG_NYITVA: ["Hétfő 8-9"],
    }))
    try {
      const { KEZDOLAP_SZOVEGEK: katalogus } = await import("../szovegek")
      const { hu } = await import("@lib/i18n/dictionary/hu")
      const { en } = await import("@lib/i18n/dictionary/en")
      const alap = (n: number) =>
        katalogus.find((s) => s.kulcs === `fejlec.sav.${n}`)!.alap
      expect(alap(4)).toContain("+36-1/000-0000")
      expect(alap(3)).toContain("Hétfő 8-9")
      expect(alap(3)).not.toContain("Kedd")
      expect(hu.headerText.bar4).toContain("+36-1/000-0000")
      expect(hu.headerText.bar3).toContain("Hétfő 8-9")
      expect(en.headerText.bar4).toContain("+36-1/000-0000")
    } finally {
      vi.doUnmock("@lib/ceg")
      vi.resetModules()
    }
  })
})
