import {
  elerhetosegekCanonical,
  fizetesCanonical,
  fooldalCanonical,
  kepesTajekoztatoCanonical,
  markaCanonical,
  storeCanonical,
  szallitasCanonical,
  termeklapCanonical,
  valogatasCanonical,
} from "./lap-canonical"
import { fogyasztobaratBekapcsolva } from "./fogyasztobarat"
import { leszarmazottAzonositok } from "./kategoria-leszarmazottak"
import { termekRobotsJel } from "@lib/seo/oldal-metaadat"
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
 * === A LABLEC SAJAT OLDALAI (commerce-audit-p1) ===
 *
 * Az Elerhetosegek, a Szallitas es a Fizetes mindig benne van; a Kepes vasarloi
 * tajekoztato csak bekapcsolt Fogyasztobaratnal (kulonben egy mondatnyi oldal).
 * A jogi dokumentumok (`/jogi/<slug>`) szandekosan NINCSENEK benne: ma a
 * Fogyasztobarat-kapcsolo kikapcsolt, es a lap csak a mai bolt cimet mutatja.
 *
 * === AMI SZANDEKOSAN NINCS BENNE ===
 *
 * A fiok-, kosar-, penztar- es rendeles-utak: nem nyilvanos tartalmak. A
 * gyujtemeny-lapok (`/collections/[handle]`) sem: azokra ma egyetlen menupont
 * sem mutat, tehat elobb a szerepuket kellene eldonteni, nem a sitemapet
 * boviteni. Egy sitemap, ami olyan lapot ajanl, amit a bolt maga nem kinal,
 * ugyanaz a hiba kisebben, mint amibol ez a fajl szuletett.
 */

type Sor = {
  handle?: string | null
  updated_at?: unknown
  metadata?: Record<string, unknown> | null
}
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
   * A FOGYASZTOBARAT-KAPCSOLO ALLASA. A Kepes vasarloi tajekoztato tartalmat a
   * Fogyasztobarat adja; kikapcsolva az oldal csak egy mondatot mutat, es egy
   * sitemap nem ajanl olyan oldalt, ami nem kinal tartalmat. Alapbol a
   * kornyezet kapcsoloja.
   */
  fogyasztobarat?: boolean
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
  /**
   * A saját robots-tiltású termékek handle-jei (t13): ezek kimaradnak a
   * termék-sitemapből. A commerce `/store/noindex-products` adja.
   */
  noindexTermekek?: ReadonlySet<string>
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
/**
 * EGY UTVONAL-SZEGMENS KODOLT ALAKJA (commerce-audit-p1, S3). A sitemap
 * protokoll URL-kodolt cimeket var, es a lap kanonikus cime is az (a Next a
 * `params`-t kodolva adja). A Medusa viszont a handle-t ekezetesen is adhatja
 * (`kétkomponensű`), ezt nyersen kiirva a sitemap mas cimet ajanlana, mint
 * amit a lap sajat canonicaljanak vall. A fuggveny mindket bemenetet UGYANARRA
 * az alakra hozza: elobb dekodol (ha ervenyes `%XX`), aztan kodol, tehat egy
 * mar kodolt handle nem kodolodik ketszer (`lap-canonical.ts` fejlece: a
 * ketszeres kodolas hibaja mar elofordult). Hibas `%` sorozatnal a nyers
 * szoveget kodolja.
 */
export function utSzegmensKodolt(szegmens: string): string {
  let dekodolt = szegmens
  try {
    dekodolt = decodeURIComponent(szegmens)
  } catch {
    // nem ervenyes %XX sorozat: a nyers szoveg a szegmens
  }
  return encodeURIComponent(dekodolt)
}

export function sitemapReszek({
  origin,
  orszagok,
  kategoriak,
  termekesKategoriak,
  markak = [],
  landingek = [],
  noindexTermekek,
  fogyasztobarat = fogyasztobaratBekapcsolva(),
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
    // a lablec sajat oldalai (commerce-audit-p1): ezek a lablec linkjei, es
    // mind indexelheto (a robots-jelolesuk `indexelhetoRobots`)
    reszek.lapok.push({ url: cim(elerhetosegekCanonical(countryCode)) })
    reszek.lapok.push({ url: cim(szallitasCanonical(countryCode)) })
    reszek.lapok.push({ url: cim(fizetesCanonical(countryCode)) })
    if (fogyasztobarat)
      reszek.lapok.push({ url: cim(kepesTajekoztatoCanonical(countryCode)) })

    for (const kategoria of kategoriak) {
      if (!kategoria.handle || !vanTermeke(kategoria)) continue
      reszek.kategoriak.push({
        url: cim(
          kategoriaCanonical(
            countryCode,
            kategoria.handle.split("/").map(utSzegmensKodolt),
          ),
        ),
        lastModified: utolsoModositas(kategoria.updated_at),
      })
    }

    for (const marka of markak) {
      if (!marka.handle) continue
      reszek.markak.push({
        url: cim(markaCanonical(countryCode, utSzegmensKodolt(marka.handle))),
        lastModified: utolsoModositas(marka.updated_at),
      })
    }

    for (const termek of termekek) {
      // a noindex-es termek (sajat robots-dontes, t13) nem kerul a sitemapbe
      if (
        !termek.handle ||
        noindexTermekek?.has(termek.handle) ||
        termekRobotsJel(termek.metadata).noindex
      )
        continue
      reszek.termekek.push({
        url: cim(
          termeklapCanonical(countryCode, utSzegmensKodolt(termek.handle)),
        ),
        lastModified: utolsoModositas(termek.updated_at),
      })
    }

    for (const landing of landingek) {
      if (!landing.handle) continue
      reszek.valogatasok.push({
        url: cim(
          valogatasCanonical(countryCode, utSzegmensKodolt(landing.handle)),
        ),
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
