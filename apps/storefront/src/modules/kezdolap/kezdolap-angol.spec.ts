import { describe, expect, it } from "vitest"

import { en } from "@lib/i18n/dictionary/en"
import { hu } from "@lib/i18n/dictionary/hu"
import { ALAP_DIAK, kezdolapAdat } from "./tartalom"
import { KEZDOLAP_SZOVEGEK } from "./szovegek"

/**
 * A KEZDOLAP SZOVEGEI ANGOLUL (kirakat-i18n-kezdolap-termeklap). MI PIROSIT: ha a katalogus egy kezdoerteke elter a szotarbol
 * (az angol lap csendben magyar maradna); ha egy ADAT (velemeny, markanev, cim, nyitvatartas) bekerul a szotarba es lefordul; ha egy
 * KEZZEL irt (OS) szoveg lefordul; ha az alap-diak egy mezoje kimarad; ha a magyar kezdolap barmiben mas.
 */
const MAGYAR_BETU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/

/** Amit nem fordit a lap, mert ADAT: velemenyek, markanevek (a marka-felsorolas is), cim, nyitvatartas, a szam-ertekeles. */
const ADAT = new Set([
  "hero.tenyek.3.cim",
  "halado.3.szoveg",
  "markak.1",
  "markak.2",
  "markak.3",
  "markak.4",
  "velemenyek.pont",
  "velemenyek.1.idezet",
  "velemenyek.1.nev",
  "velemenyek.1.megjegyzes",
  "velemenyek.2.idezet",
  "velemenyek.2.nev",
  "velemenyek.2.megjegyzes",
  "velemenyek.3.idezet",
  "velemenyek.3.nev",
  "velemenyek.3.megjegyzes",
  "bolt.cim_ertek",
  "bolt.nyitva_ertek",
])
const SZOVEGEK = KEZDOLAP_SZOVEGEK.filter(
  (sor) =>
    sor.tipus === "szoveg" &&
    sor.alap !== "" &&
    !sor.kulcs.startsWith("fejlec."),
)

describe("a kezdőlap szövegei a szótárban", () => {
  it("a homeText pontosan a katalógus nem-adat kezdőértékei", () => {
    const katalogus = SZOVEGEK.filter((sor) => !ADAT.has(sor.kulcs)).map(
      (sor) => sor.alap,
    )
    expect(new Set(Object.values(hu.homeText))).toEqual(new Set(katalogus))
    expect(katalogus.length).toBeGreaterThan(80)
  })

  it("a slideText pontosan az alap-diák szöveges mezői", () => {
    const mezok = ALAP_DIAK.flatMap((d) => [
      d.eyebrow,
      d.title,
      d.text,
      d.cta,
      d.cta2,
      d.caption,
      d.caption2,
      d.image_alt,
    ])
    expect(new Set(Object.values(hu.slideText))).toEqual(new Set(mezok))
    expect(Object.keys(en.slideText)).toEqual(Object.keys(hu.slideText))
  })
})

describe("a kezdőlap angolul", () => {
  it("minden nem-adat kezdőérték angol, az adat változatlan", () => {
    const s = kezdolapAdat(null, "en")
    const magyarul = SZOVEGEK.filter(
      (sor) => !ADAT.has(sor.kulcs) && MAGYAR_BETU.test(s.szoveg(sor.kulcs)),
    ).map((sor) => sor.kulcs)
    expect(magyarul).toEqual([])
    for (const kulcs of ADAT) {
      const sor = SZOVEGEK.find((x) => x.kulcs === kulcs)!
      expect(s.szoveg(kulcs), kulcs).toBe(sor.alap)
    }
    expect(s.szoveg("mit.cim")).toBe("What are you looking for today?")
  })

  it("az alap-diák angolul angolok, a hivatkozásuk és a jelölőjük változatlan", () => {
    const diak = kezdolapAdat(null, "en").diak
    expect(diak).toHaveLength(ALAP_DIAK.length)
    for (const [i, d] of diak.entries()) {
      for (const mezo of ["eyebrow", "title", "text", "cta", "cta2"] as const)
        expect(d[mezo], `${i} ${mezo}`).not.toMatch(MAGYAR_BETU)
      expect(d.cta_href).toBe(ALAP_DIAK[i]!.cta_href)
      expect(d.minta).toBe(ALAP_DIAK[i]!.minta)
    }
  })

  it("az OS-ben átírt szöveget és az OS saját diáját úgy mutatja, ahogy írták", () => {
    const sajatDia = { ...ALAP_DIAK[0]!, title: "Saját cím" }
    const s = kezdolapAdat(
      {
        texts: { "mit.cim": "Mit keresel ma, kedves vendég?" },
        slides: [sajatDia],
      },
      "en",
    )
    expect(s.szoveg("mit.cim")).toBe("Mit keresel ma, kedves vendég?")
    expect(s.diak[0]!.title).toBe("Saját cím")
    // a mezo, amit nem irtak at, a kezdoertek: az fordul
    expect(s.diak[0]!.cta).toBe("One-of-a-kind corals")
  })

  it("magyarul a kezdőlap a katalógus és az alap-diák, változatlanul", () => {
    const s = kezdolapAdat(null)
    for (const sor of SZOVEGEK) expect(s.szoveg(sor.kulcs)).toBe(sor.alap)
    expect(s.diak).toEqual([...ALAP_DIAK])
    expect(s.t("home.featured")).toBe("Kiemelt ajánlatok")
  })
})
