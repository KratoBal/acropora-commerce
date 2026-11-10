import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// the language of the page is its path segment: `hu` (Hungarian) or `en-hu` (English)
const nav = vi.hoisted(() => ({ countryCode: "hu" }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
  usePathname: () => "/hu/categories/termekek",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const adat = vi.hoisted(() => ({
  listProducts: vi.fn(),
  listProductsWithSort: vi.fn(),
}))
vi.mock("@lib/data/products", () => adat)
const katAdat = vi.hoisted(() => ({ listCategories: vi.fn() }))
vi.mock("@lib/data/categories", () => katAdat)
const tartasAdat = vi.hoisted(() => ({ tartasiSzuroValasz: vi.fn() }))
vi.mock("@lib/data/tartasi-szuro", () => tartasAdat)
// A kartya gombja a kosar szerver-muveletet importalja; itt nem hivodik.
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))

import CommerceKategoriaLap, {
  LAP_MERET,
  kovetkezoLap,
  savElemek,
} from "./kategoria-lap"

const kat = (id: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ id, name, handle: id, ...extra }) as never

const KATEGORIA = kat("termekek", "Termékek", {
  parent_category: kat("gyoker", "Bolt"),
  category_children: [
    kat("vilagitas", "Világítás"),
    kat("ures", "biOrb"),
    kat("hibas", "Szűrés"),
  ],
})

/** A gyerekek szama: 28, 0 (ures), es egy sikertelen szamlalas. */
const SZAMOK: Record<string, number | Error> = {
  vilagitas: 28,
  led: 40,
  t5: 0,
  jelen: 0,
  ures: 0,
  hibas: new Error("halozati hiba"),
}

const termekek = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    handle: `p${i}`,
    title: `Termék ${i}`,
    variants: [],
  }))

const lap = async (props: Record<string, unknown> = {}) =>
  render(
    await CommerceKategoriaLap({
      category: KATEGORIA,
      page: 1,
      countryCode: "hu",
      ...props,
    }),
  )

