import { describe, expect, it } from "vitest"

import { kivonat } from "./kivonat"
import { gtinHibak, SZABALYOK, valtozatHibak, type Valasz } from "./szabalyok"

/**
 * A SZERZODES SZABALYAI EGY-EGY HTML-EN (FE-8). A kep- es link-reszletek a teszt
 * kirakat valodi HTML-jebol vannak masolva (2026-10-07), mert egy egyszerubb
 * fixtura a szelektort nem meri: ha a kirakat jelolese valtozik, a szerzodes
 * csendben mast nezne.
 *
 * MI PIROSIT: ha egy szabaly a hibas lapot atengedi, vagy a jot pirosra viszi.
 */
const FO_KEP =
  '<img src="https://commerce-stage.acropora.hu/static/1788539279383-5060139358699.webp" alt="Vitalis LPS Coral Pellets - LPS koralltáp 60g" class="termeklap-nagykep w-full aspect-square lg:aspect-[16/10]" style="object-fit:contain" data-testid="vaz-foto"/>'
const KAPCSOLAT_KARTYA =
  '<a class="group flex flex-col gap-[10px]" data-testid="kapcsolat-kartya" href="/hu/termek/vitalis-sps-coral-food-koralleledel-50gr"><div class="aspect-[32/30] w-full overflow-hidden bg-acr-white"><img src="https://commerce-stage.acropora.hu/static/1788803561869-5060139358712.webp" alt="" class="h-full w-full object-contain" data-testid="kapcsolat-kartya-kep"/></div><p>Vitalis SPS</p></a>'
const ZAROSOR_KEP =
  '<img src="https://commerce-stage.acropora.hu/static/1788539279383-5060139358699.webp" alt="" class="h-full w-full object-cover" data-testid="zarosor-belyeg-kep"/>'
const LISTA_CSEMPE =
  '<a class="group flex flex-1 flex-col" href="/hu/termek/aquaforest-af-amino-mix-10ml"><div class="h-[242px] overflow-hidden bg-acr-white"><img alt="Thumbnail" draggable="false" loading="lazy" decoding="async" data-nimg="fill" class="absolute inset-0 object-contain object-center bg-white" src="https://commerce-stage.acropora.hu/static/1791052644951-5902026731010.webp"/></div></a>'

function oldal(fej: string, torzs: string): ReturnType<typeof kivonat> {
  return kivonat(
    `<!DOCTYPE html><html><head>${fej}</head><body>${torzs}</body></html>`,
  )
}
const JO_FEJ =
  '<title>Vitalis LPS Coral Pellets | Acropora</title><meta name="description" content="LPS korallok tápja, lassan süllyedő pellet."/><link rel="canonical" href="https://shop-staging.acropora.hu/hu/termek/vitalis-lps"/>'
const V: Valasz = {
  ut: "/hu/termek/vitalis-lps",
  statusz: 200,
  xRobots: null,
}
const fut = (sz: keyof typeof SZABALYOK, k = oldal(JO_FEJ, ""), v = V) =>
  SZABALYOK[sz](k, v)

describe("szerkezet", () => {
  it("egy H1, egy main", () => {
    const jo = oldal(JO_FEJ, "<main><h1>Vitalis</h1></main>")
    expect(fut("egy-h1", jo)).toEqual([])
    expect(fut("egy-main", jo)).toEqual([])
    const ket = oldal(JO_FEJ, "<main><h1>A</h1><main><h1>A</h1></main></main>")
    expect(fut("egy-h1", ket)).toHaveLength(1)
    expect(fut("egy-main", ket)).toEqual(["2 <main> a lapon"])
  })
})

