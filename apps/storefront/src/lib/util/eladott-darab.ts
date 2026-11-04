import { STORE_NAME } from "@lib/store"
import { TERMEKLISTA_MEZOK } from "@lib/util/termeklista-mezok"
import {
  valtozatKaphato,
  type ElerhetosegValtozat,
} from "@modules/products/components/stock-state/availability"

/**
 * AZ ELADOTT EGYEDI DARAB LAPJA (V2.4, kartya 0c1265d2; korall szovegei:
 * exchange/otletek-2026-11-04/v-feluleti-szovegek.md, V2.4 szakasz).
 *
 * A teszt kirakaton az eladott egyedi peldany PUBLIKALT marad, nulla keszlettel
 * (merve 2026-11-04: harom `unique_piece` termek, mind 0 darab), tehat a lapja
 * megvan; ez a modul a most kaphato hasonlo darabokat adja hozza, elol az azonos
 * fajjal, es a lapcimet ("Nem elérhető: [nev]"). A cimke es a lapcim JELEN
 * IDEJU marad (acrobot, 2026-11-04, 42122; korabban 14559): a teszt Medusan 1918
 * valtozatbol 24-nek van keszlete, a nulla tehat ma sem eladas-meres, es egy
 * "elvittek"/"Eladva:" alak valotlant allitana.
 *
 * A FAJ MA A CIMBOL JON, ES EZ BECSLES: a katalogusban nincs fajmezo, a korallok
 * cime viszont latin binomialissal kezdodik ("Acropora abrolhosensis ULTRA"). Ha a
 * cim nem ilyen, nincs faj, es a kategoria adja a hasonlokat. Amikor a fajnev-lista
 * (korall, fajnev-lista.csv) bekerul az adatba, ez a fuggveny cserelendo.
 */

/**
 * A kaphatosag ellenorzesehez KELL a `manage_inventory` es az `allow_backorder`:
 * az alapertelmezett listamezok csak a darabszamot kerik, es nelkuluk a
 * `valtozatKaphato` minden valtozatot kaphatonak lat (`!manage_inventory`). A
 * hivo `fields`-e felulir (lasd `termeklap-fields.ts`), ezert a teljes keszlet all itt.
 */
export const ELADOTT_LAP_MEZOK = `${TERMEKLISTA_MEZOK}+variants.manage_inventory,+variants.allow_backorder`

export interface DarabTermek {
  id: string
  title?: string | null
  metadata?: Record<string, unknown> | null
  variants?: ElerhetosegValtozat[] | null
}

/** A faj a cimbol: "Acropora abrolhosensis ..." -> "acropora abrolhosensis"; kulonben null. */
export function fajKulcs(cim: string | null | undefined): string | null {
  const m = /^([A-Z][a-z]+)\s+([a-z][a-z-]+)\b/.exec(cim?.trim() ?? "")
  return m ? `${m[1]!.toLowerCase()} ${m[2]}` : null
}

const nemzetseg = (faj: string | null) => faj?.split(" ")[0] ?? null

/**
 * A most kaphato hasonlo darabok: a sajat termek nelkul, csak kaphato valtozattal,
 * elol az azonos faj, utana az azonos nemzetseg, utana a tobbi; a csoporton belul
 * a bemenet sorrendje marad (a gondozott kapcsolat sorrendje vagy a kategoria).
 */
export function kaphatoHasonlok<T extends DarabTermek>(
  jeloltek: T[],
  sajat: DarabTermek,
  max: number,
): T[] {
  const faj = fajKulcs(sajat.title)
  const nem = nemzetseg(faj)
  const rang = (t: T) => {
    const f = fajKulcs(t.title)
    if (faj && f === faj) return 0
    if (nem && nemzetseg(f) === nem) return 1
    return 2
  }
  return jeloltek
    .filter((t) => t.id !== sajat.id)
    .filter((t) => (t.variants ?? []).some((v) => valtozatKaphato(v)))
    .map((t, i) => ({ t, i, r: rang(t) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, max)
    .map(({ t }) => t)
}

/** A lapcim nem elerheto egyedi darabnal: "[elotag][nev] | Acropora", a nev rovidul, hogy 60 karakterbe ferjen. */
export function nemElerhetoLapCim(
  nev: string,
  elotag: string,
  max: number = 60,
): string {
  const vege = ` | ${STORE_NAME}`
  const hely = max - elotag.length - vege.length
  const rovid = nev.length > hely ? `${nev.slice(0, hely - 1).trimEnd()}…` : nev
  return `${elotag}${rovid}${vege}`
}
