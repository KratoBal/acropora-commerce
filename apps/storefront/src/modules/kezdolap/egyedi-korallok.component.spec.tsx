import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))
const data = vi.hoisted(() => ({ listProducts: vi.fn() }))
vi.mock("@lib/data/products", () => data)
// az ar-komponens aszinkron szerver-komponens, a jsdom-ban felfuggesztene a renderelest;
// az ar SZAMOLASA (getProductPrice) valodi, csak a kirajzolasa egyszeru
vi.mock("@modules/products/components/product-preview/price", () => ({
  default: ({ price }: { price: { calculated_price: string } }) => (
    <span data-testid="price">{price.calculated_price}</span>
  ),
}))

import EgyediKorallok, {
  termekekHandleSzerint,
} from "./components/egyedi-korallok"
import { szovegek } from "./szovegek"

/**
 * AZ "EGYEDI KORALLOK" SAV.
 *
 * MI PIROSIT: ha a sav ures lista mellett is kirajzolodik (fejlec ures racs
 * folott); ha a kartyak sorrendje a bolte, nem az OS listajae; ha egy, a bolt
 * altal nem adott termek helyet foglal vagy dob; ha a bolt nem a megadott
 * handle-okkal kerdezett (vagy mas regiot kap); ha a termek neve HTML-kent
 * ertelmezodik; ha az ar es a kod hianyzik; ha a kitalalt igeret (48 ora, a
 * darabszam) jelolo nelkul all, vagy az OS sajat ertekenel is marad.
 */
const termek = (handle: string, over: Record<string, unknown> = {}) => ({
  id: `prod_${handle}`,
  handle,
  title: `Név ${handle}`,
  subtitle: `Leírás ${handle}`,
  thumbnail: null,
  images: [],
  variants: [
    {
      id: `var_${handle}`,
      sku: `K-${handle}`,
      calculated_price: {
        calculated_amount: 18900,
        original_amount: 18900,
        currency_code: "huf",
        calculated_price: { price_list_type: "default" },
      },
    },
  ],
  ...over,
})
const valasz = (products: unknown[]) => ({
  response: { products, count: products.length },
  nextPage: null,
})

