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
 * EGYVALTOZATOS termeken; ProductGroup + hasVariant a TOBBVALTOZATOSON
 * (FE-2b); gtin8/12/13/14 a valtozat `ean`, `upc` vagy `barcode` mezojebol,
 * ha ervenyes GTIN all benne (FE-2b, a P0 PR 4 tolti).
 *
 * NEM MOST, es ezert nem talalunk ki erteket ra: mpn (a Medusa valtozaton
 * nincs gyartoi cikkszam mezo, es a P0 PR 4 sem hoz ilyet), shippingDetails es
 * hasMerchantReturnPolicy (kesobbi kor).
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
  /** a valtozat ervenyes GTIN-je (`valtozatGtin`), ha van */
  gtin?: string | null
}

/** Egy ajanlat: a lapon latszo ar es elerhetoseg. */
function ajanlatLd(b: {
  url: string
  ar: number
  penznem: string
  elerhetoseg: LatottElerhetoseg
  utanrendeles: boolean
  kategoriaNevek: string[]
}): JsonLd {
  return {
    "@type": "Offer",
    url: b.url,
    price: b.ar,
    priceCurrency: b.penznem,
    availability: elerhetosegSchema(b.elerhetoseg, b.utanrendeles),
    itemCondition: hasznaltE(b.kategoriaNevek)
      ? "https://schema.org/UsedCondition"
      : "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: STORE_NAME },
  }
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
    ...gtinMezo(b.gtin),
    ...(b.marka ? { brand: { "@type": "Brand", name: b.marka } } : {}),
    offers: ajanlatLd(b),
  }
}

/**
 * AZ OPCIO NEVE A SCHEMA.ORG TULAJDONSAGRA (`variesBy`). Csak az ismert nevek:
 * egy ismeretlen opcio (pl. "Kiszereles") nem kap kitalalt tulajdonsagot, a
 * valtozat neve viszont az erteket igy is hordozza.
 */
const OPCIO_TULAJDONSAG: Record<string, string> = {
  meret: "size",
  méret: "size",
  size: "size",
  szin: "color",
  szín: "color",
  color: "color",
  anyag: "material",
  material: "material",
  minta: "pattern",
  pattern: "pattern",
}

export function opcioTulajdonsag(opcioNev: string): string | null {
  return (
    OPCIO_TULAJDONSAG[opcioNev.trim().toLowerCase().normalize("NFC")] ?? null
  )
}

export type ValtozatLdBemenet = {
  /** a valtozat sajat cime: a termeklap `?v_id=`-vel */
  url: string
  /** az opciok, a lap opcio-gombjainak ertekevel */
  opciok: { nev: string; ertek: string }[]
  cikkszam?: string | null
  gtin?: string | null
  /** a valtozat kepei, ha vannak; kulonben a termeke */
  kepek: string[]
  /** a valtozat ara, ahogy a lap a kivalasztasa utan mutatja */
  ar: number
  elerhetoseg: LatottElerhetoseg
  utanrendeles: boolean
}

export type TermekCsoportLdBemenet = {
  nev: string
  url: string
  /** a csoport allando azonositoja (a termek Medusa-azonositoja) */
  csoportAzonosito: string
  marka?: string | null
  kepek: string[]
  penznem: string
  kategoriaNevek: string[]
  valtozatok: ValtozatLdBemenet[]
}

/**
 * A TOBBVALTOZATOS TERMEK (FE-2b): ProductGroup, a valtozatok `hasVariant`
 * alatt, mindegyik a SAJAT araval, keszletevel, cikkszamaval es GTIN-jevel,
 * ugyanugy, ahogy a lap a valtozat kivalasztasa utan mutatja. A csoportnak
 * nincs sajat ajanlata: egy valtozat arat az egesz termekre allitana.
 *
 * A `variesBy` csak az ismert opciokat sorolja (`opcioTulajdonsag`); ha egy sem
 * ismert, a mezo kimarad.
 */
