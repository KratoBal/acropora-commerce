import { STORE_NAME } from "@lib/store"

/**
 * A STRUKTURALT ADAT (JSON-LD) EPITOI (SEO frontend FE-2a, acrobot 27553;
 * roadmap FE-2 sora, Balazs 2026-10-07-i dontesenek 3. pontja).
 *
 * TISZTA FUGGVENYEK: a lap a SAJAT, mar kiszamolt adatat adja be (amit a vevo
 * is lat), es az epito csak formaz. Igy a JSON-LD nem tud mast allitani, mint a
 * lap: ugyanabbol az ertekbol jon. Az FE-8 szerzodes ezt a kiszolgalt HTML-en
 * is ellenorzi (ar, elerhetoseg, morzsamenu).
 *
 * MOST: Organization es WebSite minden lapon (SearchAction NELKUL, mert a
 * kereses noindex); BreadcrumbList a termek- es a kategorialapon; Product az
 * EGYVALTOZATOS termeken.
 *
 * NEM MOST, es ezert nem talalunk ki ertekot ra: gtin es mpn (P0 PR 4),
 * ProductGroup/hasVariant (P0 PR 3), shippingDetails es hasMerchantReturnPolicy
 * (kesobbi kor). A `termekLd` bemenete es kimenete ugy all, hogy ezek egy-egy
 * mezokent hozzaadhatok legyenek, a hivok modositasa nelkul.
 */

export type JsonLd = Record<string, unknown>

/** A bolt maga. Logo nincs a kirakatban, ezert nem allitunk logot. */
export function szervezetLd(alapUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${alapUrl}/#szervezet`,
    name: STORE_NAME,
    url: alapUrl,
  }
}

/**
 * A webhely. SearchAction SZANDEKOSAN NINCS: a keresesi talalati lap noindex
 * (Balazs dontese, 4. pont), es egy SearchAction pont oda kuldene a keresot.
 */
export function webhelyLd(alapUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${alapUrl}/#webhely`,
    name: STORE_NAME,
    url: alapUrl,
    inLanguage: "hu-HU",
    publisher: { "@id": `${alapUrl}/#szervezet` },
  }
}

export type MorzsaElem = { nev: string; url?: string }

/**
 * A MORZSAMENU: ugyanazok az elemek, ugyanabban a sorrendben, mint a lapon
 * latszo `nav[aria-label="Morzsamenü"]`. Az utolso elem a lap maga; annak
 * nem kotelezo URL (a schema.org szerint az aktualis lap).
 */
export function morzsaLd(elemek: MorzsaElem[]): JsonLd | null {
  if (!elemek.length) return null
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elemek.map((elem, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: elem.nev,
      ...(elem.url ? { item: elem.url } : {}),
    })),
  }
}

/**
 * A lapon latszo elerhetoseg (`availabilityOf`) schema.org alakja.
 * `KAPHATO`: a gomb kosarba tesz. Ha csak utanrendelesre (nincs keszlet, de a
 * valtozat engedi), az `BackOrder`, kulonben `InStock`.
 * `ELFOGYOTT`, `ELADVA`: a gomb nem tesz kosarba, tehat `OutOfStock`.
 */
export type LatottElerhetoseg = "KAPHATO" | "ELFOGYOTT" | "ELADVA"

export function elerhetosegSchema(
  elerhetoseg: LatottElerhetoseg,
  utanrendeles: boolean,
): string {
  if (elerhetoseg !== "KAPHATO") return "https://schema.org/OutOfStock"
  return utanrendeles
    ? "https://schema.org/BackOrder"
    : "https://schema.org/InStock"
}

/** Hasznalt-e a termek: a besorolasa (a morzsamenu lanca) a hasznalt agban all. */
export function hasznaltE(kategoriaNevek: string[]): boolean {
  return kategoriaNevek.some((nev) => /haszn[aá]lt/i.test(nev))
}

export type TermekLdBemenet = {
  /** a termek neve: a lap H1-e */
  nev: string
  /** a lap kanonikus cime */
  url: string
  /** a cikkszam (a valtozat `sku`-ja), ha van */
  cikkszam?: string | null
  /** a marka (a Medusa gyujtemenye), ha van */
  marka?: string | null
  /** abszolut kepcimek, a fo kep elol */
  kepek: string[]
  /** a lapon latszo ar (`product-price` `data-value`), egesz forintban */
  ar: number
  /** ISO 4217, nagybetuvel (`HUF`) */
  penznem: string
  /** a lapon latszo elerhetoseg */
  elerhetoseg: LatottElerhetoseg
  /** nincs keszlet, de a valtozat utanrendelheto */
  utanrendeles: boolean
  /** a besorolas kategorianevei (a morzsamenu lanca), a hasznalt allapothoz */
  kategoriaNevek: string[]
}

/**
 * A TERMEK, EGY AJANLATTAL. Csak egyvaltozatos termekre: a hivo ellenorzi
 * (`egyValtozatos`). Tobbvaltozatosnal a Product blokk inkabb elmarad, mint
 * hogy egy valtozat arat az egesz termekre allitsa (acrobot 27553).
 */
export function termekLd(b: TermekLdBemenet): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: b.nev,
    url: b.url,
    ...(b.kepek.length ? { image: b.kepek } : {}),
    ...(b.cikkszam ? { sku: b.cikkszam } : {}),
    ...(b.marka ? { brand: { "@type": "Brand", name: b.marka } } : {}),
    offers: {
      "@type": "Offer",
      url: b.url,
      price: b.ar,
      priceCurrency: b.penznem,
      availability: elerhetosegSchema(b.elerhetoseg, b.utanrendeles),
      itemCondition: hasznaltE(b.kategoriaNevek)
        ? "https://schema.org/UsedCondition"
        : "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: STORE_NAME },
    },
  }
}

/**
 * A `<script>` tartalma: a `<` kodolva, hogy egy termeknevben allo `</script>`
 * ne zarhassa le a blokkot (es ne nyithasson HTML-t).
 */
export function jsonLdSzoveg(adat: JsonLd): string {
  return JSON.stringify(adat).replace(/</g, "\\u003c")
}
