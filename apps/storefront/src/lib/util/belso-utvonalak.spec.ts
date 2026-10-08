import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match"
import {
  matchHas,
  prepareDestination,
} from "next/dist/shared/lib/router/utils/prepare-destination"
import { describe, expect, it } from "vitest"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const belso = require("../../../belso-utvonalak") as {
  belsoAtirasok: () => {
    source: string
    has: { type: "query"; key: string; value?: string }[]
    destination: string
  }[]
  belsoUtKivulrol: (pathname: string) => boolean
  termekUtAtiranyitasok: (alap?: string) => {
    source: string
    destination: string
    statusCode: number
  }[]
  SZURO_KULCSOK: string[]
}

/*
  A PUBLIKUS CIM BELSO UTJA (FE-7 3. resz). A szabalyokat a NEXT SAJAT
  illesztoivel futtatjuk (`getPathMatch`, `matchHas`, `prepareDestination`),
  ugyanabban a sorrendben, ahogy a `beforeFiles`: az elso illeszkedo nyer.

  MI PIROSIT: egy szuro a gyorsitotarazott lapra kerul (rossz tartalom); a
  valtozat vagy a lapszam query-ben marad (a lap dinamikus); a szuro es a
  lapszam egyutt a lapozott (gyorsitotarazott) lapra kerul; egy kampany-
  parameter kulon bejegyzest kap; egy belso ut kivulrol elerheto.
*/
const atir = (cim: string): string | null => {
  const u = new URL(cim, "https://kirakat.example.test")
  const query = Object.fromEntries(u.searchParams.entries())
  for (const szabaly of belso.belsoAtirasok()) {
    const ut = getPathMatch(szabaly.source)(u.pathname)
    if (!ut) continue
    const has = matchHas({ headers: {} } as never, query, szabaly.has, [])
    if (!has) continue
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: szabaly.destination,
      params: { ...ut, ...has },
      query: {},
    })
    return parsedDestination.pathname
  }
  return null
}

const V = "variant_01JABCDEFGHJKMNPQRSTVWXYZ0"

describe("a termék változata", () => {
  it("a v_id belső útra kerül", () => {
    expect(atir(`/hu/termek/hanna?v_id=${V}`)).toBe(`/hu/_v/${V}/termek/hanna`)
  })

  it("v_id nélkül, vagy nem változat-azonosítóval nincs átírás", () => {
    expect(atir("/hu/termek/hanna")).toBeNull()
    expect(atir("/hu/termek/hanna?v_id=barmi")).toBeNull()
    expect(atir(`/hu/termek/hanna?v_id=${V}x`)).toBeNull()
  })
})

describe("a listák", () => {
  it("a lapszám belső útra kerül, minden listatípuson", () => {
    expect(atir("/hu/categories/a/b?page=3")).toBe("/hu/_p/3/categories/a/b")
    expect(atir("/hu/collections/boyu?page=2")).toBe(
      "/hu/_p/2/collections/boyu",
    )
    expect(atir("/hu/store?page=4")).toBe("/hu/_p/4/store")
    expect(atir("/hu/store?page=9999")).toBe("/hu/_p/9999/store")
  })

  it("az ékezetes, kódolt kategória-út épen megmarad", () => {
    const h = encodeURIComponent("hanna-fotométerek,-reagensek---tesztek")
    expect(atir(`/hu/categories/${h}?page=2`)).toBe(`/hu/_p/2/categories/${h}`)
  })

  it("az 1. lap és az érvénytelen lapszám az alaplap", () => {
    for (const p of ["1", "0", "-2", "abc", "2.5", "10000", "02", ""])
      expect(atir(`/hu/categories/a?page=${p}`)).toBeNull()
  })

  it("a szűrő-lista minden kulcsot tartalmaz, amit a listalapok ma olvasnak", () => {
    // A lapok forrasabol, kezzel (categories, collections, store page.tsx):
    // sortBy, optionValueIds (parseOptionValueIds), marka (MARKA_PARAM),
    // q (keresesSzovege), gyoker (GYOKER_PARAM). Ha egy lap uj kulcsot olvas,
    // ide is, a szabalyba is be kell kerulnie.
    expect(belso.SZURO_KULCSOK).toEqual(
      expect.arrayContaining([
        "sortBy",
        "optionValueIds",
        "marka",
        "q",
        "gyoker",
      ]),
    )
  })

  it("minden szűrő a dinamikus útra visz, a lapszámmal együtt is", () => {
    for (const kulcs of belso.SZURO_KULCSOK)
      for (const tipus of ["categories/a", "collections/boyu", "store"]) {
        expect(atir(`/hu/${tipus}?${kulcs}=x`)).toBe(`/hu/_szurt/${tipus}`)
        expect(atir(`/hu/${tipus}?page=2&${kulcs}=x`)).toBe(
          `/hu/_szurt/${tipus}`,
        )
      }
  })

  it("a kampány-paraméter nem kap külön utat", () => {
    expect(atir("/hu/categories/a?utm_source=fb&fbclid=x")).toBeNull()
    expect(atir("/hu/store?gclid=x&page=2")).toBe("/hu/_p/2/store")
  })
})