beforeEach(() => {
  // Alapbol ures testver-lista: egy `undefined` valasz az egesz lapot
  // eltorne, es az a teszt-dupla hibaja lenne, nem a kode.
  katAdat.listCategories.mockResolvedValue([])
  adat.listProducts.mockImplementation(async ({ queryParams, pageParam }) => {
    if (String(queryParams.fields).startsWith("id,collection")) {
      // Ket lap markaval: 150 termek, 100-asaval.
      const lap = pageParam ?? 1
      const n = lap === 1 ? 100 : 50
      return {
        response: {
          products: Array.from({ length: n }, (_, i) => ({
            id: `m${lap}-${i}`,
            collection:
              i % 5 === 0
                ? null
                : i % 2 === 0
                  ? { id: "pcol_ati", title: "ATI" }
                  : { id: "pcol_dd", title: "D-D" },
          })),
          count: 150,
        },
        nextPage: null,
      }
    }
    const ertek = SZAMOK[queryParams.category_id[0]]
    if (ertek instanceof Error) throw ertek
    return { response: { products: [], count: ertek }, nextPage: null }
  })
  adat.listProductsWithSort.mockResolvedValue({
    response: { products: termekek(LAP_MERET), count: 40 },
    nextPage: 2,
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  nav.countryCode = "hu"
})

/**
 * A COMMERCE KATEGORIALAP (117:30). MI PIROSIT: ha az ures alkategoria a
 * savba vagy a szurobe kerul; ha egy sikertelen szamlalas eltunteti a
 * gyereket; ha a lista nem a kategoriara, nem 18-asaval vagy marka nelkul
 * kerdez; ha a "hol tartunk" sor osszeset igér, amikor csak egy lapnyi all ott.
 */
describe("a Commerce kategórialap", () => {
  it("a cím és a morzsamenü a kategóriát és a felmenőit mutatja", async () => {
    await lap()
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "Termékek",
    )
    const morzsa = screen.getByRole("navigation", { name: "Morzsamenü" })
    expect(within(morzsa).getByRole("link").getAttribute("href")).toBe(
      "/hu/categories/gyoker",
    )
    expect(morzsa.querySelector("[aria-current='page']")?.textContent).toBe(
      "Termékek",
    )
  })

  it("az üres alkategória kimarad, a számolatlan marad, szám nélkül", async () => {
    await lap()
    const sav = screen.getByTestId("gyors-kategoriak")
    expect(sav.textContent).toContain("Összes")
    expect(sav.textContent).toContain("Világítás")
    expect(sav.textContent).toContain("Szűrés")
    expect(sav.textContent).not.toContain("biOrb")

    const szuro = screen.getByTestId("szuro-kategoriak")
    const sorok = within(szuro)
      .getAllByRole("link")
      .map((a) => a.textContent)
    expect(sorok).toEqual(["Világítás28", "Szűrés"])
  })

  it("a lista a kategóriára, lapméretével és a márkával együtt kérdez", async () => {
    await lap({ sortBy: "price_asc" })
    const hivas = adat.listProductsWithSort.mock.calls[0][0]
    expect(hivas.queryParams.category_id).toEqual(["termekek"])
    expect(hivas.queryParams.limit).toBe(18)
    expect(hivas.queryParams.fields).toContain("*collection")
    expect(hivas.queryParams.fields).toContain("*variants.calculated_price")
    expect(hivas.sortBy).toBe("price_asc")
    expect(screen.getByTestId("kategoria-termekszam").textContent).toBe(
      "40 termék",
    )
  })

  it("az első lapon a Figma alakja, és van tovább", async () => {
    await lap()
    expect(screen.getByTestId("kategoria-hol-tartunk").textContent).toBe(
      "18 / 40 termék",
    )
    expect(
      screen.getByTestId("category-more-products").getAttribute("href"),
    ).toBe("?page=2")
  })

  it("a harmadik, utolsó lapon a sávot mondja, és nincs tovább", async () => {
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: termekek(4), count: 40 },
      nextPage: null,
    })
    await lap({ page: 3 })
    expect(screen.getByTestId("kategoria-hol-tartunk").textContent).toBe(
      "37–40 / 40 termék",
    )
    expect(screen.queryByTestId("category-more-products")).toBeNull()
  })

  it("a következő lap címe megtartja a rendezést és az opció-szűrőket", () => {
    expect(kovetkezoLap(1, "price_desc", ["o1", "o2"])).toBe(
      "?sortBy=price_desc&optionValueIds=o1&optionValueIds=o2&page=2",
    )
  })

  describe("levél-kategórián a testvérek (162:117)", () => {
    const LEVEL = kat("jelen", "Moonlight", {
      parent_category: kat("vilagitas", "Világítás"),
      category_children: [],
    })
    const TESTVEREK = [
      kat("led", "LED"),
      kat("jelen", "Moonlight"),
      kat("t5", "T5"),
    ]

    it("a sáv a testvéreket mutatja, az aktuálisat kiemelve, Összes nélkül", async () => {
      katAdat.listCategories.mockResolvedValue(TESTVEREK)
      await lap({ category: LEVEL })
      expect(katAdat.listCategories).toHaveBeenCalledWith({
        parent_category_id: "vilagitas",
        fields: "id,name,handle",
      })
      const sav = screen.getByTestId("gyors-kategoriak")
      expect(sav.textContent).not.toContain("Összes")
      expect(
        within(sav)
          .getAllByRole("listitem")
          .map((li) => li.textContent),
      ).toEqual(["LED", "Moonlight"])
      expect(sav.querySelector("[aria-current='page']")?.textContent).toBe(
        "Moonlight",
      )
      expect(screen.queryByTestId("szuro-kategoriak")).toBeNull()
    })

    it("ha a testvérek lekérése elbukik, csak az Összes marad", async () => {
      katAdat.listCategories.mockRejectedValue(new Error("hálózat"))
      await lap({ category: LEVEL })
      expect(screen.getByTestId("gyors-kategoriak").textContent).toBe("Összes")
    })

    it("gyerekes kategórián nem kér testvért", async () => {
      await lap()
      expect(katAdat.listCategories).not.toHaveBeenCalled()
    })
  })

  it("a sáv döntése: az üres kimarad, az aktuális akkor is marad, ha üres", () => {
    const jelen = kat("jelen", "Moonlight")
    const { mod, elemek } = savElemek(
      jelen,
      [],
      [kat("led", "LED"), jelen, kat("t5", "T5")],
      [40, 0, 0],
    )
    expect(mod).toBe("testverek")
    expect(elemek.map((e) => [e.kategoria.id, e.aktiv])).toEqual([
      ["led", false],
      ["jelen", true],
    ])
  })

  describe("a márka szűrő (117:108)", () => {
    it("a márkák a kategória összes termékéből, darabszámmal", async () => {
      await lap()
      const markaHivasok = adat.listProducts.mock.calls
        .map(([h]) => h)
        .filter((h) => String(h.queryParams.fields).startsWith("id,collection"))
      expect(markaHivasok.map((h) => h.pageParam)).toEqual([1, 2])
      const sorok = within(screen.getByTestId("szuro-markak"))
        .getAllByRole("link")
        .map((a) => a.textContent)
      // 150 termek, ebbol 30 marka nelkul: 120, fele-fele.
      expect(sorok).toEqual(["ATI60", "D-D60"])
    })

    it("a kiválasztott márka szűri a listát, csíkot kap, és levehető", async () => {
      await lap({ markak: ["pcol_ati"], sortBy: "price_asc" })
      expect(
        adat.listProductsWithSort.mock.calls[0][0].queryParams.collection_id,
      ).toEqual(["pcol_ati"])
      const csik = within(screen.getByTestId("aktiv-szurok")).getByRole("link")
      expect(csik.textContent).toBe("ATI ×")
      expect(csik.getAttribute("href")).toBe("?sortBy=price_asc")
      const sor = within(screen.getByTestId("szuro-markak"))
        .getByText("ATI")
        .closest("a")
      expect(sor?.getAttribute("aria-current")).toBe("true")
      expect(
        screen.getByTestId("category-more-products").getAttribute("href"),
      ).toBe("?sortBy=price_asc&marka=pcol_ati&page=2")
    })

    it("márka nélkül nincs szűrés és nincs csík", async () => {
      await lap()
      expect(
        adat.listProductsWithSort.mock.calls[0][0].queryParams.collection_id,
      ).toBeUndefined()
      expect(screen.queryByTestId("aktiv-szurok")).toBeNull()
    })

    it("ha a márkák lekérése elbukik, a lap áll, Márka szakasz nélkül", async () => {
      const eredeti = adat.listProducts.getMockImplementation()!
      adat.listProducts.mockImplementation(async (h) => {
        if (String(h.queryParams.fields).startsWith("id,collection"))
          throw new Error("hálózat")
        return eredeti(h)
      })
      await lap()
      expect(screen.queryByTestId("szuro-markak")).toBeNull()
      expect(screen.getByTestId("category-page-title")).toBeTruthy()
    })
  })
})