describe("cím és leírás", () => {
  it("a jó fej átmegy", () => {
    expect(fut("cim")).toEqual([])
    expect(fut("leiras")).toEqual([])
  })

  it("a starter angol helykitöltői és a cím-másolat pirosak", () => {
    expect(fut("cim", oldal("<title>Store</title>", ""))).toHaveLength(1)
    expect(
      fut("cim", oldal("<title>Cart | Acropora</title>", "")),
    ).toHaveLength(1)
    expect(
      fut("cim", oldal("<title>Product | Acropora</title>", "")),
    ).toHaveLength(1)
    expect(
      fut(
        "leiras",
        oldal(
          '<title>Vitalis | Acropora</title><meta name="description" content="Vitalis"/>',
          "",
        ),
      ),
    ).toEqual(["a leírás a cím másolata: Vitalis"])
    expect(fut("leiras", oldal("<title>X</title>", ""))).toEqual([
      "nincs meta description",
    ])
    expect(
      fut(
        "leiras",
        oldal(
          '<title>Keresés | Acropora</title><meta name="description" content="Explore all of our products."/>',
          "",
        ),
      ),
    ).toHaveLength(1)
  })
})

describe("canonical", () => {
  it("a termék önmagára mutat, abszolút, ékezetes úton is", () => {
    expect(fut("canonical-onmaga")).toEqual([])
    const ekezet = oldal(
      '<link rel="canonical" href="https://shop-staging.acropora.hu/hu/categories/aquaforest---korallt%C3%A1pok"/>',
      "",
    )
    expect(
      fut("canonical-onmaga", ekezet, {
        ...V,
        ut: "/hu/categories/aquaforest---koralltápok",
      }),
    ).toEqual([])
    expect(
      fut(
        "canonical-onmaga",
        oldal('<link rel="canonical" href="/hu/x"/>', ""),
      ),
    ).toHaveLength(1)
    expect(fut("canonical-onmaga", oldal("", ""))).toEqual(["nincs canonical"])
  })

  it("a 2. lap saját canonicalt kap, az 1. lapra mutató piros", () => {
    const v = { ...V, ut: "/hu/categories/x?page=2" }
    const lap1 = oldal(
      '<link rel="canonical" href="https://b/hu/categories/x"/>',
      "",
    )
    const lap2 = oldal(
      '<link rel="canonical" href="https://b/hu/categories/x?page=2"/>',
      "",
    )
    expect(fut("lapozas-canonical", lap1, v)).toHaveLength(1)
    expect(fut("lapozas-canonical", lap2, v)).toEqual([])
  })

  it("a facet az alapra canonicalizál", () => {
    const v = { ...V, ut: "/hu/categories/x?marka=pcol_1" }
    const alap = oldal(
      '<link rel="canonical" href="https://b/hu/categories/x"/>',
      "",
    )
    const sajat = oldal(
      '<link rel="canonical" href="https://b/hu/categories/x?marka=pcol_1"/>',
      "",
    )
    expect(fut("canonical-alap", alap, v)).toEqual([])
    expect(fut("canonical-alap", sajat, v)).toHaveLength(1)
  })
})

describe("robots", () => {
  it("a meta és az X-Robots-Tag is számít", () => {
    const meta = oldal('<meta name="robots" content="noindex, follow"/>', "")
    expect(fut("noindex", meta)).toEqual([])
    expect(fut("indexelheto", meta)).toHaveLength(1)
    expect(fut("noindex", oldal("", ""), { ...V, xRobots: "noindex" })).toEqual(
      [],
    )
    expect(fut("noindex", oldal("", ""))).toHaveLength(1)
    expect(
      fut(
        "indexelheto",
        oldal('<meta name="robots" content="index, follow"/>', ""),
      ),
    ).toEqual([])
  })
})

