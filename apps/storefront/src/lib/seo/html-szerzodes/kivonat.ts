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
  /** van `srcset` (FE-3: a Next optimalizalojanak valtozatai) */
  srcset: boolean
  /** `width` es `height`, vagy `fill` (a doboz aranya tartja a helyet) */
  meretezett: boolean
  /** `fetchpriority="high"` */
  kiemelt: boolean
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
  /** a termekre mutato `<a href>` linkek (`/termek/` az utban) */
  termekLinkek: string[]
  /** a kategoriara mutato `<a href>` linkek (`/categories/` az utban) */
  kategoriaLinkek: string[]
  /** a `page` parameteru `<a href>` linkek (a lapozo) */
  lapLinkek: string[]
  /** minden `<a href>` link (a belso-ut szabalyhoz, FE-7 3. resz) */
  linkek: string[]
  /** minden `<a href>` link a `rel` ertekevel (a szuro-link szabalyhoz, FE-4b) */
  linkRel: { href: string; rel: string | null }[]
  /** a lapon latszo ar(ak): `[data-testid="product-price"]` `data-value` (FE-2a) */
  latottArak: number[]
  /** a lapon latszo elerhetoseg(ek): `data-elerhetoseg` (KAPHATO, ELFOGYOTT, ELADVA) */
  latottElerhetosegek: string[]
  /** a lapon latszo morzsamenu elemei, a `/` jel nelkul (az elso morzsamenu) */
  morzsaNevek: string[]
  /** a fulek (`role="tab"`) szama */
  fulDb: number
  /** a ful-panelek (`role="tabpanel"`): a szoveguk hossza, es rejtett-e */
  panelek: { hossz: number; rejtett: boolean }[]
  /**
   * A KIJELOLT OPCIOK ERTEKE (`option-button`, `aria-pressed="true"`), a
   * magyarazo sor nelkul. Ez a valasztashoz kotott jel: a nyers HTML RSC-adata
   * minden valtozat cikkszamat es arat viszi, tehat abbol a valasztas nem
   * latszik (barracuda atvetele, #521).
   */
  kijeloltOpciok: string[]
}

/**
 * A FO KEP JELOLOI: a termeklap ket galeriaja. A `termeklap-nagykep` osztaly a
 * muszaki lap kepe (`lap-vaz/kep-blokk.tsx`), a `nagy-kep` a regi galeria
 * (`image-gallery/index.tsx`). Ha egy uj galeria jon, ide kell felvenni, kulonben
 * a fo kep nem tartalminak szamit, es az ALT-szabaly nem nezi.
 */
const FO_KEP = 'img.termeklap-nagykep, [data-testid="nagy-kep"] img'
const TERMEK_LINK = 'a[href*="/termek/"]'

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
      srcset: !!img.getAttribute("srcset"),
      meretezett:
        (img.hasAttribute("width") && img.hasAttribute("height")) ||
        img.getAttribute("data-nimg") === "fill",
      kiemelt: img.getAttribute("fetchpriority") === "high",
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
    linkek: Array.from(doc.querySelectorAll("a[href]")).map(
      (a) => a.getAttribute("href") ?? "",
    ),
    linkRel: Array.from(doc.querySelectorAll("a[href]")).map((a) => ({
      href: a.getAttribute("href") ?? "",
      rel: a.getAttribute("rel"),
    })),
    latottArak: Array.from(
      doc.querySelectorAll('[data-testid="product-price"][data-value]'),
    )
      .map((e) => Number(e.getAttribute("data-value")))
      .filter((n) => Number.isFinite(n)),
    latottElerhetosegek: Array.from(
      doc.querySelectorAll("[data-elerhetoseg]"),
    ).map((e) => e.getAttribute("data-elerhetoseg") ?? ""),
    morzsaNevek: Array.from(
      doc
        .querySelector('nav[aria-label="Morzsamenü"]')
        ?.querySelectorAll("li") ?? [],
    ).map((li) =>
      Array.from(li.childNodes)
        .filter(
          // a `/` elvalaszto `aria-hidden` span: nem resze a nevnek
          (n) =>
            n.nodeType !== 1 ||
            (n as Element).getAttribute("aria-hidden") !== "true",
        )
        .map((n) => n.textContent ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    ),
    fulDb: doc.querySelectorAll('[role="tab"]').length,
    panelek: Array.from(doc.querySelectorAll('[role="tabpanel"]')).map((p) => ({
      hossz: szoveg(p).length,
      rejtett: p.hasAttribute("hidden"),
    })),
    kijeloltOpciok: Array.from(
      doc.querySelectorAll(
        '[data-testid="option-button"][aria-pressed="true"]',
      ),
    ).map((gomb) =>
      Array.from(gomb.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim(),
    ),
  }
}
