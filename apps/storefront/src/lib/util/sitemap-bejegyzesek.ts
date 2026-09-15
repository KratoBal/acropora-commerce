import {
  fooldalCanonical,
  storeCanonical,
  termeklapCanonical,
} from "./lap-canonical"
import { kategoriaCanonical } from "./kategoria-canonical"

/**
 * MELYIK CIMEK KERULNEK A SITEMAPBE -- TISZTA FUGGVENYKENT.
 *
 * KULON FAJLBAN ALL, ES EZ NEM IZLES: az `app/sitemap.ts` a `next/headers`
 * modult importalja, tehat a benne allo dontes csak a Next futasidejevel egyutt
 * merheto. Ugyanaz a lepes, amit a `statikus-utak.ts` fejlece is kimond -- es
 * ugyanabbol a korbol valo: az a fajl is azert szuletett, mert egy dontes nem
 * volt merheto ott, ahol allt.
 *
 * === A CIMEK A CANONICAL FUGGVENYEKBOL JONNEK ===
 *
 * A lapok `alternates.canonical` erteke ugyanezekbol keszul. Ha itt kezzel
 * raknam ossze ugyanazt az utat, ket helyen allna ugyanaz a szabaly, es a
 * sitemap egyszer olyan cimet ajanlana, amit a lap maga nem tart kanonikusnak.
 *
 * === AMI SZANDEKOSAN NINCS BENNE ===
 *
 * A fiok-, kosar-, penztar- es rendeles-utak: nem nyilvanos tartalmak. A
 * gyujtemeny-lapok (`/collections/[handle]`) sem: azokra ma egyetlen menupont
 * sem mutat, tehat elobb a szerepuket kellene eldonteni, nem a sitemapet
 * boviteni. Egy sitemap, ami olyan lapot ajanl, amit a bolt maga nem kinal,
 * ugyanaz a hiba kisebben, mint amibol ez a fajl szuletett.
 */

type Sor = { handle?: string | null; updated_at?: unknown }

export type SitemapBemenet = {
  origin: string
  /**
   * ORSZAGONKENT SAJAT TERMEKLISTA -- ES EZ NEM TULBONYOLITAS.
   *
   * Az elso valtozat EGY orszagkod termekeit kerte le, es MINDEN orszagra
   * ugyanazt a listat sorolta fel. Ma egy regio van, tehat a kimenet helyes
   * volt; egy masodik piac megjelenesekor viszont a masodik orszag cimei az
   * ELSO orszag termeklistajabol keszultek volna. Nem hianyzo lista lett volna
   * belole, hanem HIHETO, teljesnek latszo lista rossz tartalommal -- es az
   * elso fajta latszik, a masodik nem. (acrobot lelete, 2026-09-15.)
   *
   * A tipus most szerkezetileg zarja ki: termeklistat csak orszagkoddal egyutt
   * lehet atadni.
   */
  orszagok: readonly { countryCode: string; termekek: readonly Sor[] }[]
  /**
   * A KATEGORIAK KOZOSEK, ES EZ MERT KULONBSEG, NEM FELEDEKENYSEG: a
   * `listProducts` azert kovetel orszagkodot, mert az ARAK regio-fuggok, a
   * `listCategories` viszont nem vesz fel ilyet -- a kategoria-fa nem
   * regionkent mas.
   */
  kategoriak: readonly Sor[]
}

export type SitemapBejegyzes = {
  url: string
  lastModified?: Date
}

/**
 * A `updated_at` a Medusa valaszabol jon, tehat ISMERETLEN alaku. Egy rossz
 * datum NEM ejtheti el a cimet: a sitemap erteke a CIM, a datum csak segitseg.
 */
export function utolsoModositas(ertek: unknown): Date | undefined {
  if (typeof ertek !== "string") return undefined
  const datum = new Date(ertek)
  return Number.isNaN(datum.getTime()) ? undefined : datum
}

export function sitemapBejegyzesek({
  origin,
  orszagok,
  kategoriak,
}: SitemapBemenet): SitemapBejegyzes[] {
  const bejegyzesek: SitemapBejegyzes[] = []
  const cim = (ut: string) => `${origin}${ut}`

  for (const { countryCode, termekek } of orszagok) {
    bejegyzesek.push({ url: cim(fooldalCanonical(countryCode)) })
    bejegyzesek.push({ url: cim(storeCanonical(countryCode)) })

    for (const kategoria of kategoriak) {
      if (!kategoria.handle) continue
      bejegyzesek.push({
        url: cim(kategoriaCanonical(countryCode, kategoria.handle.split("/"))),
        lastModified: utolsoModositas(kategoria.updated_at),
      })
    }

    for (const termek of termekek) {
      if (!termek.handle) continue
      bejegyzesek.push({
        url: cim(termeklapCanonical(countryCode, termek.handle)),
        lastModified: utolsoModositas(termek.updated_at),
      })
    }
  }

  return bejegyzesek
}
