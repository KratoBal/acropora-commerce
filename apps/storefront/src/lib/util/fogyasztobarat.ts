import sanitizeHtml from "sanitize-html"

/**
 * A FOGYASZTOBARAT BEKOTESE (Balazs kerese, 2026-10-05, Fogyasztobarat
 * implementacio szal; acrobot 26233-26237).
 *
 * A jogi szoveget NEM mi irjuk: a Fogyasztobarat adja, es az UNAS-on evek ota
 * ugyanez fut. Mi a widgetet kotjuk be minden oldalra, es a hat dokumentumot a
 * sajat oldalunkon jelenitjuk meg.
 *
 * === A DOKUMENTUMOT A BONGESZO KERI LE, NEM A SZERVER ===
 *
 * Az `api.php` csak a bejegyzett domainrol (Referer) adja a dokumentumot, mas
 * Refererre `Hibakod: 1002` a valasz (acrobot merese, 2026-10-05). A szerveroldali
 * keresbe Referert hamisitani tilos (acrobot 26236). A bongeszo a valodi
 * Referert kuldi, tehat a kirakat domainjet a Fogyasztobarat adminban kell
 * bejegyezni (a teszt kirakatnal is) -- addig az oldal olvashato hibat mutat.
 */

/**
 * A KAPCSOLO, ALAPBOL KI (Balazs, 2026-10-05 10:37 UTC, acrobot 26244): a
 * Fogyasztobarat hibas oldalt eszlelt, es levelet irt. Amig ki van kapcsolva,
 * a kirakat SEMMILYEN hivast nem tesz az admin.fogyasztobarat.hu fele: a widget
 * nem renderel, a dokumentum-oldal nem kerdez le semmit. Az eles atallaskor
 * kapcsoljuk be (`NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED=true`). Csak a pontosan
 * `true` ertek kapcsolja be.
 */
export function fogyasztobaratBekapcsolva(
  ertek: string | undefined = process.env.NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED,
): boolean {
  return ertek?.trim() === "true"
}

/** A bolt azonositoja a Fogyasztobaratnal; env-bol, alapbol a mai bolte. */
export const FOGYASZTOBARAT_ID =
  process.env.NEXT_PUBLIC_FOGYASZTOBARAT_ID?.trim() || "JPNFMVH0"

/** A widget szkriptje (a bolt minden oldalan). */
export const FOGYASZTOBARAT_WIDGET_SRC =
  "https://admin.fogyasztobarat.hu/h-api.js"

export type JogiDokumentum = {
  /** Az oldal cime a kirakatban: `/jogi/<slug>`. */
  slug: string
  /** Az `api.php` kulcsa (acrobot 26237). */
  kulcs: string
  cim: string
  /**
   * A MAI BOLT megfelelo oldala, ha van ilyen. A teszt kirakaton a dokumentum
   * nem jon le (a Fogyasztobarat csak a bejegyzett domainnek adja), ott erre
   * mutatunk. Az eles atallaskor a dokumentum maga jelenik meg, ezt nem kell
   * allitani (Balazs, 2026-10-05 10:31 UTC).
   */
  maiBoltCim?: string
}

/** A het dokumentum, egy helyen: az oldal, a lablec es az ASZF-rogzites is innen olvas. */
export const JOGI_DOKUMENTUMOK: readonly JogiDokumentum[] = [
  {
    slug: "aszf",
    kulcs: "aszf",
    cim: "Általános szerződési feltételek",
    maiBoltCim: "https://shop.acropora.hu/shop_help.php?tab=terms",
  },
  {
    slug: "adatkezeles",
    kulcs: "at",
    cim: "Adatkezelési tájékoztató",
    maiBoltCim: "https://shop.acropora.hu/shop_help.php?tab=privacy",
  },
  { slug: "impresszum", kulcs: "imp", cim: "Impresszum" },
  {
    slug: "elallasi-jog",
    kulcs: "el_jog",
    cim: "Tájékoztató az elállási jogról",
  },
  {
    slug: "elallasi-nyilatkozat",
    kulcs: "em",
    cim: "Elállási nyilatkozat (minta)",
  },
  {
    slug: "szavatossag",
    kulcs: "szav_jog",
    cim: "Tájékoztató a szavatossági jogokról",
  },
  { slug: "suti", kulcs: "cookie", cim: "Süti tájékoztató" },
] as const

export function jogiDokumentum(slug: string): JogiDokumentum | null {
  return JOGI_DOKUMENTUMOK.find((d) => d.slug === slug) ?? null
}

/** A kirakat oldala a dokumentumnak. */
export const jogiOldal = (slug: string) => `/jogi/${slug}`

/** A dokumentum forrasa a Fogyasztobaratnal. */
export function dokumentumForras(kulcs: string, id = FOGYASZTOBARAT_ID) {
  return `https://admin.fogyasztobarat.hu/api.php?${encodeURIComponent(kulcs)}=${encodeURIComponent(id)}`
}

/**
 * A FOGYASZTOBARAT HIBAVALASZA. Nem bejegyzett domainrol `Hibakod: 1002`
 * jon, 200-as statusszal -- tehat a statusz nem eleg, a szoveget kell nezni.
 */
export function fogyasztobaratHibakod(szoveg: string): string | null {
  const talalat = /Hibak[oó]d:\s*(\d+)/i.exec(szoveg)
  return talalat ? talalat[1]! : null
}

/**
 * A KULSO HTML TISZTITASA, MIELOTT A LAPRA KERUL. A Fogyasztobarat HTML-t ad
 * (sajat stilussal); szkript, esemenykezelo, iframe, `style` NEM marad. A
 * szoveg szerkezete (cimek, bekezdesek, listak, tablazatok, linkek) igen.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "a",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "div",
    "span",
    "blockquote",
  ],
  allowedAttributes: { a: ["href", "name", "id", "rel"], "*": ["id"] },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
    }),
  },
}

export function tisztitottJogiSzoveg(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim()
}
