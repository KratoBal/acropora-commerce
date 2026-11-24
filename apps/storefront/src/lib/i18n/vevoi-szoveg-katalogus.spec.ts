import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  VEVOI_SZOVEG_CSOPORTOK,
  vevoiSzovegKatalogus,
} from "./vevoi-szoveg-katalogus"

/**
 * A VEVŐI SZÖVEGEK KATALÓGUSA EGY FORRÁSBÓL (kártya 7bfca4eb). MI PIROSÍT: a backend generált másolata
 * (`apps/backend/src/modules/customer-texts/catalog.generated.ts`) eltér a szótártól (valaki szöveget írt át, és nem generálta
 * újra); egy helyőrző a katalógusba kerül; egy kulcs csoport nélkül marad; egy csoport üres.
 *
 * ÚJRAGENERÁLÁS: `KATALOGUS_IRAS=1 npx vitest run src/lib/i18n/vevoi-szoveg-katalogus.spec.ts` (az apps/storefront-ból).
 */
const BACKEND = join(
  __dirname,
  "../../../../backend/src/modules/customer-texts/catalog.generated.ts",
)

const generalt = (): string =>
  [
    "// GENERÁLT FÁJL, kézzel ne írd: a kirakat szótárából jön (apps/storefront/src/lib/i18n/vevoi-szoveg-katalogus.ts).",
    "// Újragenerálás: KATALOGUS_IRAS=1 npx vitest run src/lib/i18n/vevoi-szoveg-katalogus.spec.ts (az apps/storefront-ból).",
    "export type CustomerTextGroup =",
    ...VEVOI_SZOVEG_CSOPORTOK.map((c) => `  | ${JSON.stringify(c.id)}`),
    "",
    "export const CUSTOMER_TEXT_GROUPS: readonly CustomerTextGroup[] = " +
      JSON.stringify(VEVOI_SZOVEG_CSOPORTOK.map((c) => c.id)),
    "",
    "export const CUSTOMER_TEXT_CATALOG: readonly { key: string; group: CustomerTextGroup; hu: string; en: string }[] = " +
      JSON.stringify(vevoiSzovegKatalogus(), null, 2),
    "",
  ].join("\n")

describe("a vevői szövegek katalógusa", () => {
  it("a backend másolata a szótárból generált (egy forrás)", () => {
    const most = generalt()
    if (process.env.KATALOGUS_IRAS === "1") writeFileSync(BACKEND, most)
    expect(readFileSync(BACKEND, "utf8")).toBe(most)
  })

  it("helyőrző nem kerül be, minden kulcsnak csoportja van, és minden csoportnak van szövege", () => {
    const katalogus = vevoiSzovegKatalogus()
    for (const sor of katalogus) {
      expect(sor.hu).not.toMatch(/KITÖLTENDŐ|TO BE FILLED/)
      expect(sor.en).not.toMatch(/KITÖLTENDŐ|TO BE FILLED/)
    }
    expect(new Set(katalogus.map((s) => s.key)).size).toBe(katalogus.length)
    for (const csoport of VEVOI_SZOVEG_CSOPORTOK)
      expect(katalogus.some((s) => s.group === csoport.id)).toBe(true)
    // az elallas es a hibabejelentes a sajat csoportjaba kerul, nem a rendeles allapotaba
    expect(
      katalogus.find((s) => s.key === "guestOrder.withdrawal.title")?.group,
    ).toBe("elallas")
    expect(
      katalogus.find((s) => s.key === "guestOrder.problem.title")?.group,
    ).toBe("hibabejelentes")
  })
})
