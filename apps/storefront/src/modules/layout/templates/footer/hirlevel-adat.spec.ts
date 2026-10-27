import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"

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
