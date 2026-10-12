import {
  fooldalCanonical,
  markaCanonical,
  storeCanonical,
  termeklapCanonical,
  valogatasCanonical,
} from "./lap-canonical"
import { leszarmazottAzonositok } from "./kategoria-leszarmazottak"
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
type KategoriaSor = Sor & { id?: string; parent_category_id?: string | null }
export type TermekSor = Sor & { categories?: { id?: string }[] | null }

/**
 * A SITEMAP RESZEI TIPUSONKENT (FE-5, Balazs 6. dontese, 2026-10-07: "tipusonkent
 * kulon ... sitemap index hasznalhato kezelhetoseg miatt"). Mindegyik a sajat
 * `/sitemap/<tipus>.xml` cimen all, az index (`/sitemap.xml`) ezeket sorolja.
 */
export const SITEMAP_TIPUSOK = [
  "lapok",
  "kategoriak",
  "markak",
  "termekek",
  "valogatasok",
] as const
export type SitemapTipus = (typeof SITEMAP_TIPUSOK)[number]

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
  kategoriak: readonly KategoriaSor[]
  /**
   * AZ ÜRES KATEGÓRIA KISZŰRÉSE (FE-5): azok a kategória-azonosítók, amelyekben
   * legalább egy termék áll. Egy kategória akkor kerül be, ha ő maga VAGY egy
   * leszármazottja benne van (a kategórialap a leszármazottak termékeit is
   * mutatja). `undefined`: nincs adat, és ilyenkor NEM szűrünk -- egy hiányzó
   * mező nem ürítheti ki az egész kategória-sitemapet.
   */
  termekesKategoriak?: ReadonlySet<string>
  /**
   * A MARKAOLDALAK (SEO P0 PR 11): a marka-modul termekkel rendelkezo markai.
   * Ugyanugy kozosek, mint a kategoriak; hianyuk ures listat jelent.
   */
  markak?: readonly Sor[]
  /** A válogatások (SEO landing, t9); amíg nincs bekötve, üres. */
  landingek?: readonly Sor[]
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

function nemUres(
  kategoriak: readonly KategoriaSor[],
  termekes: ReadonlySet<string> | undefined,
): (k: KategoriaSor) => boolean {
  if (!termekes) return () => true
  const fa = kategoriak.filter(
    (k): k is KategoriaSor & { id: string } => typeof k.id === "string",
  )
  return (k) =>
    !k.id || leszarmazottAzonositok(fa, k.id).some((id) => termekes.has(id))
}

/** A bejegyzések típusonként, országonként a saját listájából. */
export function sitemapReszek({
  origin,
  orszagok,
  kategoriak,
  termekesKategoriak,
  markak = [],
  landingek = [],
}: SitemapBemenet): Record<SitemapTipus, SitemapBejegyzes[]> {
  const cim = (ut: string) => `${origin}${ut}`
  const reszek: Record<SitemapTipus, SitemapBejegyzes[]> = {
    lapok: [],
    termekek: [],
    kategoriak: [],
    markak: [],
    valogatasok: [],
  }
  const vanTermeke = nemUres(kategoriak, termekesKategoriak)

  for (const { countryCode, termekek } of orszagok) {
    reszek.lapok.push({ url: cim(fooldalCanonical(countryCode)) })
    reszek.lapok.push({ url: cim(storeCanonical(countryCode)) })

    for (const kategoria of kategoriak) {
      if (!kategoria.handle || !vanTermeke(kategoria)) continue
      reszek.kategoriak.push({
        url: cim(kategoriaCanonical(countryCode, kategoria.handle.split("/"))),
        lastModified: utolsoModositas(kategoria.updated_at),
      })
    }

    for (const marka of markak) {
      if (!marka.handle) continue
      reszek.markak.push({
        url: cim(markaCanonical(countryCode, marka.handle)),
        lastModified: utolsoModositas(marka.updated_at),
      })
    }

    for (const termek of termekek) {
      if (!termek.handle) continue
      reszek.termekek.push({
        url: cim(termeklapCanonical(countryCode, termek.handle)),
        lastModified: utolsoModositas(termek.updated_at),
      })
    }

    for (const landing of landingek) {
      if (!landing.handle) continue
      reszek.valogatasok.push({
        url: cim(valogatasCanonical(countryCode, landing.handle)),
        lastModified: utolsoModositas(landing.updated_at),
      })
    }
  }

  return reszek
}

/** Az összes bejegyzés egy listában (a régi, lapos alak; a tesztek ezt is mérik). */
export function sitemapBejegyzesek(
  bemenet: SitemapBemenet,
): SitemapBejegyzes[] {
  const reszek = sitemapReszek(bemenet)
  return SITEMAP_TIPUSOK.flatMap((tipus) => reszek[tipus])
}

/**
 * A termekes kategoriak halmaza. Ha EGYETLEN termeken sem jott `categories`
 * mezo, a valasz nem hordozta az adatot: `undefined`, es a kategoriak
 * szures nelkul mennek ki (egy hianyzo mezo nem uritheti ki a listat).
 */
export function termekesKategoriakBol(
  sorok: readonly TermekSor[],
): Set<string> | undefined {
  if (!sorok.some((s) => Array.isArray(s.categories))) return undefined
  return new Set(
    sorok.flatMap((s) =>
      (s.categories ?? [])
        .map((c) => c.id)
        .filter((id): id is string => Boolean(id)),
    ),
  )
}