describe("képek (Balázs 5. pontja)", () => {
  it('a fő kép a terméknévvel és a díszítő alt="" rendben', () => {
    const k = oldal(JO_FEJ, FO_KEP + ZAROSOR_KEP)
    expect(fut("alt", k)).toEqual([])
    expect(fut("fo-kep-nem-lusta", k)).toEqual([])
  })

  it("a Thumbnail listakép és a termék-link üres altja piros", () => {
    expect(fut("alt", oldal(JO_FEJ, LISTA_CSEMPE))).toEqual([
      'generikus alt "Thumbnail": https://commerce-stage.acropora.hu/static/1791052644951-5902026731010.webp',
    ])
    expect(fut("alt", oldal(JO_FEJ, KAPCSOLAT_KARTYA))).toEqual([
      "termékkép üres alttal: https://commerce-stage.acropora.hu/static/1788803561869-5060139358712.webp",
    ])
  })

  it("a Termékfotó és a hiányzó alt is piros, a valódi név nem", () => {
    const termekfoto = FO_KEP.replace(
      'alt="Vitalis LPS Coral Pellets - LPS koralltáp 60g"',
      'alt="Termékfotó"',
    )
    expect(termekfoto).not.toBe(FO_KEP)
    expect(fut("alt", oldal(JO_FEJ, termekfoto))).toHaveLength(1)
    expect(fut("alt", oldal(JO_FEJ, '<img src="/a.webp"/>'))).toEqual([
      "hiányzó alt attribútum: /a.webp",
    ])
    expect(
      fut(
        "alt",
        oldal(JO_FEJ, '<img src="/a.webp" alt="Termékfotó tartó állvány"/>'),
      ),
    ).toEqual([])
  })

  it("a lusta fő kép és a jelöletlen fő kép piros", () => {
    const lusta = FO_KEP.replace("<img ", '<img loading="lazy" ')
    expect(fut("fo-kep-nem-lusta", oldal(JO_FEJ, lusta))).toEqual([
      "a fő termékkép loading=lazy",
    ])
    expect(fut("fo-kep-nem-lusta", oldal(JO_FEJ, ZAROSOR_KEP))).toHaveLength(1)
  })
})

describe("linkek és JSON-LD", () => {
  it("termék- és alkategória-link", () => {
    expect(fut("termek-linkek", oldal(JO_FEJ, LISTA_CSEMPE))).toEqual([])
    expect(fut("termek-linkek", oldal(JO_FEJ, "<p>üres</p>"))).toHaveLength(1)
    const v = { ...V, ut: "/hu/categories/felso" }
    expect(
      fut(
        "alkategoria-linkek",
        oldal(JO_FEJ, '<a href="/hu/categories/also">x</a>'),
        v,
      ),
    ).toEqual([])
    expect(
      fut(
        "alkategoria-linkek",
        oldal(JO_FEJ, '<a href="/hu/categories/felso">x</a>'),
        v,
      ),
    ).toHaveLength(1)
  })

  it("Product JSON-LD: érvényes, a H1 nevével, ajánlattal", () => {
    const ld = (x: unknown) =>
      `<script type="application/ld+json">${JSON.stringify(x)}</script>`
    const termek = {
      "@type": "Product",
      name: "Vitalis",
      offers: {
        price: 1990,
        priceCurrency: "HUF",
        availability: "https://schema.org/InStock",
      },
    }
    // FE-2a: a lapon latszo ar es elerhetoseg, a kirakat jelolesevel
    const LAP =
      '<span data-testid="product-price" data-value="1990">1 990 Ft</span><button data-testid="add-product-button" data-elerhetoseg="KAPHATO">Kosárba</button>'
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, `<h1>Vitalis</h1>${LAP}${ld(termek)}`),
      ),
    ).toEqual([])
    expect(
      fut("json-ld-product", oldal(JO_FEJ, `<h1>Más</h1>${LAP}${ld(termek)}`)),
    ).toHaveLength(1)
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, '<script type="application/ld+json">{nem json</script>'),
      ),
    ).toHaveLength(1)
    expect(fut("json-ld-product", oldal(JO_FEJ, ""))).toEqual([
      "nincs Product JSON-LD",
    ])
    expect(
      fut(
        "json-ld-breadcrumb",
        oldal(JO_FEJ, ld({ "@type": "BreadcrumbList" })),
      ),
    ).toEqual([])
  })
})

