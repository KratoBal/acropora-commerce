import { describe, expect, it } from "vitest"

import { kivonat } from "./kivonat"
import { SZABALYOK, type Valasz } from "./szabalyok"

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
  '<a class="group flex flex-col gap-[10px]" data-testid="kapcsolat-kartya" href="/hu/products/vitalis-sps-coral-food-koralleledel-50gr"><div class="aspect-[32/30] w-full overflow-hidden bg-acr-white"><img src="https://commerce-stage.acropora.hu/static/1788803561869-5060139358712.webp" alt="" class="h-full w-full object-contain" data-testid="kapcsolat-kartya-kep"/></div><p>Vitalis SPS</p></a>'
const ZAROSOR_KEP =
  '<img src="https://commerce-stage.acropora.hu/static/1788539279383-5060139358699.webp" alt="" class="h-full w-full object-cover" data-testid="zarosor-belyeg-kep"/>'
const LISTA_CSEMPE =
  '<a class="group flex flex-1 flex-col" href="/hu/products/aquaforest-af-amino-mix-10ml"><div class="h-[242px] overflow-hidden bg-acr-white"><img alt="Thumbnail" draggable="false" loading="lazy" decoding="async" data-nimg="fill" class="absolute inset-0 object-contain object-center bg-white" src="https://commerce-stage.acropora.hu/static/1791052644951-5902026731010.webp"/></div></a>'

function oldal(fej: string, torzs: string): ReturnType<typeof kivonat> {
  return kivonat(
    `<!DOCTYPE html><html><head>${fej}</head><body>${torzs}</body></html>`,
  )
}
const JO_FEJ =
  '<title>Vitalis LPS Coral Pellets | Acropora</title><meta name="description" content="LPS korallok tápja, lassan süllyedő pellet."/><link rel="canonical" href="https://shop-staging.acropora.hu/hu/products/vitalis-lps"/>'
const V: Valasz = {
  ut: "/hu/products/vitalis-lps",
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
      offers: { price: "1990", priceCurrency: "HUF" },
    }
    expect(
      fut("json-ld-product", oldal(JO_FEJ, `<h1>Vitalis</h1>${ld(termek)}`)),
    ).toEqual([])
    expect(
      fut("json-ld-product", oldal(JO_FEJ, `<h1>Más</h1>${ld(termek)}`)),
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