/**
 * A KATEGORIALAP ANGOLUL (`/en-hu/...`, Balazs 2026-11-01: a bolt ketnyelvu). MI PIROSIT: egy magyar felirat marad az angol
 * lapon (a szotarbol kimaradt kulcs vagy egy beegetett szoveg); az angol szoveg a magyar lapon jelenik meg; az angol lap
 * mas szamot vagy mas sorrendet mutat, mint a magyar (a felirat cserelodik, a lap nem).
 */
describe("a kategorialap angolul", () => {
  const MAGYAR = [
    "Morzsamenü",
    "Alkategóriák",
    "Összes",
    "Rendezés",
    "Részletek",
    "További termékek betöltése",
    " termék",
    "Keresés termék",
    "Legújabbak",
  ]

  it("minden felirata angol, es egy magyar sem marad", async () => {
    nav.countryCode = "en-hu"
    const { container } = await lap({ countryCode: "en-hu" })
    const szoveg = `${container.textContent} ${Array.from(
      container.querySelectorAll("[aria-label],[placeholder]"),
    )
      .map(
        (e) =>
          `${e.getAttribute("aria-label") ?? ""} ${e.getAttribute("placeholder") ?? ""}`,
      )
      .join(" ")}`
    for (const hu of MAGYAR) expect(szoveg, hu).not.toContain(hu)
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy()
    expect(screen.getByRole("list", { name: "Subcategories" })).toBeTruthy()
    expect(screen.getByText("All")).toBeTruthy()
    expect(screen.getByTestId("kategoria-termekszam").textContent).toBe(
      "40 products",
    )
    expect(screen.getByTestId("kategoria-hol-tartunk").textContent).toBe(
      "18 of 40 products",
    )
    expect(screen.getByTestId("category-more-products").textContent).toBe(
      "Load more products",
    )
    // a kategoria NEVE adat (a fixture egyik gyereke "Szűrés"), a fejlec felirata nem
    expect(screen.getByRole("heading", { name: "Filter" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Szűrés" })).toBeNull()
    expect(
      screen.getByPlaceholderText("Search by product or brand…"),
    ).toBeTruthy()
    const rendezes = screen.getByTestId("commerce-rendezes")
    expect(
      Array.from(rendezes.querySelectorAll("option")).map((o) => o.textContent),
    ).toEqual(["Newest", "Price: low to high", "Price: high to low"])
    expect(screen.getAllByTestId("kartya-reszletek")[0]!.textContent).toBe(
      "Details",
    )
  })

  it("a magyar lap valtozatlan, es az angol lap ugyanazt a listat kerdezi (a nyelv a regio utjan nem valtoztat adatot)", async () => {
    await lap({ countryCode: "hu" })
    const magyarHivas = adat.listProductsWithSort.mock.calls[0]![0]
    expect(screen.getByTestId("kategoria-termekszam").textContent).toBe(
      "40 termék",
    )
    cleanup()
    adat.listProductsWithSort.mockClear()
    nav.countryCode = "en-hu"
    await lap({ countryCode: "en-hu" })
    const angolHivas = adat.listProductsWithSort.mock.calls[0]![0]
    expect({ ...angolHivas, countryCode: "x" }).toEqual({
      ...magyarHivas,
      countryCode: "x",
    })
    // a regio-kereso a szegmenst kapja, ahogy az uton all (a `getRegion` szedi szet)
    expect(angolHivas.countryCode).toBe("en-hu")
  })
})

/**
 * AZ ELO ALLAT AGA UGYANEZT AZ OLDALT KAPJA (2026-11-01). MI PIROSIT: ha a
 * `kind` nem valtana kartyat (az elo allat a muszaki kartyat kapna); ha az
 * atvetel sor a muszaki oldalon is megjelenne, vagy az elo allaton elmaradna;
 * ha az angol oldalon a sor magyar maradna.
 */
describe("az élőállat-ág ugyanazon az oldalon", () => {
  const KORALL = kat("korallok", "Korallok", { category_children: [] })
  const elo = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `k${i}`,
      handle: `k${i}`,
      title: `Korall ${i}`,
      metadata: { unique_piece: true },
      variants: [
        {
          id: `kv${i}`,
          manage_inventory: true,
          inventory_quantity: 1,
        },
      ],
    }))

  it("a kind=livestock élőállat-kártyát és átvétel sort kap", async () => {
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: elo(3), count: 3 },
      nextPage: null,
    })
    await lap({ category: KORALL, kind: "livestock" })
    expect(
      screen.getAllByTestId("category-product-card-livestock"),
    ).toHaveLength(3)
    expect(screen.queryByTestId("commerce-termek-kartya")).toBeNull()
    expect(
      screen.getByTestId("category-helper-livestock").textContent,
    ).toContain("Személyes átvétel")
    // the live-animal page is two columns on a phone: its card stays compact
    expect(
      screen
        .getAllByTestId("category-product-card-livestock")[0]
        .querySelector("h2")!.className,
    ).toContain("text-[14px]")
  })

  it("a műszaki oldalon nincs átvétel sor, és a műszaki kártya áll", async () => {
    await lap()
    expect(screen.queryByTestId("category-helper-livestock")).toBeNull()
    expect(screen.getAllByTestId("commerce-termek-kartya")).toHaveLength(
      LAP_MERET,
    )
  })

  it("az angol oldalon az átvétel sor és a jelvény angol", async () => {
    nav.countryCode = "en-hu"
    adat.listProductsWithSort.mockResolvedValue({
      response: { products: elo(1), count: 1 },
      nextPage: null,
    })
    await lap({ category: KORALL, kind: "livestock", countryCode: "en-hu" })
    expect(
      screen.getByTestId("category-helper-livestock").textContent,
    ).toContain("Collection in person")
    expect(screen.getByTestId("kartya-jelveny").textContent).toBe(
      "1 pc · Unique piece",
    )
  })
})