describe("lapozó és fülek (barracuda átvétele, #519)", () => {
  it("a lapozó: a saját út 2. lapjára mutató <a href> kell", () => {
    const v = { ...V, ut: "/hu/categories/x" }
    const jo = oldal(
      JO_FEJ,
      '<a href="/hu/categories/x?sortBy=price_asc&page=2">2</a>',
    )
    const mas = oldal(JO_FEJ, '<a href="/hu/categories/y?page=2">2</a>')
    const gomb = oldal(JO_FEJ, "<button>2</button>")
    expect(fut("lapozo-linkek", jo, v)).toEqual([])
    expect(fut("lapozo-linkek", mas, v)).toHaveLength(1)
    expect(fut("lapozo-linkek", gomb, v)).toHaveLength(1)
    // a kategoria valodi lapozoja relativ linket ad (2026-10-07, a kirakat HTML-jebol)
    const relativ = oldal(
      JO_FEJ,
      '<a href="?page=2" class="flex h-[54px] w-full max-w-[320px] items-center justify-center bo">Továbbiak</a>',
    )
    expect(fut("lapozo-linkek", relativ, v)).toEqual([])
    // csak a 3. lapra mutato link: nem a 2. lap
    const harmadik = oldal(JO_FEJ, '<a href="/hu/categories/x?page=3">3</a>')
    expect(fut("lapozo-linkek", harmadik, v)).toHaveLength(1)
  })

  it("a fülek: annyi nem üres panel, ahány fül", () => {
    const fulek =
      '<button role="tab">Leírás</button><button role="tab">Műszaki adatok</button>'
    const ket = oldal(
      JO_FEJ,
      `${fulek}<div role="tabpanel">Leírás szövege</div><div role="tabpanel" hidden>Teljesítmény: 30 W</div>`,
    )
    const egy = oldal(
      JO_FEJ,
      `${fulek}<div role="tabpanel">Leírás szövege</div>`,
    )
    const ures = oldal(
      JO_FEJ,
      `${fulek}<div role="tabpanel">Leírás</div><div role="tabpanel" hidden></div>`,
    )
    expect(fut("rejtett-ful", ket)).toEqual([])
    expect(fut("rejtett-ful", egy)).toEqual([
      "2 fül, de 1 panel az első HTML-ben",
    ])
    expect(fut("rejtett-ful", ures)).toEqual(["üres fül-panel"])
    expect(fut("rejtett-ful", oldal(JO_FEJ, "<p>nincs fül</p>"))).toEqual([])
  })
})

describe("a ?v_id: a kijelölt opció, kontrollal (barracuda átvétele, #521)", () => {
  // a valodi `option-select.tsx` jelolese, a magyarazo sorral egyutt
  const gomb = (ertek: string, kijelolt: boolean) =>
    `<button type="button" class="text-left" style="padding:12px" aria-pressed="${kijelolt}" data-testid="option-button">${ertek}<div style="margin-top:3px" data-testid="opcio-magyarazat">Nagyobb kiszerelés</div></button>`
  const lap = (kijelolt: "50 ml" | "100 ml" | null) =>
    oldal(
      JO_FEJ,
      gomb("50 ml", kijelolt === "50 ml") +
        gomb("100 ml", kijelolt === "100 ml") +
        // az RSC-adat minden valtozat cikkszamat viszi: a meres ezt NEM nezheti
        '<script>self.__next_f.push([1,"B-1 B-2 100 ml"])</script>',
    )

  it("a kivonat a gomb értékét adja, a magyarázó sor nélkül", () => {
    expect(lap("100 ml").kijeloltOpciok).toEqual(["100 ml"])
    expect(lap(null).kijeloltOpciok).toEqual([])
  })

  it("v_id-vel a kért opció, nélküle más: rendben", () => {
    expect(valtozatHibak(["100 ml"], lap("100 ml"), lap("50 ml"))).toEqual([])
    expect(valtozatHibak(["100 ml"], lap("100 ml"), lap(null))).toEqual([])
  })

  it("ha v_id-vel nem a kért opció áll, piros (a nyers szöveg ezt nem látná)", () => {
    expect(valtozatHibak(["100 ml"], lap("50 ml"), lap("50 ml"))).toHaveLength(
      1,
    )
    expect(valtozatHibak(["100 ml"], lap(null), lap(null))).toHaveLength(1)
  })

  it("a kontroll: ha v_id nélkül is a kért opció áll, a mérés nem különböztet", () => {
    expect(valtozatHibak(["100 ml"], lap("100 ml"), lap("100 ml"))).toEqual([
      "v_id nélkül is a kért opció van kijelölve: a mérés nem különbözteti meg a változatot",
    ])
  })
})

