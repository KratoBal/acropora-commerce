import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * MINDEN HASZNALT TERV-TOKEN LETEZZEN -- BEJARO HALO, NEM KEZZEL IRT LISTA.
 *
 * === MIERT LETEZIK ===
 *
 * Egy `var(--terv-valami)`, aminek nincs definicioja, NEM HIBAZIK: a bongeszo
 * egyszeruen nem alkalmaz erteket. A gomb hatter nelkul marad, a szoveg
 * orokolt szint kap -- es a lap tovabb mukodik. Nema kar.
 *
 * Ez nem elmeleti: egy token ATNEVEZESE vagy KIVEZETESE pontosan igy sul el.
 * Ha kilenc hasznalatbol egy kimarad, a tobbi nyolc helyesen valtozik, es a
 * kilencedik csendben elveszti a szinet.
 *
 * === MIERT BEJARO, ES NEM FELSOROLAS ===
 *
 * A repo tobbi halojanak tanulsaga (`kosar-tokenek.spec.ts`,
 * `confirm-usage.component.test.ts`): egy KEZZEL irt fajl-lista pontosan az UJ
 * esetet hagyja ki -- azt, amiert a halo letezik. Ezert ez a keszlet a
 * FORRASBOL olvassa mind a ket oldalt: a definiciokat a `globals.css`-bol, a
 * hasznalatokat a fa bejarasabol.
 *
 * === A HATARA, KIMONDVA ===
 *
 * Azt meri, hogy a hasznalt token LETEZIK-E, nem azt, hogy a HELYES token-e.
 * A rossz, de letezo token (peldaul a fo cselekvesen a lenyomott arnyalat) ezen
 * atmegy -- azt komponens-szintu allitasok fogjak meg, nev szerint.
 *
 * === ES A DEFINICIOS OLDAL IS SZUKEBB VOLT, MINT A NEVE (acrobot merese,
 * msg_id 14811) ===
 *
 * Az elso valtozat KIZAROLAG a `globals.css`-bol olvasta a definiciokat, es
 * kozben a hasznalati oldalrol KIHAGYTA ugyanazt a fajlt. A ket szukites
 * pontosan kioltotta egymast, ezert lattunk nulla arvat -- a hiba NEM lett
 * volna lathato.
 *
 * Harom token ugyanis nem a stiluslapban szuletik, hanem a `next/font`
 * `variable` mezojeben (`app/layout.tsx`): `--terv-betu-fo`,
 * `--terv-betu-mono`, `--terv-betu-kiemelt`. A `globals.css` HASZNALJA oket
 * (a `-lanc` valtozokban), de nem DEFINIALJA.
 *
 * Amig ezt nem tudta a halo, egy TELJESEN JOGOS valtoztatas fordította volna
 * pirosra: aki egy komponensben kozvetlenul `var(--terv-betu-fo)`-t ir, arvat
 * kapott volna. **Hamis piros**, es annak az ara az, hogy a kovetkezo ember a
 * HALOT kezdi gyanusitani -- pont azt, amiert letezik.
 *
 * Ezert a definicios oldal ket forrasbol olvas, es MIND A KETTO gepi: a
 * stiluslap `--terv-*:` sorai, es a layout `variable: "--terv-*"` mezoi. Kezzel
 * irt kivetel-lista nincs, mert az pontosan az uj esetet hagyna ki.
 */
const GYOKER = join(__dirname, "..")
const CSS = join(__dirname, "globals.css")
const LAYOUT = join(GYOKER, "app", "layout.tsx")

/**
 * A HALO NEM MERI SAJAT MAGAT -- ES EZT MOST MASODSZOR TANULTAM MEG.
 *
 * Az elso futasa EGY arvat talalt, es az a SAJAT KOMMENTEMBOL jott: a fenti
 * magyarazat egy pelda-tokent idez. Ugyanez tortent a kornyezeti valtozok
 * halojanal is (2026-09-08): a bejaro a sajat fixture-jet olvasta be, es negy
 * nem letezo valtozot jelentett.
 *
 * KET JAVITAS LETEZIK, ES A KULONBSEGUK A LENYEG:
 *
 *   a pelda-token nevenek kizarasa  ->  KEZZEL karbantartott kivetel; a
 *                                       kovetkezo pelda mas nevet kap, es
 *                                       ujra atcsuszik
 *   a SAJAT FAJL kizarasa           ->  SZERKEZETI; nem veszit semmit, mert
 *                                       egy halo nem hasznal terv-tokent
 *
 * Ezert az onmaga kizarasa all itt, nem a nev-kivetel.
 *
 * ES A `globals.css` MAR NINCS KIZARVA A HASZNALATI OLDALROL. Eddig ott allt,
 * es EPP AZ VOLT A MASIK FELE annak a keteles vaksagnak, amit a fenti szakasz
 * ir le: a stiluslap harom `var(--terv-betu-*)` hivast tartalmaz, es amig a
 * definicios oldal is csak onnan olvasott, ez a harom hasznalat egyszeruen nem
 * letezett a halo szamara.
 *
 * Most mind a ketto latszik, es ez a harom hivas ELO kontroll: ha a layout
 * beolvasasa elromlik, ok fordulnak arvava.
 */
