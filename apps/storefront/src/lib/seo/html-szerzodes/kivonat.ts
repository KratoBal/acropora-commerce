import { JSDOM } from "jsdom"

/**
 * EGY RENDERELT OLDAL SEO-KIVONATA (SEO frontend FE-8).
 *
 * A szerzodes-teszt a KIVONATOT meri, nem a nyers HTML-t: ugyanabbol a
 * kivonatbol dolgozik a mobil-asztali osszevetes es minden szabaly, tehat egy
 * elemzesi hiba egy helyen javul. A kivonat a valasz elso HTML-jebol keszul, azt
 * latja a kereso is (a kliensoldali JavaScript nem fut).
 */
export type KepAdat = {
  src: string
  /** `null`, ha az `alt` attributum HIANYZIK (nem ugyanaz, mint az ures). */
  alt: string | null
  /** termekkep: a termeklap fo kepe, vagy egy termekre mutato link kepe */
  tartalmi: boolean
  /** a termeklap fo kepe */
  foKep: boolean
  lusta: boolean
}

export type OldalKivonat = {
  h1: string[]
  mainDb: number
  cim: string | null
  leiras: string | null
  canonical: string | null
  robotsMeta: string | null
  ogUrl: string | null
  jsonLd: unknown[]
  /** a nem ervenyes JSON-t tartalmazo `ld+json` blokkok hibauzenete */
  jsonLdHibak: string[]
  kepek: KepAdat[]
  /** a termekre mutato `<a href>` linkek (`/products/` az utban) */
  termekLinkek: string[]
  /** a kategoriara mutato `<a href>` linkek (`/categories/` az utban) */
  kategoriaLinkek: string[]
  /** a `page` parameteru `<a href>` linkek (a lapozo) */
  lapLinkek: string[]
  /** a fulek (`role="tab"`) szama */
  fulDb: number
  /** a ful-panelek (`role="tabpanel"`): a szoveguk hossza, es rejtett-e */
  panelek: { hossz: number; rejtett: boolean }[]
}

/**
 * A FO KEP JELOLOI: a termeklap ket galeriaja. A `termeklap-nagykep` osztaly a
 * muszaki lap kepe (`lap-vaz/kep-blokk.tsx`), a `nagy-kep` a regi galeria
 * (`image-gallery/index.tsx`). Ha egy uj galeria jon, ide kell felvenni, kulonben
 * a fo kep nem tartalminak szamit, es az ALT-szabaly nem nezi.
 */
const FO_KEP = 'img.termeklap-nagykep, [data-testid="nagy-kep"] img'
const TERMEK_LINK = 'a[href*="/products/"]'

const szoveg = (e: Element | null | undefined) =>
  (e?.textContent ?? "").replace(/\s+/g, " ").trim()

export function kivonat(html: string): OldalKivonat {
  const doc = new JSDOM(html).window.document
  const meta = (nev: string) =>
    doc.querySelector(`meta[name="${nev}"]`)?.getAttribute("content") ?? null

  const jsonLd: unknown[] = []
  const jsonLdHibak: string[] = []
  Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  ).forEach((s) => {
    try {
      jsonLd.push(JSON.parse(s.textContent ?? ""))
    } catch (e) {
      jsonLdHibak.push(e instanceof Error ? e.message : String(e))
    }
  })

  const foKepek = new Set(Array.from(doc.querySelectorAll(FO_KEP)))
  const kepek = Array.from(doc.querySelectorAll("img")).map((img) => {
    const foKep = foKepek.has(img)
    return {
      src: img.getAttribute("src") ?? img.getAttribute("srcset") ?? "",
      alt: img.getAttribute("alt"),
      foKep,
      tartalmi: foKep || !!img.closest(TERMEK_LINK),
      lusta: img.getAttribute("loading") === "lazy",
    }
  })

  return {
    h1: Array.from(doc.querySelectorAll("h1")).map(szoveg),
    mainDb: doc.querySelectorAll("main").length,
    cim: doc.querySelector("head > title")?.textContent?.trim() ?? null,
    leiras: meta("description"),
    canonical:
      doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    robotsMeta: meta("robots"),
    ogUrl:
      doc.querySelector('meta[property="og:url"]')?.getAttribute("content") ??
      null,
    jsonLd,
    jsonLdHibak,
    kepek,
    termekLinkek: Array.from(doc.querySelectorAll(TERMEK_LINK)).map(
      (a) => a.getAttribute("href") ?? "",
    ),
    kategoriaLinkek: Array.from(
      doc.querySelectorAll('a[href*="/categories/"]'),
    ).map((a) => a.getAttribute("href") ?? ""),
    lapLinkek: Array.from(doc.querySelectorAll('a[href*="page="]')).map(
      (a) => a.getAttribute("href") ?? "",
    ),
    fulDb: doc.querySelectorAll('[role="tab"]').length,
    panelek: Array.from(doc.querySelectorAll('[role="tabpanel"]')).map((p) => ({
      hossz: szoveg(p).length,
      rejtett: p.hasAttribute("hidden"),
    })),
  }
}
