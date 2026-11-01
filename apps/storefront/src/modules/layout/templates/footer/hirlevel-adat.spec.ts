import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"

import { en } from "@lib/i18n/dictionary/en"

import { HIRLEVEL_ALAP, hirlevelAdat } from "./hirlevel-adat"

/*
  A HIRLEVEL-SOR ADATA (kirakat-lablec-kep). MI PIROSIT: a lap sajat szovege
  elter a bolt DEFAULT_NEWSLETTER-etol (a feliratkozas mast rogzitene, mint
  amit a vevo latott); a kikapcsolt sor megis latszik; egy serult sor felig
  ervenyesul.
*/
const rekord = (newsletter: unknown): KezdolapTartalom => ({
  texts: {},
  slides: null,
  newsletter: newsletter as KezdolapTartalom["newsletter"],
})

describe("a hírlevél-sor adata", () => {
  it("a lap saját szövegei betűre a bolt alapszövegei", () => {
    const bolt = readFileSync(
      join(
        __dirname,
        "../../../../../../backend/src/modules/newsletter/defaults.ts",
      ),
      "utf-8",
    )
    // pozitiv kontroll: tenyleg a bolt alapsorat olvastuk
    expect(bolt).toContain("export const DEFAULT_NEWSLETTER")
    for (const szoveg of [
      HIRLEVEL_ALAP.title,
      HIRLEVEL_ALAP.text,
      HIRLEVEL_ALAP.consent_text,
      HIRLEVEL_ALAP.button,
    ])
      expect(bolt).toContain(JSON.stringify(szoveg))
  })

  /*
    AZ ANGOL HOZZAJARULAS A BOLT SZOVEGE IS: az angol urlap `locale: "en"`-t kuld, es a bolt az alap-sorhoz a
    `DEFAULT_CONSENT_TEXT_EN`-t rogzíti. MI PIROSIT: ha a lap angol mondata es a bolt konstansa betuben elter (a vevo mast
    olvasott, mint amit a bolt rogzit); ha az angol lap egy KEZZEL irt (OS) hozzajarulast is lefordit.
  */
  it("az angol hozzájárulás-mondat betűre a bolt DEFAULT_CONSENT_TEXT_EN-je, és az angol sor ezt mutatja az alapsorra", () => {
    const bolt = readFileSync(
      join(
        __dirname,
        "../../../../../../backend/src/modules/newsletter/defaults.ts",
      ),
      "utf-8",
    )
    expect(bolt).toContain("export const DEFAULT_CONSENT_TEXT_EN")
    expect(bolt).toContain(JSON.stringify(en.newsletter.consent))
    expect(hirlevelAdat(null, "en")?.hozzajarulas).toBe(en.newsletter.consent)
    // amit valaki az OS-ben irt, azt az angol lap is ugy mutatja
    const sajat = {
      ...HIRLEVEL_ALAP,
      consent_text: "Elfogadom a feltételeket.",
    }
    expect(hirlevelAdat(rekord(sajat), "en")?.hozzajarulas).toBe(
      "Elfogadom a feltételeket.",
    )
  })

  it("beállítatlan vagy sérült sor: a lap saját sora; kikapcsolva: nincs sor", () => {
    for (const t of [
      null,
      rekord(undefined),
      rekord(null),
      rekord({ enabled: true }),
    ])
      expect(hirlevelAdat(t)?.hozzajarulas).toBe(HIRLEVEL_ALAP.consent_text)
    expect(
      hirlevelAdat(rekord({ ...HIRLEVEL_ALAP, enabled: false })),
    ).toBeNull()
  })

  it("az OS sora áll, a hozzájárulás és a gomb trimmelve", () => {
    expect(
      hirlevelAdat(
        rekord({
          enabled: true,
          title: "",
          text: "Szöveg",
          consent_text: "  Hozzájárulok.  ",
          button: " Kérem ",
        }),
      ),
    ).toEqual({
      cim: "",
      szoveg: "Szöveg",
      hozzajarulas: "Hozzájárulok.",
      gomb: "Kérem",
    })
  })
})