/**
 * A MORZSAMENU ES A CIM A MEGJELENITENDO NEVET MUTATJA, NEM A TELJEST.
 *
 * A bolt nevadasa: a szulo neve a gyerek nevebe is beleall (`SPS - WYSIWYG`,
 * `WYSIWYG - Korallok`). A rovid alakot a MEGJELENITES szamolja, az adat a
 * teljeset hordozza; a terkepet (`nevek`) itt KEZZEL adjuk, szandekosan nem a
 * roviditesi szabalybol: a kerdes az, hogy az oldal HASZNALJA-E a kapott
 * terkepet. A roviditesi szabalyt a sajat specje meri.
 *
 * MI PIROSIT: ha a `nev()` a terkepet kihagyja, vagy a morzsamenu, vagy a cim
 * a teljes nevet kezdi mutatni (kalibralva: a `nev()` terkep-agat kiveve az
 * elso ket teszt piros).
 */
describe("a kategórialap névtérképe élő állat kategórián", () => {
  const KORALLOK = kat("korallok", "Korallok")
  const WYSIWYG = kat("wysiwyg", "WYSIWYG - Korallok", {
    parent_category: KORALLOK,
  })
  const SPS = kat("sps", "SPS - WYSIWYG", { parent_category: WYSIWYG })
  const TERKEP = new Map([
    ["korallok", "Korallok"],
    ["wysiwyg", "WYSIWYG"],
    ["sps", "SPS"],
  ])

  const morzsaNevek = () =>
    Array.from(
      screen
        .getByRole("navigation", { name: "Morzsamenü" })
        .querySelectorAll("li"),
    ).map((e) => (e.textContent ?? "").replace("/", "").trim())

  it("térképpel a felmenők és a jelenlegi szint a rövid nevet mutatja, a címben is", async () => {
    await lap({ category: SPS, kind: "livestock", nevek: TERKEP })
    expect(morzsaNevek()).toEqual(["Korallok", "WYSIWYG", "SPS"])
    expect(screen.getByTestId("category-page-title").textContent).toBe("SPS")
    const szoveg = screen.getByRole("navigation", {
      name: "Morzsamenü",
    }).textContent
    expect(szoveg).not.toContain("SPS - WYSIWYG")
    expect(szoveg).not.toContain("WYSIWYG - Korallok")
  })

  it("ütköző névnél a térkép a teljes alakot adja, és az áll ott", async () => {
    await lap({
      category: SPS,
      kind: "livestock",
      nevek: new Map([
        ["korallok", "Korallok"],
        ["wysiwyg", "WYSIWYG"],
        ["sps", "SPS - WYSIWYG"],
      ]),
    })
    expect(morzsaNevek()).toEqual(["Korallok", "WYSIWYG", "SPS - WYSIWYG"])
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "SPS - WYSIWYG",
    )
  })

  it("térkép nélkül a teljes nevek állnak, nem a rövidek", async () => {
    await lap({ category: SPS, kind: "livestock" })
    expect(morzsaNevek()).toEqual([
      "Korallok",
      "WYSIWYG - Korallok",
      "SPS - WYSIWYG",
    ])
    expect(screen.getByTestId("category-page-title").textContent).toBe(
      "SPS - WYSIWYG",
    )
  })

  it("a gyökér neve térképpel is változatlan", async () => {
    await lap({ category: KORALLOK, kind: "livestock", nevek: TERKEP })
    expect(morzsaNevek()).toEqual(["Korallok"])
  })
})

