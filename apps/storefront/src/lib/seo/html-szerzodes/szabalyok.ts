import { generikusAlt } from "@lib/seo/generikus-alt"
import { ANGOL_HELYKITOLTOK } from "@lib/seo/oldal-metaadat"
import { szuroLink } from "@lib/seo/szuro-link"

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
    /*
      AZ AJANLAT A LAPON LATSZO ERTEKET ALLITJA (FE-2a; Balazs 3. pontja: a
      feed es a strukturalt adat ugyanazt az authoritativ adatot hasznalja).
      Az ar a `product-price` `data-value`-ja, az elerhetoseg a gomb
      `data-elerhetoseg`-e.
    */
    const ajanlat = termek.offers as Record<string, unknown> | undefined
    if (ajanlat && !Array.isArray(ajanlat)) {
      if (!k.latottArak.length) hibak.push("nincs látható ár a lapon")
      else if (!k.latottArak.includes(Number(ajanlat.price)))
        hibak.push(
          `a JSON-LD ára (${ajanlat.price}) nem a lapé (${k.latottArak.join(", ")})`,
        )
      if (ajanlat.priceCurrency !== "HUF")
        hibak.push(`a pénznem ${ajanlat.priceCurrency}, nem HUF`)
      const latott = k.latottElerhetosegek[0]
      const vart =
        latott === "KAPHATO"
          ? ["https://schema.org/InStock", "https://schema.org/BackOrder"]
          : ["https://schema.org/OutOfStock"]
      if (!latott) hibak.push("nincs látható elérhetőség (data-elerhetoseg)")
      else if (!vart.includes(String(ajanlat.availability)))
        hibak.push(
          `a JSON-LD elérhetősége (${ajanlat.availability}) nem a lapé (${latott})`,
        )
    }
    /*
      A TOBBVALTOZATOS TERMEK (FE-2b): minden valtozatnak sajat, forintos
      ajanlata van, es a lapon latszo ar az egyik valtozate. Hogy melyike, azt a
      `?v_id` donti el; a szerzodes azt meri, hogy a lap ara a csoportbol jon.
    */
    const valtozatok = termek.hasVariant as
      Record<string, unknown>[] | undefined
    if (Array.isArray(valtozatok)) {
      if (!valtozatok.length) hibak.push("üres hasVariant")
      const arak: number[] = []
      valtozatok.forEach((v, i) => {
        const o = v.offers as Record<string, unknown> | undefined
        if (!o || Array.isArray(o)) {
          hibak.push(`a(z) ${i + 1}. változatnak nincs ajánlata`)
          return
        }
        if (o.priceCurrency !== "HUF")
          hibak.push(
            `a(z) ${i + 1}. változat pénzneme ${o.priceCurrency}, nem HUF`,
          )
        arak.push(Number(o.price))
      })
      if (!k.latottArak.length) hibak.push("nincs látható ár a lapon")
      else if (!k.latottArak.some((ar) => arak.includes(ar)))
        hibak.push(
          `a lap ára (${k.latottArak.join(", ")}) egyik változaté sem (${arak.join(", ")})`,
        )
    }
    return hibak
  },

  /**
   * A BOLT ES A WEBHELY MINDEN LAPON (FE-2a), ervenyes JSON-ban. SearchAction
   * NEM lehet: a kereses noindex (Balazs 4. pontja).
   */
  "json-ld-szervezet": (k) => {
    if (k.jsonLdHibak.length) return k.jsonLdHibak.map((h) => `JSON-LD: ${h}`)
    const tipus = (t: string) =>
      k.jsonLd.find(
        (x): x is Record<string, unknown> =>
          !!x &&
          typeof x === "object" &&
          (x as Record<string, unknown>)["@type"] === t,
      )
    const hibak: string[] = []
    if (!tipus("Organization")) hibak.push("nincs Organization JSON-LD")
    const webhely = tipus("WebSite")
    if (!webhely) hibak.push("nincs WebSite JSON-LD")
    else if (JSON.stringify(webhely).includes("SearchAction"))
      hibak.push("SearchAction a WebSite-on (a keresés noindex)")
    return hibak
  },

  /**
   * A MORZSAMENU JSON-LD-JE ES A LATHATO MORZSAMENU EGYEZIK (FE-2a). Az utolso
   * elem a lap maga: a JSON-LD-ben a neve, a lapon a sotet termeklap a
   * cikkszamot mutatja ott, ezert az utolso nevet a H1-gyel is elfogadjuk.
   */
  "json-ld-morzsa-egyezik": (k) => {
    const lista = k.jsonLd.find(
      (x): x is Record<string, unknown> =>
        !!x &&
        typeof x === "object" &&
        (x as Record<string, unknown>)["@type"] === "BreadcrumbList",
    )
    if (!lista) return ["nincs BreadcrumbList JSON-LD"]
    const nevek = (
      (lista.itemListElement as { name?: unknown }[] | undefined) ?? []
    ).map((e) => String(e.name ?? ""))
    const latott = k.morzsaNevek
    if (!latott.length) return ["nincs látható morzsamenü"]
    const hibak: string[] = []
    if (nevek.length !== latott.length)
      hibak.push(
        `${nevek.length} elem a JSON-LD-ben, ${latott.length} a lapon (${nevek.join(" / ")} | ${latott.join(" / ")})`,
      )
    nevek.slice(0, -1).forEach((nev, i) => {
      if (latott[i] !== undefined && nev !== latott[i])
        hibak.push(`${i + 1}. elem: JSON-LD "${nev}", lap "${latott[i]}"`)
    })
    const utolso = nevek[nevek.length - 1]
    if (
      utolso !== undefined &&
      utolso !== latott[latott.length - 1] &&
      utolso !== k.h1[0]
    )
      hibak.push(`az utolsó elem "${utolso}" se a morzsamenü vége, se a H1`)
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

  /**
   * A TERMEKKEPEK MERETEZVE ES TOBB MERETBEN (FE-3, a webshop sajat
   * optimalizaloja): `srcset`, es `width`/`height` vagy `fill` (a doboz aranya),
   * kulonben a kep eredeti meretben jon, es betolteskor elugrik a lap.
   */
  "kep-meretezes": (k) =>
    k.kepek
      .filter((x) => x.tartalmi)
      .flatMap((x) => [
        ...(x.srcset ? [] : [`srcset nélküli termékkép: ${x.src}`]),
        ...(x.meretezett
          ? []
          : [`width/height (vagy fill) nélküli termékkép: ${x.src}`]),
      ]),

  /** A FO KEP AZ LCP-ELEM: `fetchpriority="high"` (FE-3). */
  "fo-kep-kiemelt": (k) => {
    const fo = k.kepek.filter((x) => x.foKep)
    if (!fo.length) return ["nincs fő termékkép jelölve (lásd FO_KEP)"]
    return fo.some((x) => x.kiemelt)
      ? []
      : ['a fő termékkép nem fetchpriority="high"']
  },

  /**
   * A HAJTAS FELETTI ELSO LISTAKEP NEM LUSTA (FE-3). A tobbi lusta maradhat;
   * egy kep nelkuli lista hiba, kulonben a szabaly ures listan is zold lenne.
   */
  "elso-listakep-nem-lusta": (k) => {
    const elso = k.kepek.find((x) => x.tartalmi)
    if (!elso) return ["nincs termékkép a listán"]
    return elso.lusta ? [`az első listakép loading=lazy: ${elso.src}`] : []
  },

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

  /**
   * BELSO UTRA SEMMI NEM MUTAT (FE-7 3. resz; acrobot 27511). A `?v_id` es a
   * `?page` a `next.config` atirasaval belso utra (`/_v/`, `/_p/`, `/_szurt/`)
   * megy, amit kivulrol 404 fogad. Ha egy link, a canonical vagy az `og:url` a
   * belso alakot adja (peldaul mert a lapozo a router utjabol epit), a kereso
   * 404-re jut. A kodolt alakot (`%5F`) is nezi.
   */
  "belso-ut-link": (k, v) => {
    const belso = (cim: string) => {
      const u = utvonal(cim, v.ut)
      const masodik = u?.ut.split("/")[2] ?? ""
      return ["_v", "_p", "_szurt"].includes(masodik)
    }
    return [
      ...k.linkek.filter(belso).map((h) => `belső útra mutató link: ${h}`),
      ...[k.canonical, k.ogUrl]
        .filter((c): c is string => !!c && belso(c))
        .map((c) => `belső út a canonicalban vagy az og:url-ben: ${c}`),
    ]
  },

  /**
   * A SZURT LAPRA MUTATO LINK `nofollow` (FE-4b, barracuda #524-es lelete). A
   * tobbvalasztos marka-szuro 2^N kombinaciot ad `<a href>`-kent, mind dinamikus
   * SSR; a `noindex, follow` a bejarast nem allitja meg. Minden link, ami
   * szuro-parametert visz (`SZURO_KULCSOK`, ugyanaz, ami a `_szurt` atirast
   * kivaltja), `rel`-jeben `nofollow`-nak kell allnia, barmelyik lapon.
   */
  "szuro-link-nofollow": (k) =>
    k.linkRel
      .filter((l) => szuroLink(l.href))
      .filter((l) => !/(^|\s)nofollow(\s|$)/i.test(l.rel ?? ""))
      .map((l) => `szűrt lapra mutató link nofollow nélkül: ${l.href}`),

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

/**
 * A `?v_id` KOZVETLEN MEGNYITASA (Balazs 2. pontja): a kert valtozat opcioi
 * kijelolve allnak az elso HTML-ben, ES ugyanaz a lap `v_id` nelkul NEM ezeket
 * mutatja kijelolve. A masodik a meres kontrollja: ha `v_id` nelkul is ugyanaz
 * all, a meres nem kulonbozteti meg a valtozatot (barracuda atvetele, #521).
 */
export function valtozatHibak(
  opciok: readonly string[],
  vIddel: OldalKivonat,
  vIdNelkul: OldalKivonat,
): string[] {
  if (opciok.length === 0)
    return ["a változatnak nincs opció-értéke: nem mérhető"]
  const benne = (k: OldalKivonat) =>
    opciok.every((o) => k.kijeloltOpciok.includes(o))
  const hibak: string[] = []
  if (!benne(vIddel))
    hibak.push(
      `a v_id-vel nyitott lapon nem a kért opció van kijelölve (kért: ${opciok.join(", ")}; kijelölt: ${vIddel.kijeloltOpciok.join(", ") || "semmi"})`,
    )
  if (benne(vIdNelkul))
    hibak.push(
      "v_id nélkül is a kért opció van kijelölve: a mérés nem különbözteti meg a változatot",
    )
  return hibak
}

/** A JSON-LD minden `gtin*` erteke, a valtozatokon is. */
function gtinErtekek(jsonLd: unknown[]): string[] {
  const talalt: string[] = []
  const bejar = (x: unknown) => {
    if (!x || typeof x !== "object") return
    if (Array.isArray(x)) return x.forEach(bejar)
    for (const [kulcs, ertek] of Object.entries(x as Record<string, unknown>)) {
      if (/^gtin(8|12|13|14)?$/.test(kulcs)) talalt.push(String(ertek))
      else bejar(ertek)
    }
  }
  jsonLd.forEach(bejar)
  return talalt
}

/**
 * A GTIN A JSON-LD-BEN (FE-2b). A `vart` a Store API kodja a mintan
 * (`mintaoldalak`): ha van, PONTOSAN az kell; ha `null`, gtin nem allhat
 * (kimarad, nem ures). Kulon fuggveny, nem szabaly: a szabalyok a valaszt
 * kapjak, a vart kod a mintae.
 */
export function gtinHibak(k: OldalKivonat, vart: string | null): string[] {
  if (k.jsonLdHibak.length) return k.jsonLdHibak.map((h) => `JSON-LD: ${h}`)
  const ertekek = gtinErtekek(k.jsonLd)
  if (vart === null)
    return ertekek.length
      ? [`GTIN-nélküli terméken gtin áll: ${ertekek.join(", ")}`]
      : []
  if (!ertekek.includes(vart))
    return [
      `a JSON-LD-ben nincs a termék GTIN-je (${vart}); ami áll: ${ertekek.join(", ") || "semmi"}`,
    ]
  return ertekek.every((e) => e === vart)
    ? []
    : [`idegen GTIN is áll a JSON-LD-ben: ${ertekek.join(", ")}`]
}