export function termekCsoportLd(b: TermekCsoportLdBemenet): JsonLd {
  const opcioNevek = Array.from(
    new Set(b.valtozatok.flatMap((v) => v.opciok.map((o) => o.nev))),
  )
  const valtozik = opcioNevek
    .map(opcioTulajdonsag)
    .filter((t): t is string => t !== null)
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: b.nev,
    url: b.url,
    productGroupID: b.csoportAzonosito,
    ...(b.kepek.length ? { image: b.kepek } : {}),
    ...(b.marka ? { brand: { "@type": "Brand", name: b.marka } } : {}),
    ...(valtozik.length
      ? {
          variesBy: Array.from(new Set(valtozik)).map(
            (t) => `https://schema.org/${t}`,
          ),
        }
      : {}),
    hasVariant: b.valtozatok.map((v) => {
      const ertekek = v.opciok.map((o) => o.ertek).filter(Boolean)
      const tulajdonsagok = Object.fromEntries(
        v.opciok.flatMap((o) => {
          const t = opcioTulajdonsag(o.nev)
          return t && o.ertek ? [[t, o.ertek]] : []
        }),
      )
      const kepek = v.kepek.length ? v.kepek : b.kepek
      return {
        "@type": "Product",
        name: ertekek.length ? `${b.nev} (${ertekek.join(", ")})` : b.nev,
        url: v.url,
        ...(kepek.length ? { image: kepek } : {}),
        ...(v.cikkszam ? { sku: v.cikkszam } : {}),
        ...gtinMezo(v.gtin),
        ...tulajdonsagok,
        offers: ajanlatLd({
          url: v.url,
          ar: v.ar,
          penznem: b.penznem,
          elerhetoseg: v.elerhetoseg,
          utanrendeles: v.utanrendeles,
          kategoriaNevek: b.kategoriaNevek,
        }),
      }
    }),
  }
}

/**
 * ERVENYES GTIN-E (GS1): 8, 12, 13 vagy 14 szamjegy, es stimmel az ellenorzo
 * szamjegy. Egy rossz kod a Merchant Centerben hibat ad, tehat inkabb
 * kimarad, mint hogy hamisat allitsunk.
 */
export function ervenyesGtin(kod: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(kod)) return false
  const jegyek = Array.from(kod, Number)
  const ellenorzo = jegyek.pop()!
  // jobbrol balra: a legutolso adatjegy 3-as sulyu, utana 1, 3, 1, ...
  const osszeg = jegyek
    .reverse()
    .reduce((acc, jegy, i) => acc + jegy * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (osszeg % 10)) % 10 === ellenorzo
}

/**
 * A VALTOZAT GTIN-JE: az `ean`, utana az `upc`, vegul a `barcode` mezo elso
 * ervenyes kodja (a P0 PR 4 a 13 jegyut az `ean`-ba, a 12 jegyut az `upc`-be
 * irja). Nincs ervenyes kod: `null`, es a JSON-LD-bol a mezo KIMARAD (nem
 * ures).
 */
export function valtozatGtin(v: {
  ean?: string | null
  upc?: string | null
  barcode?: string | null
}): string | null {
  for (const nyers of [v.ean, v.upc, v.barcode]) {
    const kod = nyers?.trim()
    if (kod && ervenyesGtin(kod)) return kod
  }
  return null
}

/** A GTIN a hossza szerinti schema.org mezoben (`gtin13`, `gtin12`, ...). */
function gtinMezo(kod: string | null | undefined): JsonLd {
  return kod ? { [`gtin${kod.length}`]: kod } : {}
}

/**
 * A `<script>` tartalma: a `<` kodolva, hogy egy termeknevben allo `</script>`
 * ne zarhassa le a blokkot (es ne nyithasson HTML-t).
 */
export function jsonLdSzoveg(adat: JsonLd): string {
  return JSON.stringify(adat).replace(/</g, "\\u003c")
}