/*
  A TARTASI SZURO AZ ELO ALLAT LAPON (V2.2 S5). MI PIROSIT: a muszaki lap a boltot kerdezi; a talalatok nem `id` szurokent
  mennek a listara; ures talalatnal a lista szures nelkul jon (egy ures `id` nem szur); az "ellenorzes alatt" allatok
  szama nem latszik, vagy nincs link a szuro nelkuli listara; tul sok talalatnal csendben vagott lista; a bolt hibajanal
  egy aktiv szuro csendben elmarad; egy marka- vagy lapvaltas elveszti a tartasi szurot; a nulla darabos ertek sort kap.
*/
describe("a tartási szűrő az élő állat kategórián", () => {
  const valasz = (o: Record<string, unknown> = {}) => ({
    product_ids: ["p1", "p2"],
    unchecked: 0,
    complete: true,
    facets: {
      difficulty: { KONNYU: 3, KOZEPES: 0, HALADO: 1, SZAKERTO: 0 },
      reef_safe: 2,
      tank: { "0-100": 1, "101-300": 0, "301-": 0 },
    },
    ...o,
  })
  const szuro = (o: Record<string, unknown> = {}) => ({
    nehezseg: [],
    korallos: false,
    medence: [],
    ...o,
  })
  const listaHivas = () => adat.listProductsWithSort.mock.calls.at(-1)?.[0]

  it("a műszaki lap nem kérdezi a boltot, és nincs tartási szakasz", async () => {
    await lap({ tartas: szuro({ nehezseg: ["KONNYU"] }) })
    expect(tartasAdat.tartasiSzuroValasz).not.toHaveBeenCalled()
    expect(screen.queryByTestId("szuro-tartas-nehezseg")).toBeNull()
    expect(listaHivas().queryParams.id).toBeUndefined()
  })

  it("adat nélküli kategória (minden darabszám 0): nincs tartási szakasz, nincs mondat, a lista szűrés nélkül", async () => {
    tartasAdat.tartasiSzuroValasz.mockResolvedValue(
      valasz({
        product_ids: [],
        facets: {
          difficulty: { KONNYU: 0, KOZEPES: 0, HALADO: 0, SZAKERTO: 0 },
          reef_safe: 0,
          tank: { "0-100": 0, "101-300": 0, "301-": 0 },
        },
      }),
    )
    await lap({ kind: "livestock" })
    for (const id of [
      "szuro-tartas-nehezseg",
      "szuro-tartas-korallos",
      "szuro-tartas-medence",
      "szuro-megjegyzes",
    ])
      expect(screen.queryByTestId(id), id).toBeNull()
    expect(listaHivas().queryParams.id).toBeUndefined()
  })

  it("szűrő nélkül: a csoportok a darabszámmal, csak a nem nulla érték, és a lista id-szűrő nélkül", async () => {
    tartasAdat.tartasiSzuroValasz.mockResolvedValue(valasz())
    await lap({ kind: "livestock" })
    const nehezseg = screen.getByTestId("szuro-tartas-nehezseg")
    expect(nehezseg.textContent).toContain("Kezdőknek is3")
    expect(nehezseg.textContent).toContain("Haladóknak1")
    expect(nehezseg.textContent).not.toContain("Közepes")
    expect(screen.getByTestId("szuro-tartas-korallos").textContent).toContain(
      "Korallos akváriumban tartható",
    )
    expect(screen.getByTestId("szuro-tartas-medence").textContent).toContain(
      "legfeljebb 100 l1",
    )
    expect(listaHivas().queryParams.id).toBeUndefined()
    expect(screen.queryByTestId("szuro-megjegyzes")).toBeNull()
  })

  it("aktív szűrő: a találatok id-szűrőként; a linkek megtartják a márkát, a szűrőt és a lapozásban is", async () => {
    tartasAdat.tartasiSzuroValasz.mockResolvedValue(valasz())
    await lap({
      kind: "livestock",
      markak: ["pcol_ati"],
      tartas: szuro({ nehezseg: ["KONNYU"] }),
    })
    expect(tartasAdat.tartasiSzuroValasz).toHaveBeenCalledWith(
      "termekek",
      szuro({ nehezseg: ["KONNYU"] }),
    )
    expect(listaHivas().queryParams.id).toEqual(["p1", "p2"])
    expect(listaHivas().queryParams.collection_id).toEqual(["pcol_ati"])
    const sorLink = within(screen.getByTestId("szuro-tartas-nehezseg"))
      .getByText("Haladóknak")
      .closest("a")
    expect(sorLink?.getAttribute("href")).toBe(
      "?marka=pcol_ati&nehezseg=KONNYU&nehezseg=HALADO",
    )
    expect(sorLink?.getAttribute("rel")).toBe("nofollow")
    const aktiv = within(screen.getByTestId("szuro-tartas-nehezseg"))
      .getByText("Kezdőknek is")
      .closest("a")
    expect(aktiv?.getAttribute("aria-current")).toBe("true")
    expect(aktiv?.getAttribute("href")).toBe("?marka=pcol_ati")
    expect(
      screen.getByTestId("category-more-products").getAttribute("href"),
    ).toBe("?marka=pcol_ati&nehezseg=KONNYU&page=2")
    expect(screen.getByText("Törlés")).toBeTruthy()
  })

  it("üres találat: nincs listakérés, üres lista", async () => {
    tartasAdat.tartasiSzuroValasz.mockResolvedValue(valasz({ product_ids: [] }))
    await lap({ kind: "livestock", tartas: szuro({ korallos: true }) })
    expect(adat.listProductsWithSort).not.toHaveBeenCalled()
    expect(screen.getByTestId("category-products-empty")).toBeTruthy()
  })

  it("az ellenőrzés alatti állatok száma a lista fölött, link a szűrő nélküli listára", async () => {
    tartasAdat.tartasiSzuroValasz.mockResolvedValue(valasz({ unchecked: 7 }))
    await lap({ kind: "livestock", tartas: szuro({ medence: ["0-100"] }) })
    expect(screen.getByTestId("szuro-megjegyzes").textContent).toContain(
      "7 állat tartási adata még ellenőrzés alatt",
    )
    expect(screen.getByTestId("szuro-tartas-mind").getAttribute("href")).toBe(
      "?",
    )
  })

  it("túl sok találat: nem szűr, és kimondja", async () => {
    tartasAdat.tartasiSzuroValasz.mockResolvedValue(
      valasz({
        product_ids: Array.from({ length: 301 }, (_, i) => `p${i}`),
      }),
    )
    await lap({ kind: "livestock", tartas: szuro({ nehezseg: ["KONNYU"] }) })
    expect(listaHivas().queryParams.id).toBeUndefined()
    expect(screen.getByTestId("szuro-megjegyzes").textContent).toContain(
      "túl sok állat illik",
    )
  })

  it("a bolt nem válaszol, vagy a kategória túl nagy: nincs szakasz, az aktív szűrő helyett egy mondat", async () => {
    for (const v of [null, valasz({ complete: false })]) {
      tartasAdat.tartasiSzuroValasz.mockResolvedValue(v)
      await lap({ kind: "livestock", tartas: szuro({ nehezseg: ["KONNYU"] }) })
      expect(screen.queryByTestId("szuro-tartas-nehezseg")).toBeNull()
      expect(listaHivas().queryParams.id).toBeUndefined()
      expect(screen.getByTestId("szuro-megjegyzes").textContent).toContain(
        "nem érhető el",
      )
      cleanup()
    }
  })
})
