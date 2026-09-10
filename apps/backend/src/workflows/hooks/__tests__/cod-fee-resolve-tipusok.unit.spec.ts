import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * A KET UTANVET-DIJ HOROG MINDEN FELOLDASA NEVEZZE MEG A TIPUSAT.
 *
 * === MIERT EPP EZ A KET FAJL ===
 *
 * A repo osszes bukott CI-futasabol (35) tizennegy a backend
 * tipusellenorzesen bukott, es MIND A TIZENNEGY ebbol a ket fajlbol jott:
 * tizenharom az `order-created-cod-fee.ts` egy soran (TS2345), egy a
 * `refresh-cart-items-cod-fee.ts` masik soran (TS2571). (acrobot merese,
 * 2026-09-10, a teljes lista, nem minta.)
 *
 * === MI A HIBA ALAKJA ===
 *
 * A `MedusaContainer.resolve` ket tulterhelest ad. Az elso a `Cradle`
 * kulcsaira szol, es a `Cradle` alapertelmezese a `ModuleImplementations` --
 * egy URES interfesz, amit DECLARATION MERGING tolt fel. A feltoltest a
 * generalt `.medusa/types/augmentation-refs.d.ts` vegzi, es az a fajl a
 * CI-ben NINCS (a `verify` sajat mereseszkoze irja ki minden futason).
 *
 * Ha az augmentacio nincs a programban, a kulcs nem `keyof Cradle`, a masodik
 * tulterheles all be, es a tipus `unknown` lesz. A tipus-argumentum ezt az
 * egesz utat megkeruli: nem kovetkeztet, hanem valaszt.
 *
 * === AMIT EZ AZ ALLITAS MER, ES AMIT NEM ===
 *
 * A FORRASSZOVEGET meri, nem a forditot. Helyben ugyanis a hiba NEM all elo:
 * a tipus-argumentum elvetele utan a `tsc` tovabbra is zold (merve, a rontas
 * bizonyitottan landolt). Vagyis ezt az allitast a CI-ben tapasztalt hiba
 * indokolja, nem egy helyben reprodukalhato piros -- es ezert szoveg-alapu.
 *
 * A KOMMENT-KISZEDES BENNE VAN, ES A SZUKSEGESSEGE MERVE -- de NEM ugy, ahogy
 * elsore leirtam. Eloszor azt allitottam, hogy a magyarazo kommentek maguk is
 * idezik a keresett alakot; ez HAMIS. A ket fajl kommentjei a tulterheleseket
 * `resolve<K extends keyof Cradle>(...)` alakban irjak le, PONT NELKUL, tehat a
 * `\.resolve\s*\(` mintara nem illeszkednek. A kiszedes kiiktatasa ezert NULLA
 * pirosat adott.
 *
 * A bizonyitas ketoldalu rontassal jott (2026-09-10):
 *
 *     egy `.resolve(` alak KOMMENTBE teve, kiszedessel     zold
 *     ugyanaz, a kiszedes kiiktatva                        piros
 *
 * Vagyis a kiszedes VALODI kepesseg, csak a mai kommentek nem probaljak ki.
 * Ezert marad benne: a kovetkezo magyarazat, ami peldat ir a tiltott alakra,
 * kulonben hamis pirosat adna -- es a pelda epp a tiltott alakot mutatna meg.
 */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const HOROG = join(__dirname, "..")

const olvas = (nev: string) =>
  kodSzoveg(readFileSync(join(HOROG, nev), "utf-8"))

const FAJLOK = ["order-created-cod-fee.ts", "refresh-cart-items-cod-fee.ts"]

describe("az utanvet-dij horgok feloldasai", () => {
  it.each(FAJLOK)("%s: minden resolve megnevezi a tipusat", (nev) => {
    const kod = olvas(nev)

    const tipusNelkul = kod
      .split("\n")
      .filter((sor) => /\.resolve\s*\(/.test(sor))

    expect(tipusNelkul).toEqual([])
  })

  /**
   * ISMERT POZITIV KONTROLL: a fenti allitas akkor is zold lenne, ha a fajlban
   * EGYETLEN feloldas sem allna -- vagy ha a komment-kiszedes veletlenul az
   * egesz fajlt eltuntetne. Ez bizonyitja, hogy van mit merni.
   */
  it("a ket fajlban egyuttesen harom tipusos feloldas all", () => {
    const talalatok = FAJLOK.flatMap((nev) =>
      olvas(nev)
        .split("\n")
        .filter((sor) => /\.resolve<[^>]+>\s*\(/.test(sor)),
    )

    expect(talalatok).toHaveLength(3)
  })
})