/*
  BELSO UTRA SEMMI NEM MUTAT (FE-7 3. resz). MI PIROSIT: a lapozo vagy a
  canonical a belso `/_p/` vagy `/_v/` utat adja (kivulrol 404); a kodolt alak
  atjut; a nyilvanos lapszamos link hibanak latszik.
*/
describe("belső útra mutató link (FE-7)", () => {
  const v = { ...V, ut: "/hu/categories/x?page=2" }

  it("a nyilvános lapszámos és változatos link rendben", () => {
    const jo = oldal(
      JO_FEJ,
      '<a href="/hu/categories/x?page=3">3</a><a href="?page=1">1</a><a href="/hu/termek/h?v_id=variant_01M1NKD0MAH36C3YMC0QX64NZB">v</a>',
    )
    expect(fut("belso-ut-link", jo, v)).toEqual([])
  })

  it("a belső lapozott, változat- és szűrt út hiba, kódolva is", () => {
    const rossz = oldal(
      JO_FEJ,
      '<a href="/hu/_p/3/categories/x">3</a><a href="/hu/%5Fv/variant_01M1NKD0MAH36C3YMC0QX64NZB/termek/h">v</a><a href="/hu/_szurt/store?q=a">s</a>',
    )
    expect(fut("belso-ut-link", rossz, v)).toHaveLength(3)
  })

  it("a canonical és az og:url sem lehet belső", () => {
    const fej =
      '<title>X | Acropora</title><link rel="canonical" href="https://shop-staging.acropora.hu/hu/_p/2/categories/x"/><meta property="og:url" content="/hu/_p/2/categories/x"/>'
    expect(fut("belso-ut-link", oldal(fej, ""), v)).toHaveLength(2)
  })
})

/*
  A SZURT LAPRA MUTATO LINK (FE-4b). A linkek a teszt kirakatrol vannak masolva
  (2026-10-07, `/hu/categories/vízkezelés---termékek` es `/hu/store?q=hanna`,
  meg `rel` nelkul). MI PIROSIT: egy marka-, kereses- vagy szurt lapozo-link
  `nofollow` nelkul atmegy; a szuro levetele (`?`), a sima lapozo vagy a
  termeklink hibat ad; egy `nofollow`-ra csak hasonlito `rel` atmegy.
*/
describe("szűrt lapra mutató link (FE-4b)", () => {
  const MARKA =
    '<a href="?marka=pcol_01M2KA5H4N02NV49K933QS6ZGT" class="flex items-center justify-between gap-2 text-[14px] leading-[22px] hover:text-acr-ink text-acr-slate">Aquaforest</a>'
  const KERESES_MARKA =
    '<a href="?q=hanna&amp;marka=pcol_01M2KA5J1YR3DTP0W9Z5RJ8PPP" class="flex items-center justify-between gap-2 text-[14px] leading-[22px] hover:text-acr-ink text-acr-slate">Hanna</a>'
  const KERESES_TOVABB =
    '<a href="?q=hanna&amp;page=2" class="flex h-[54px] w-full max-w-[320px] items-center justify-center border border-acr-line bg-acr-white px-8 text-[15px] font-medium text-acr-ink" data-testid="kereses-tovabb">További találatok</a>'
  const LEVETEL =
    '<a href="?" class="flex h-[42px] items-center bg-acr-navy px-6 text-[14px] font-medium text-acr-white" aria-label="Aquaforest szűrő levétele">Aquaforest ×</a>'
  const nofollow = (a: string, rel = "nofollow") =>
    a.replace("<a ", `<a rel="${rel}" `)

  it("a kirakat mai linkjei nofollow nélkül: mind a három hiba", () => {
    const k = oldal(JO_FEJ, MARKA + KERESES_MARKA + KERESES_TOVABB)
    expect(fut("szuro-link-nofollow", k)).toEqual([
      "szűrt lapra mutató link nofollow nélkül: ?marka=pcol_01M2KA5H4N02NV49K933QS6ZGT",
      "szűrt lapra mutató link nofollow nélkül: ?q=hanna&marka=pcol_01M2KA5J1YR3DTP0W9Z5RJ8PPP",
      "szűrt lapra mutató link nofollow nélkül: ?q=hanna&page=2",
    ])
  })

  it("nofollow-val rendben; a levétel, a sima lapozó és a terméklink nem kell", () => {
    const k = oldal(
      JO_FEJ,
      nofollow(MARKA) +
        nofollow(KERESES_MARKA, "nofollow noopener") +
        nofollow(KERESES_TOVABB) +
        LEVETEL +
        '<a href="?page=2">2</a>' +
        LISTA_CSEMPE,
    )
    expect(fut("szuro-link-nofollow", k)).toEqual([])
  })

  it("a nofollow-ra csak hasonlító rel nem elég", () => {
    const k = oldal(JO_FEJ, nofollow(MARKA, "nofollower"))
    expect(fut("szuro-link-nofollow", k)).toHaveLength(1)
  })
})

