import { generikusAlt } from "@lib/seo/generikus-alt"
import { ANGOL_HELYKITOLTOK } from "@lib/seo/oldal-metaadat"

import type { KepAdat, OldalKivonat } from "./kivonat"

/**
 * A RENDERELT HTML SEO-SZABALYAI (SEO frontend FE-8, roadmap 3/B, Balazs
 * 2026-10-07-i dontesei).
 *
 * Minden szabaly a hibak listajat adja vissza (ures lista = rendben), es nem
 * dob. Igy egy szabaly a tesztben egy sorkent all, es a hibauzenet megmondja,
 * MI a gond, nem csak azt, hogy van.
 */
export type Valasz = {
  /** a kert ut, query-vel (`/hu/store?q=hanna`) */
  ut: string
  statusz: number
  /** az `X-Robots-Tag` fejlec, ha van */
  xRobots: string | null
}

export type Szabaly = (k: OldalKivonat, v: Valasz) => string[]

const noindex = (k: OldalKivonat, v: Valasz) =>
  /\bnoindex\b/i.test(k.robotsMeta ?? "") ||
  /\bnoindex\b/i.test(v.xRobots ?? "")

/** A cim a bolt neve nelkul (`Keresés: hanna | Acropora` -> `Keresés: hanna`). */
const cimNev = (cim: string) => cim.replace(/\s*\|\s*[^|]+$/, "").trim()

const angol = (s: string) => ANGOL_HELYKITOLTOK.some((m) => m.test(s))

/**
 * Az ut es a query. A `viszonyitva` a lap sajat utja: egy relativ link
 * (`?page=2`) ahhoz kepest ertendo, nem a gyokerhez (a kategoria lapozoja
 * pontosan ilyet ad, merve 2026-10-07).
 */
function utvonal(
  cim: string,
  viszonyitva = "/",
): { ut: string; query: string } | null {
  try {
    const u = new URL(cim, new URL(viszonyitva, "http://alap.invalid"))
    return { ut: decodeURIComponent(u.pathname), query: u.search }
  } catch {
    return null
  }
}

export function altHiba(kep: KepAdat): string | null {
  if (kep.alt === null) return `hiányzó alt attribútum: ${kep.src}`
  const alt = kep.alt.trim()
  if (generikusAlt(alt)) return `generikus alt "${alt}": ${kep.src}`
  if (kep.tartalmi && alt === "") return `termékkép üres alttal: ${kep.src}`
  return null
}

