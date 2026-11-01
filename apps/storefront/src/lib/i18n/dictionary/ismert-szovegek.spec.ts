import { describe, expect, it } from "vitest"

import { KEZDOLAP_SZOVEGEK } from "@modules/kezdolap/szovegek"
import { HIRLEVEL_ALAP } from "@modules/layout/templates/footer/hirlevel-adat"
import {
  FIZETESI_OPCIOK_KEP,
  JOGI_KULCS,
  OSZLOP_CIMEK,
  OSZLOP_KULCSOK,
  REGI_BOLT_HIVATKOZASOK,
  SAJAT_HIVATKOZASOK,
} from "@modules/layout/templates/footer/hivatkozasok"
import { JOGI_DOKUMENTUMOK } from "@lib/util/fogyasztobarat"
import {
  HIRLEVEL_UZENET,
  hirlevelUzenet,
} from "@lib/util/hirlevel-feliratkozas"

import { knownText, translator, type KnownGroup } from "./index"
import { hu } from "./hu"

/**
 * THE TEXTS ANOTHER SYSTEM STORES. The header and footer words the OS editor writes back (and the built-in ones the footer keys) live
 * twice: in the code that owns the Hungarian text, and in the dictionary. MI PIROSIT: a catalogue default changes and the dictionary
 * does not follow (the English shop then shows the Hungarian words, silently); a built-in label is renamed without its key; two
 * Hungarian texts of one group collide (the reverse lookup would pick one); the Hungarian shop's output changes.
 */
const t = translator("hu")
const huErtekek = (csoport: KnownGroup) =>
  Object.values(hu[csoport] as Record<string, string>)

describe("a fejléc szövegei (headerText)", () => {
  it("pontosan az OS-katalógus fejléc-kezdőértékei, sem több, sem kevesebb", () => {
    const katalogus = KEZDOLAP_SZOVEGEK.filter(
      (sor) =>
        sor.kulcs.startsWith("fejlec.") &&
        sor.tipus === "szoveg" &&
        !sor.kulcs.endsWith(".kategoriak") &&
        sor.alap !== "",
    ).map((sor) => sor.alap)
    expect(new Set(huErtekek("headerText"))).toEqual(new Set(katalogus))
    expect(katalogus.length).toBeGreaterThan(15)
  })
})

describe("a lábléc szövegei (footerText)", () => {
  it("minden beépített felirat kulcsa a magyar szöveget adja vissza, és minden kulcs használatban van", () => {
    const hasznalt = new Set<string>()
    for (const h of [...SAJAT_HIVATKOZASOK, ...REGI_BOLT_HIVATKOZASOK]) {
      if (!h.kulcs) continue
      expect(t(h.kulcs), h.cimke).toBe(h.cimke)
      hasznalt.add(h.cimke)
    }
    for (const [oszlop, kulcs] of Object.entries(OSZLOP_KULCSOK)) {
      expect(t(kulcs)).toBe(OSZLOP_CIMEK[oszlop as keyof typeof OSZLOP_CIMEK])
      hasznalt.add(t(kulcs))
    }
    for (const d of JOGI_DOKUMENTUMOK) {
      const kulcs = JOGI_KULCS[d.slug]
      expect(kulcs, `${d.slug} kulcsa`).toBeDefined()
      expect(t(kulcs!), d.slug).toBe(d.cim)
      hasznalt.add(d.cim)
    }
    expect(new Set(huErtekek("footerText"))).toEqual(hasznalt)
  })

  it("a fizetési opciók képének leírása és az alsó sor ugyanaz, mint eddig", () => {
    expect(t("footer.paymentAlt")).toBe(FIZETESI_OPCIOK_KEP.alt)
    expect(t("footer.rights", { year: 2026, name: "Bolt" })).toBe(
      "© 2026 Bolt. Minden jog fenntartva.",
    )
    expect(t("footer.openingHours")).toBe("Nyitvatartás:")
  })
})

describe("a hírlevél szövegei (newsletter)", () => {
  it("a mezők a bolt kezdőértékei, az üzenetek a mostani üzenetek", () => {
    expect(t("newsletter.title")).toBe(HIRLEVEL_ALAP.title)
    expect(t("newsletter.text")).toBe(HIRLEVEL_ALAP.text)
    expect(t("newsletter.consent")).toBe(HIRLEVEL_ALAP.consent_text)
    expect(t("newsletter.button")).toBe(HIRLEVEL_ALAP.button)
    expect(hirlevelUzenet("hu")).toEqual(HIRLEVEL_UZENET)
  })

  it("a hozzájárulás linkelt kifejezése a magyar szövegben ott van, az angolban is", () => {
    for (const nyelv of ["hu", "en"] as const) {
      const fordit = translator(nyelv)
      const minta = new RegExp(fordit("newsletter.consentLinkPattern"), "i")
      expect(minta.test(fordit("newsletter.consent")), nyelv).toBe(true)
    }
  })
})

describe("az ismert szöveg keresése", () => {
  it("egy csoporton belül nincs két azonos magyar szöveg (a fordított keresés egyértelmű)", () => {
    for (const csoport of ["headerText", "footerText", "newsletter"] as const) {
      const ertekek = huErtekek(csoport)
      expect(new Set(ertekek).size, csoport).toBe(ertekek.length)
    }
  })

  it("magyarra nem fordít, az angol az ismert szöveget adja, a máshol írtat nem", () => {
    expect(knownText("hu", "footerText", "Oldaltérkép")).toBeUndefined()
    expect(knownText("en", "footerText", "Oldaltérkép")).toBe("Sitemap")
    expect(knownText("en", "footerText", "Blog")).toBeUndefined()
    expect(knownText("en", "headerText", "Nyitva ma 10–19 óráig")).toBe(
      "Open today 10:00–19:00",
    )
    // egy szöveg a MÁSIK csoportban nem találat
    expect(knownText("en", "headerText", "Oldaltérkép")).toBeUndefined()
  })
})