/*
  A JSON-LD A LAPON LATSZO ERTEKET ALLITJA (FE-2a). MI PIROSIT: mas ar vagy
  elerhetoseg, mint a lapon; latszo ar nelkul is atmegy; SearchAction a
  webhelyen; hianyzo szervezet; a morzsamenu mas nevet vagy mas szamu elemet ad.
*/
describe("strukturált adat a látható laphoz mérve (FE-2a)", () => {
  const ld = (x: unknown) =>
    `<script type="application/ld+json">${JSON.stringify(x)}</script>`
  const ajanlat = (felul: Record<string, unknown> = {}) => ({
    "@type": "Product",
    name: "Vitalis",
    offers: {
      price: 1990,
      priceCurrency: "HUF",
      availability: "https://schema.org/InStock",
      ...felul,
    },
  })
  const lap = (ar: string, el: string) =>
    `<h1>Vitalis</h1><span data-testid="product-price" data-value="${ar}">x</span><button data-elerhetoseg="${el}">x</button>`

  it("az ár és az elérhetőség a lapé", () => {
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, lap("1990", "KAPHATO") + ld(ajanlat())),
      ),
    ).toEqual([])
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, lap("2490", "KAPHATO") + ld(ajanlat())),
      ),
    ).toHaveLength(1)
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, lap("1990", "ELFOGYOTT") + ld(ajanlat())),
      ),
    ).toHaveLength(1)
    expect(
      fut(
        "json-ld-product",
        oldal(
          JO_FEJ,
          lap("1990", "ELFOGYOTT") +
            ld(ajanlat({ availability: "https://schema.org/OutOfStock" })),
        ),
      ),
    ).toEqual([])
    expect(
      fut("json-ld-product", oldal(JO_FEJ, "<h1>Vitalis</h1>" + ld(ajanlat()))),
    ).toHaveLength(2)
  })

  it("szervezet és webhely, SearchAction nélkül", () => {
    const jo =
      ld({ "@type": "Organization", name: "Acropora" }) +
      ld({ "@type": "WebSite", name: "Acropora" })
    expect(fut("json-ld-szervezet", oldal(JO_FEJ, jo))).toEqual([])
    expect(
      fut("json-ld-szervezet", oldal(JO_FEJ, ld({ "@type": "WebSite" }))),
    ).toHaveLength(1)
    const kereso =
      ld({ "@type": "Organization" }) +
      ld({ "@type": "WebSite", potentialAction: { "@type": "SearchAction" } })
    expect(fut("json-ld-szervezet", oldal(JO_FEJ, kereso))).toHaveLength(1)
  })

  it("a morzsamenü JSON-LD-je a látható morzsamenü, a / jel nélkül", () => {
    const nav =
      '<nav aria-label="Morzsamenü"><ol><li><a href="/hu/categories/t">Termékek</a><span aria-hidden="true">/</span></li><li aria-current="page">Hanna</li></ol></nav>'
    const morzsa = (...nevek: string[]) =>
      ld({
        "@type": "BreadcrumbList",
        itemListElement: nevek.map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
        })),
      })
    expect(
      fut(
        "json-ld-morzsa-egyezik",
        oldal(JO_FEJ, nav + morzsa("Termékek", "Hanna")),
      ),
    ).toEqual([])
    expect(
      fut(
        "json-ld-morzsa-egyezik",
        oldal(JO_FEJ, nav + morzsa("Termékek - Gyökér", "Hanna")),
      ),
    ).toHaveLength(1)
    expect(
      fut("json-ld-morzsa-egyezik", oldal(JO_FEJ, nav + morzsa("Hanna"))),
    ).not.toEqual([])
    // a termeklap vege a cikkszamot mutatja: az utolso nev a H1-gyel is jo
    const termekNav =
      '<h1>Hanna HI780-25</h1><nav aria-label="Morzsamenü"><ol><li><a href="/hu/categories/t">Termékek</a></li><li aria-current="page"><span aria-hidden="true">/</span><span>HI780-25</span></li></ol></nav>'
    expect(
      fut(
        "json-ld-morzsa-egyezik",
        oldal(JO_FEJ, termekNav + morzsa("Termékek", "Hanna HI780-25")),
      ),
    ).toEqual([])
  })
})