const ONMAGA = join(__dirname, "terv-token-hasznalat.spec.ts")

const forrasok = (mappa: string): string[] => {
  const ki: string[] = []
  for (const nev of readdirSync(mappa)) {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) {
      ki.push(...forrasok(ut))
      continue
    }
    if (/\.(ts|tsx|css)$/.test(nev) && ut !== ONMAGA) ki.push(ut)
  }
  return ki
}

const DEFINIALT = new Set([
  ...Array.from(
    readFileSync(CSS, "utf-8").matchAll(/(--terv-[a-z0-9-]+)\s*:/g),
    (m) => m[1],
  ),
  ...Array.from(
    readFileSync(LAYOUT, "utf-8").matchAll(
      /variable:\s*"(--terv-[a-z0-9-]+)"/g,
    ),
    (m) => m[1],
  ),
])

const FAJLOK = forrasok(GYOKER)

const HASZNALAT = FAJLOK.flatMap((ut) =>
  Array.from(
    readFileSync(ut, "utf-8").matchAll(/var\((--terv-[a-z0-9-]+)\)/g),
    (m) => ({ token: m[1], ut: ut.replace(GYOKER + "/", "") }),
  ),
)

describe("a terv-tokenek hasznalata", () => {
  /**
   * ISMERT POZITIV KONTROLL, ELOL. Egy ures bejaras ugyanugy nezne ki, mint egy
   * tiszta eredmeny: nulla arva token. Ezert eloszor azt mutatjuk meg, hogy a
   * bejaras LAT fajlokat, es LAT bennuk token-hivatkozast.
   */
  it("a bejárás lát fájlokat, definíciókat és használatokat", () => {
    expect(FAJLOK.length).toBeGreaterThanOrEqual(50)
    expect(DEFINIALT.size).toBeGreaterThanOrEqual(15)
    expect(HASZNALAT.length).toBeGreaterThanOrEqual(20)
  })

  /**
   * ES A MASODIK FORRAS KULON KONTROLLT KAP, NEV SZERINT.
   *
   * A darabszam-kontroll (`DEFINIALT.size >= 15`) ezt NEM fogja meg: a
   * stiluslap egymaga tobb mint tizenotot ad, tehat ha a layout beolvasasa
   * elnemul -- atnevezik a fajlt, atirjak a `variable` mezot, elmozdul a
   * mappa --, a szam valtozatlan marad, es a halo csendben visszaesik az elso
   * valtozatra.
   *
   * Ez ugyanaz az alak, mint a nulla talalat: a hiany nem kiabal, hanem
   * hallgat. Ezert a harom betutipus-token NEV SZERINT all itt.
   */
  it("a betűtípus-tokenek a layoutból is definiáltnak számítanak", () => {
    for (const token of [
      "--terv-betu-fo",
      "--terv-betu-mono",
      "--terv-betu-kiemelt",
    ]) {
      expect(DEFINIALT.has(token)).toBe(true)
    }
  })

  /**
   * A NEV NEM NEVEZ MEG FORRAST, ES EZ SZANDEKOS.
   *
   * Eddig "letezik a globals.css-ben" volt, es az a valtoztatas ELOTTI vilagot
   * irta le: a `DEFINIALT` mostantol KET forrasbol all, tehat egy token akkor
   * is definialt, ha a stiluslapban SEHOL nem szerepel. Egy piros allitas
   * azzal a nevvel egyetlen fajlhoz kuldene a kovetkezo embert, es ott nem
   * talalna meg semmit -- a hianyzo definicio a layoutban lenne.
   *
   * Forrast azert nem nevez meg, mert a forrasok SZAMA epp most valtozott, es
   * valtozhat megint. (acrobot javaslata, msg_id 14851.)
   */
  it("minden használt terv-token definiálva van", () => {
    const arvak = HASZNALAT.filter((h) => !DEFINIALT.has(h.token)).map(
      (h) => `${h.token} (${h.ut})`,
    )

    expect(arvak).toEqual([])
  })
})