describe("az Egyedi korallok sav", () => {
  beforeEach(() => data.listProducts.mockReset())
  afterEach(cleanup)

  const renderel = async (
    handles: string[],
    texts: Record<string, string> | null = null,
  ) =>
    render(
      await EgyediKorallok({
        s: szovegek(texts),
        handles,
        countryCode: "hu",
      }),
    )

  it("nincs jelölt termék: nincs sáv, és a bolt sem kap kérdést", async () => {
    const { container } = await renderel([])
    expect(container.firstChild).toBeNull()
    expect(data.listProducts).not.toHaveBeenCalled()
  })

  it("a bolt egyik terméket sem adja vissza: nincs sáv", async () => {
    data.listProducts.mockResolvedValue(valasz([]))
    const { container } = await renderel(["torolt"])
    expect(container.firstChild).toBeNull()
  })

  it("az OS listájának sorrendjében rajzol, az első a nagy, a hiányzót kihagyja", async () => {
    data.listProducts.mockResolvedValue(
      valasz([termek("b"), termek("c"), termek("a")]),
    )
    await renderel(["a", "nincs", "b", "c"])
    const nevek = screen.getAllByText(/^Név /).map((e) => e.textContent)
    expect(nevek).toEqual(["Név a", "Név b", "Név c"])
    expect(screen.getAllByTestId("korall-nagy")).toHaveLength(1)
    expect(screen.getAllByTestId("korall-kicsi")).toHaveLength(2)
    const hivas = data.listProducts.mock.calls[0]![0]
    expect(hivas.countryCode).toBe("hu")
    expect(hivas.queryParams.handle).toEqual(["a", "nincs", "b", "c"])
  })

  it("egyik bélyegkép sem kap előtöltést vagy magas prioritást: a sáv a kezdőlap hajtása alatt áll (audit T3)", async () => {
    data.listProducts.mockResolvedValue(
      valasz([
        termek("a", { thumbnail: "https://shop.example.test/static/a.jpg" }),
        termek("b", { thumbnail: "https://shop.example.test/static/b.jpg" }),
      ]),
    )
    await renderel(["a", "b"])
    const kepek = Array.from(document.querySelectorAll("img"))
    expect(kepek.length).toBeGreaterThan(0)
    for (const kep of kepek) {
      expect(kep.getAttribute("fetchpriority")).not.toBe("high")
      // `priority` elvenne a lusta betoltest: az elso sem lehet kivetel
      expect(kep.getAttribute("loading")).toBe("lazy")
    }
  })

  it("a kártya a termék oldalára visz, az ár és a kód látszik", async () => {
    data.listProducts.mockResolvedValue(valasz([termek("acropora-x")]))
    await renderel(["acropora-x"])
    const link = screen.getByText("Név acropora-x").closest("a")
    expect(link?.getAttribute("href")).toBe("/hu/termek/acropora-x")
    expect(screen.getByText("K-acropora-x")).toBeTruthy()
    expect(screen.getByTestId("price")).toBeTruthy()
  })

  it("a termék neve sima szöveg, nem HTML", async () => {
    data.listProducts.mockResolvedValue(
      valasz([termek("x", { title: "<img src=x onerror=alert(1)>" })]),
    )
    await renderel(["x"])
    expect(document.querySelector("img[src='x']")).toBeNull()
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy()
  })

  it("minden üzemi állítás jelölt: a bevezető (saját fotózás, kód a talpon), az első lépés (minden lapon), a harmadik (útmutató) is", async () => {
    data.listProducts.mockResolvedValue(valasz([termek("x")]))
    for (const kulcs of [
      "korall.szoveg",
      "korall.1.szoveg",
      "korall.3.szoveg",
      "korall.2.cim",
      "korall.gomb.felirat",
    ]) {
      cleanup()
      // minden más kulcs az OS sajátja: csak ez az egy marad kezdőérték
      const sajat = Object.fromEntries(
        [
          "korall.szoveg",
          "korall.1.cim",
          "korall.1.szoveg",
          "korall.2.cim",
          "korall.2.szoveg",
          "korall.3.cim",
          "korall.3.szoveg",
          "korall.gomb.felirat",
        ]
          .filter((k) => k !== kulcs)
          .map((k) => [k, "Saját."]),
      )
      await renderel(["x"], sajat)
      expect(screen.getAllByTestId("minta-jelzo"), kulcs).toHaveLength(1)
    }
  })

  it("a kitalált ígéret és darabszám jelölt, az OS saját értékénél már nem", async () => {
    data.listProducts.mockResolvedValue(valasz([termek("x")]))
    await renderel(["x"])
    expect(screen.getAllByTestId("minta-jelzo")).toHaveLength(1)
    cleanup()
    await renderel(["x"], {
      "korall.szoveg": "Saját bevezető.",
      "korall.1.cim": "Egy",
      "korall.1.szoveg": "Egy szöveg.",
      "korall.2.cim": "Egy napra félretesszük",
      "korall.2.szoveg": "Addig senki nem veheti meg.",
      "korall.3.cim": "Három",
      "korall.3.szoveg": "Három szöveg.",
      "korall.gomb.felirat": "Minden egyedi korall",
    })
    expect(screen.queryByTestId("minta-jelzo")).toBeNull()
    expect(screen.getByText("Egy napra félretesszük")).toBeTruthy()
  })

  it("a sáv tartalma a 1440 pixeles konténerben áll, a hátterű section nem kap vízszintes kitöltést", async () => {
    data.listProducts.mockResolvedValue(valasz([termek("x")]))
    const { container } = await renderel(["x"])
    const konteiner = container.querySelector('[data-testid="kl-konteiner"]')
    expect(konteiner?.className).toContain("max-w-[1440px]")
    expect(container.querySelector("section")?.className ?? "").not.toMatch(
      /(^|\s)(small:)?px-/,
    )
  })

  it("a handle-lista elfogy: a sorrend-segéd csak a kért handle-öket adja", async () => {
    data.listProducts.mockResolvedValue(valasz([termek("a"), termek("zzz")]))
    const out = await termekekHandleSzerint(["a"], "hu")
    expect(out.map((p) => p.handle)).toEqual(["a"])
  })
})