/*
  A TERMEKKEPEK MERETEZESE ES RANGJA (FE-3). MI PIROSIT: srcset nelkuli vagy
  meret nelkuli termekkep atmegy; a fill-es listakep (a doboz aranya tartja)
  hibanak szamit; a fo kep fetchpriority nelkul atmegy; az elso listakep
  lusta, vagy egy kep nelkuli lista zold.
*/
describe("termékképek: méretezés és rang (FE-3)", () => {
  const LISTA_FILL =
    '<a href="/hu/termek/a"><img alt="A" loading="lazy" decoding="async" data-nimg="fill" sizes="280px" srcset="/_next/image?url=x&amp;w=384&amp;q=50 384w" src="/_next/image?url=x&amp;w=3840&amp;q=50" style="position:absolute;height:100%;width:100%"/></a>'
  const LISTA_ELSO =
    '<a href="/hu/termek/b"><img alt="B" fetchpriority="high" decoding="async" data-nimg="fill" sizes="280px" srcset="/_next/image?url=y&amp;w=384&amp;q=50 384w" src="/_next/image?url=y&amp;w=3840&amp;q=50"/></a>'
  const FO =
    '<img alt="Fő" fetchpriority="high" width="1600" height="1000" decoding="async" sizes="100vw" srcset="/_next/image?url=z&amp;w=640&amp;q=75 640w" src="/_next/image?url=z&amp;w=3840&amp;q=75" class="termeklap-nagykep w-full"/>'
  const NYERS =
    '<a href="/hu/termek/c"><img alt="C" src="https://bolt/static/c.webp"/></a>'

  it("srcset és méret (width/height vagy fill) kell minden termékképen", () => {
    expect(
      fut("kep-meretezes", oldal(JO_FEJ, LISTA_ELSO + LISTA_FILL + FO)),
    ).toEqual([])
    expect(fut("kep-meretezes", oldal(JO_FEJ, NYERS))).toHaveLength(2)
  })

  it("a fő kép fetchpriority=high", () => {
    expect(fut("fo-kep-kiemelt", oldal(JO_FEJ, FO))).toEqual([])
    expect(
      fut(
        "fo-kep-kiemelt",
        oldal(JO_FEJ, FO.replace(' fetchpriority="high"', "")),
      ),
    ).toHaveLength(1)
  })

  it("az első listakép nem lusta; kép nélküli lista hiba", () => {
    expect(
      fut("elso-listakep-nem-lusta", oldal(JO_FEJ, LISTA_ELSO + LISTA_FILL)),
    ).toEqual([])
    expect(
      fut("elso-listakep-nem-lusta", oldal(JO_FEJ, LISTA_FILL + LISTA_ELSO)),
    ).toHaveLength(1)
    expect(
      fut("elso-listakep-nem-lusta", oldal(JO_FEJ, "<p>üres</p>")),
    ).toHaveLength(1)
  })
})