describe("ami nem lista és nem termék, érintetlen", () => {
  it.each([
    "/hu",
    "/hu/cart?page=2",
    "/hu/account?sortBy=x",
    "/hu/jogi/aszf?page=2",
    `/hu/termek/hanna/extra?v_id=${V}`,
    "/hu/collections/a/b?page=2",
    "/hu/store/x?page=2",
    "/hu/categories?page=2",
  ])("%s", (cim) => {
    expect(atir(cim)).toBeNull()
  })
})

describe("a belső út kívülről", () => {
  it("a három előtag zárva, a nyilvános utak nem", () => {
    expect(belso.belsoUtKivulrol(`/hu/_v/${V}/termek/hanna`)).toBe(true)
    expect(belso.belsoUtKivulrol("/hu/_p/2/store")).toBe(true)
    expect(belso.belsoUtKivulrol("/hu/_szurt/categories/a")).toBe(true)
    // a kodolt alak is (barracuda elozetes review, 3. pont)
    expect(belso.belsoUtKivulrol(`/hu/%5Fv/${V}/termek/hanna`)).toBe(true)
    expect(belso.belsoUtKivulrol("/hu/%5fp/2/store")).toBe(true)
    expect(belso.belsoUtKivulrol("/hu/%E0%A4%A/store")).toBe(false)
    expect(belso.belsoUtKivulrol("/hu/termek/_p")).toBe(false)
    expect(belso.belsoUtKivulrol("/hu/store")).toBe(false)
    expect(belso.belsoUtKivulrol("/_p")).toBe(false)
  })
})

describe("a régi termeklap-cím 301-e (SEO P0 PR 7d)", () => {
  const iranyit = (cim: string) => {
    const u = new URL(cim, "https://kirakat.example.test")
    for (const szabaly of belso.termekUtAtiranyitasok("hu")) {
      const ut = getPathMatch(szabaly.source)(u.pathname)
      if (!ut) continue
      const { parsedDestination } = prepareDestination({
        appendParamsToQuery: false,
        destination: szabaly.destination,
        params: ut,
        query: {},
      })
      return { ut: parsedDestination.pathname, statusz: szabaly.statusCode }
    }
    return null
  }

  it("az országos régi cím egy 301-gyel a /termek/ alakra", () => {
    expect(iranyit("/hu/products/hanna")).toEqual({
      ut: "/hu/termek/hanna",
      statusz: 301,
    })
  })

  it("az ország nélküli régi cím is egy lépés, az alapországra", () => {
    expect(iranyit("/products/hanna")).toEqual({
      ut: "/hu/termek/hanna",
      statusz: 301,
    })
  })

  it("az új cím és egy idegen út nem irányít", () => {
    expect(iranyit("/hu/termek/hanna")).toBeNull()
    expect(iranyit("/hu/products")).toBeNull()
    expect(iranyit("/hu/products/hanna/extra")).toBeNull()
  })
})