export const SZABALYOK = {
  "statusz-200": (_k, v) =>
    v.statusz === 200 ? [] : [`a státusz ${v.statusz}, nem 200`],

  "statusz-404": (_k, v) =>
    v.statusz === 404 ? [] : [`a státusz ${v.statusz}, nem 404`],

  "egy-h1": (k) =>
    k.h1.length === 1 && k.h1[0]
      ? []
      : [`${k.h1.length} H1 a lapon: ${JSON.stringify(k.h1)}`],

  "egy-main": (k) => (k.mainDb === 1 ? [] : [`${k.mainDb} <main> a lapon`]),

  cim: (k) => {
    if (!k.cim) return ["nincs <title>"]
    if (/^Product \|/.test(k.cim)) return [`generikus cím: ${k.cim}`]
    return angol(cimNev(k.cim)) || angol(k.cim)
      ? [`angol helykitöltő a címben: ${k.cim}`]
      : []
  },

  leiras: (k) => {
    if (!k.leiras?.trim()) return ["nincs meta description"]
    const hibak: string[] = []
    if (k.cim && [k.cim, cimNev(k.cim)].includes(k.leiras.trim()))
      hibak.push(`a leírás a cím másolata: ${k.leiras}`)
    if (angol(k.leiras))
      hibak.push(`angol helykitöltő a leírásban: ${k.leiras}`)
    return hibak
  },

  "canonical-onmaga": (k, v) => {
    const c = k.canonical && utvonal(k.canonical)
    const sajat = utvonal(v.ut)
    if (!k.canonical || !c) return ["nincs canonical"]
    if (!/^https?:\/\//.test(k.canonical))
      return [`a canonical nem abszolút: ${k.canonical}`]
    return c.ut === sajat?.ut && c.query === ""
      ? []
      : [`a canonical ${k.canonical}, nem a lap maga (${v.ut})`]
  },

  "canonical-alap": (k, v) => {
    const c = k.canonical && utvonal(k.canonical)
    if (!c) return ["nincs canonical"]
    return c.ut === utvonal(v.ut)?.ut && c.query === ""
      ? []
      : [`a canonical ${k.canonical}, nem a paraméter nélküli alap`]
  },

  "lapozas-canonical": (k, v) => {
    const c = k.canonical && utvonal(k.canonical)
    const lap = new URLSearchParams(utvonal(v.ut)?.query ?? "").get("page")
    if (!c) return ["nincs canonical"]
    return new URLSearchParams(c.query).get("page") === lap
      ? []
      : [`a(z) ${lap}. lap canonicalja ${k.canonical}: nem a saját lapja`]
  },

  indexelheto: (k, v) =>
    noindex(k, v)
      ? [`noindex egy indexelhető lapon (${k.robotsMeta ?? v.xRobots})`]
      : [],

  noindex: (k, v) =>
    noindex(k, v) ? [] : ["nincs noindex (meta robots vagy X-Robots-Tag)"],

  "json-ld-product": (k) => {
    if (k.jsonLdHibak.length) return k.jsonLdHibak.map((h) => `JSON-LD: ${h}`)
    const termek = k.jsonLd
      .flatMap((x) => (Array.isArray(x) ? x : [x]))
      .find(
        (x): x is Record<string, unknown> =>
          !!x &&
          typeof x === "object" &&
          ["Product", "ProductGroup"].includes(
            String((x as Record<string, unknown>)["@type"]),
          ),
      )
    if (!termek) return ["nincs Product JSON-LD"]
    const hibak: string[] = []
    if (k.h1[0] && termek.name !== k.h1[0])
      hibak.push(`a JSON-LD neve (${termek.name}) nem a H1 (${k.h1[0]})`)
    if (!termek.offers && !termek.hasVariant) hibak.push("nincs offers")
    return hibak
  },

  "json-ld-breadcrumb": (k) =>
    k.jsonLd.some(
      (x) =>
        !!x &&
        typeof x === "object" &&
        (x as Record<string, unknown>)["@type"] === "BreadcrumbList",
    )
      ? []
      : ["nincs BreadcrumbList JSON-LD"],

  alt: (k) => k.kepek.map(altHiba).filter((h): h is string => h !== null),

  "fo-kep-nem-lusta": (k) => {
    const fo = k.kepek.filter((x) => x.foKep)
    if (!fo.length) return ["nincs fő termékkép jelölve (lásd FO_KEP)"]
    return fo.some((x) => x.lusta) ? ["a fő termékkép loading=lazy"] : []
  },

  /**
   * A LAPOZO VALODI LINKKENT AZ ELSO HTML-BEN (FE-1; barracuda atvetele, #519).
   * A kereso csak `<a href>`-et kovet. MURENA MERESE (2026-10-07): ISR lapon a
   * `useSearchParams`-os komponens helyett a Suspense-tartaleka kerul a HTML-be,
   * tehat a linkek eltunnenek. Ma a lap dinamikus, a linkek ott vannak; az FE-7
   * 3. resze szerveroldali parameterrel tartja meg oket, es ez a sor orzi.
   */
  "lapozo-linkek": (k, v) => {
    const sajat = utvonal(v.ut)?.ut
    return k.lapLinkek.some((h) => {
      const u = utvonal(h, v.ut)
      return (
        !!u &&
        u.ut === sajat &&
        new URLSearchParams(u.query).get("page") === "2"
      )
    })
      ? []
      : ["nincs <a href> a 2. lapra az első HTML-ben"]
  },

  /**
   * A NEM AKTIV FUL TARTALMA IS A DOM-BAN (FE-1): annyi panel, ahany ful, es
   * egyik sem ures. Ful nelkuli lapon nincs mit merni.
   */
  "rejtett-ful": (k) => {
    if (k.fulDb === 0) return []
    const hibak: string[] = []
    if (k.panelek.length !== k.fulDb)
      hibak.push(
        `${k.fulDb} fül, de ${k.panelek.length} panel az első HTML-ben`,
      )
    if (k.panelek.some((p) => p.hossz === 0)) hibak.push("üres fül-panel")
    return hibak
  },

  "termek-linkek": (k) =>
    k.termekLinkek.length ? [] : ["nincs <a href> termék-link a lapon"],

  /**
   * A felso kategoria gyujtolap: alkategoria-csempeket mutat, nem termeket.
   * Ott a bejarhatosag utja az alkategoriak linkje, a sajat utjan kivul.
   */
  "alkategoria-linkek": (k, v) => {
    const sajat = utvonal(v.ut)?.ut
    return k.kategoriaLinkek.some((h) => utvonal(h)?.ut !== sajat)
      ? []
      : ["nincs <a href> alkategória-link a lapon"]
  },
} satisfies Record<string, Szabaly>

export type SzabalyKulcs = keyof typeof SZABALYOK