/*
  A TOBBVALTOZATOS TERMEK ES A GTIN (FE-2b). MI PIROSIT: egy ProductGroup a lap
  arat nem a valtozatai kozul allitja; egy valtozat nem forintos; a GTIN-es
  terméken hianyzik vagy mas a kod; a GTIN nelkulin megis all egy.
*/
describe("ProductGroup és GTIN (FE-2b)", () => {
  const ld = (x: unknown) =>
    `<script type="application/ld+json">${JSON.stringify(x)}</script>`
  const csoport = (
    arak: number[],
    penznem = "HUF",
    elerhetoseg = (_i: number) => "https://schema.org/InStock",
  ) => ({
    "@type": "ProductGroup",
    name: "Só",
    hasVariant: arak.map((price, i) => ({
      "@type": "Product",
      name: `Só (${i + 1})`,
      ...(i === 0 ? { gtin13: "5060139356268" } : {}),
      offers: { price, priceCurrency: penznem, availability: elerhetoseg(i) },
    })),
  })
  const lap = (ar: string, el = "KAPHATO") =>
    `<h1>Só</h1><span data-testid="product-price" data-value="${ar}">x</span><button data-elerhetoseg="${el}">x</button>`

  it("a lap ára az egyik változaté", () => {
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, lap("3990") + ld(csoport([1990, 3990]))),
      ),
    ).toEqual([])
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, lap("2990") + ld(csoport([1990, 3990]))),
      ),
    ).toHaveLength(1)
    expect(
      fut(
        "json-ld-product",
        oldal(JO_FEJ, lap("1990") + ld(csoport([1990, 3990], "EUR"))),
      ),
    ).toHaveLength(2)
    expect(
      fut("json-ld-product", oldal(JO_FEJ, lap("1990") + ld(csoport([])))),
    ).toContain("üres hasVariant")
  })

  it("a látott árú változat elérhetősége a gombé", () => {
    // a 2. valtozat (3990) elfogyott
    const ld2 = ld(
      csoport([1990, 3990], "HUF", (i) =>
        i === 1
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      ),
    )
    expect(
      fut("json-ld-product", oldal(JO_FEJ, lap("3990", "ELFOGYOTT") + ld2)),
    ).toEqual([])
    expect(
      fut("json-ld-product", oldal(JO_FEJ, lap("3990", "KAPHATO") + ld2)),
    ).toHaveLength(1)
    expect(
      fut("json-ld-product", oldal(JO_FEJ, lap("1990", "ELFOGYOTT") + ld2)),
    ).toHaveLength(1)
  })

  it("gtinHibak: a várt kód pontosan áll, GTIN nélkül egy sem", () => {
    const vele = oldal(JO_FEJ, ld(csoport([1990])))
    const nelkule = oldal(JO_FEJ, ld({ "@type": "Product", name: "Só" }))
    expect(gtinHibak(vele, "5060139356268")).toEqual([])
    expect(gtinHibak(vele, "4006381333931")).toHaveLength(1)
    expect(gtinHibak(nelkule, "5060139356268")).toHaveLength(1)
    expect(gtinHibak(nelkule, null)).toEqual([])
    expect(gtinHibak(vele, null)).toHaveLength(1)
  })
})
