import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A LAP HATTEREN ALLO SZOVEG SZINE TOKENBOL JON.
 *
 * === AZ INVARIANS, ES MIERT EPP IGY ===
 *
 * A koltozes-kapcsolo (#103) ota ugyanaz a komponens KET vilagon jelenik meg,
 * es a lap hattere kozottuk MEGFORDUL:
 *
 *   vilagos:  --terv-hatter-lap  oklch(0.99 ...)   szoveg  oklch(0.2 ...)
 *   sotet:    --terv-hatter-lap  oklch(0.17 ...)   szoveg  oklch(0.95 ...)
 *
 * Egy BEIRT szurke ezert csak az egyik vilagon olvashato. Merve: a
 * `text-neutral-700` sotet szurke, a sotet lap hattere majdnem fekete.
 *
 * A `--terv-szoveg` es a `--terv-szoveg-halvany` viszont MINDKET vilagban
 * helyes, mert epp ezert tokenek.
 *
 * === ES AMIT EZ SZANDEKOSAN NEM TILT ===
 *
 * A jelveny SAJAT sotet pirulan all (`bg-neutral-900/85`), es azon a
 * borostyan szoveg mindket vilagon ugyanugy olvashato: az a szoveg NEM a lap
 * hatteren ul, hanem a sajat hatteren, ami nem fordul meg.
 *
 * Ezert a szabaly a SZOVEGSZINRE szol (`text-neutral-*`), a hatterre nem. Aki
 * ezt tagitani akarja, elobb dontse el, hogy a jelveny pirula rezre valt-e --
 * az kulon kerdes, es acrobotnal all.
 */

const FAJLOK = [
  "src/modules/products/components/stock-state/index.tsx",
  "src/modules/products/components/unique-piece-badge/index.tsx",
]

const olvas = (ut: string) => readFileSync(join(process.cwd(), ut), "utf-8")

/**
 * CSAK A `className` ERTEKEIT NEZZUK, NEM A TELJES FORRAST.
 *
 * ES EZT A KALIBRACIO HOZTA ELO, MIELOTT BEKERULT VOLNA: az elso valtozat a
 * teljes forrasban keresett, es AZONNAL elsult -- a sajat KOMMENTEMRE, ami
 * megnevezi a tiltott osztalyt (`text-neutral-700`), hogy a kovetkezo olvaso
 * ratalaljon.
 *
 * A komment megnevezese ERTEK, nem hiba: epp az a kivalto jel, amit keresni
 * fognak. Tehat nem a kommentet irtam at, hanem a merest szukitettem oda, ahol
 * egy szin tenylegesen hat: a `className` erteke.
 */
function osztalyok(forras: string): string {
  const talalt = forras.match(/className=(?:"[^"]*"|\{[^}]*\})/g) ?? []
  return talalt.join(" ")
}

describe("a két világon megjelenő szövegek színe", () => {
  /**
   * ISMERT POZITIV KONTROLL: a fajlok tenyleg ezek, ES tenyleg van bennuk
   * token-hivatkozas. Egy ures sopres ugyanigy nezne ki.
   */
  it("a fájlok olvashatók, és tényleg tokenre hivatkoznak", () => {
    for (const ut of FAJLOK) {
      const forras = olvas(ut)
      expect(forras.length).toBeGreaterThan(300)
      expect(forras).toContain("var(--terv-szoveg")
    }
  })

  /**
   * ISMERT POZITIV KONTROLL A SZUKITESHEZ: a `className`-kinyeres tenyleg
   * talal osztalyokat. Enelkul egy elrontott mintazat URES sztringet adna, es
   * az alabbi tiltas mindig zold maradna.
   */
  it("a className-kinyerés tényleg lát osztályokat", () => {
    for (const ut of FAJLOK) {
      expect(osztalyok(olvas(ut))).toContain("text-")
    }
  })

  it("egyik sem ír be kézzel szövegszínt", () => {
    const vetkesek = FAJLOK.filter((ut) =>
      /text-neutral-\d/.test(osztalyok(olvas(ut))),
    )

    expect(vetkesek).toEqual([])
  })

  /**
   * A JELVENY MAR NEM SAJAT PIRULA -- ES EZ AZ ALLITAS PONTOSAN UGY MUKODOTT,
   * AHOGY MEGIRTUK.
   *
   * Itt korabban az allt, hogy a jelveny hattere TOVABBRA IS beirt
   * (`bg-neutral-900/85`), es a sajat kommentje kimondta: "ha valaki ezt is
   * tokenre viszi, az DONTES, es akkor ez a sor pirosodik, hogy a dontes
   * latszodjon".
   *
   * A dontes 2026-09-08-on megszuletett (acrobot feloldasa, msg_id 14842), a
   * sor pirosra valt, es a valtozas emiatt NEM tudott csendben atmenni. Ezert
   * nem toroljuk, hanem MEGFORDITJUK: mostantol azt vedi, hogy a beirt szin ne
   * jojjon VISSZA.
   *
   * A valtas SZEMRE MAS jelvenyt ad (sotet pirula, borostyan szoveg helyett rez
   * hatter, sotet szoveggel), es a ket ertek EGYUTT mozdul: a sotet szoveg a
   * regi sotet hatteren olvashatatlan lenne.
   */
  it("a jelvény háttere tokenből jön, nem beírt osztályból", () => {
    const jelveny = osztalyok(olvas(FAJLOK[1]))

    expect(jelveny).not.toContain("bg-neutral-900/85")
    expect(olvas(FAJLOK[1])).toContain('background: "var(--terv-kiemel)"')
  })
})

/**
 * A JELVENY ALAKJA: SZOGLETES, NEM PIRULA.
 *
 * Nautilus merese a tervfajlbol (2026-09-07): a teljes tervben huszonegy
 * `border-radius` all -- 16 darab `50%`, 2 darab `8px`, 1 darab `6px` --, es a
 * jelveny EGYIKBEN SINCS BENNE.
 *
 * A `rounded-full` a starter szokasa volt. Az "a pirula stimmel a terv tizenhat
 * korehez" ervet ugyanez a meres cafolja: az a tizenhat MASHOL van.
 */
describe("az egyedi példány jelvényének alakja", () => {
  const jelveny = () => osztalyok(olvas(FAJLOK[1]))

  /** ISMERT POZITIV KONTROLL: a kinyeres tenyleg a jelveny osztalyait latja. */
  it("a jelvény osztályai olvashatók", () => {
    expect(jelveny()).toContain("absolute")
    expect(jelveny()).toContain("left-3")
  })

  it("nincs rajta lekerekítés", () => {
    expect(jelveny()).not.toContain("rounded")
  })
})
