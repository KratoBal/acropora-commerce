import { HttpTypes } from "@medusajs/types"
import { act, cleanup, render, screen } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const setShippingMethod = vi.fn()
const searchFoxpostPickupPoints = vi.fn()
const searchGlsPickupPoints = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=delivery"),
}))
vi.mock("@lib/data/cart", () => ({
  setShippingMethod: (...args: unknown[]) => setShippingMethod(...args),
}))
vi.mock("@lib/data/fulfillment", () => ({
  calculatePriceForShippingOption: vi.fn(async () => null),
}))
vi.mock("@lib/data/csomagpont", () => ({
  searchFoxpostPickupPoints: (...args: unknown[]) =>
    searchFoxpostPickupPoints(...args),
  searchGlsPickupPoints: (...args: unknown[]) => searchGlsPickupPoints(...args),
}))

import Shipping from "./index"

afterEach(cleanup)
beforeEach(() => {
  setShippingMethod.mockReset()
  searchFoxpostPickupPoints.mockReset()
  searchGlsPickupPoints.mockReset()
})

const mod = (id: string, nev: string) =>
  ({
    id,
    name: nev,
    price_type: "flat",
    amount: 1990,
    insufficient_inventory: false,
    service_zone: { fulfillment_set: { type: "shipping" } },
  }) as unknown as HttpTypes.StoreCartShippingOption

const kosar = (modok: unknown[] = []) =>
  ({
    id: "cart-1",
    email: "proba@example.com",
    shipping_address: { id: "a1", country_code: "hu" },
    billing_address: { id: "a2", country_code: "hu" },
    shipping_methods: modok,
    currency_code: "huf",
  }) as unknown as HttpTypes.StoreCart

const rajzol = (k = kosar()) =>
  render(
    <Shipping
      cart={k}
      availableShippingMethods={[
        mod("so-home", "GLS házhozszállítás"),
        mod("so-gls", "GLS csomagpont"),
        mod("so-gls-heavy", "GLS nehézáru csomagpont"),
        mod("so-fox", "Foxpost csomagpont"),
      ]}
      foxpostOptionId="so-fox"
      glsOptions={[
        { option_id: "so-gls", heavy: false },
        { option_id: "so-gls-heavy", heavy: true },
      ]}
      glsHomeOptions={[{ option_id: "so-home", heavy: false }]}
    />,
  )

const radio = (n: number) => screen.getAllByTestId("delivery-option-radio")[n]
const keresoElem = () => screen.getByTestId("gls-kereso-elem") as HTMLElement

/**
 * A GLS A SZÁLLÍTÁSI LÉPÉSBEN (Balázs GLS-promptja, 2–9. pont; Figma 508:3,
 * 508:231, 508:426). MI PIROSIT:
 * - a GLS csomagpontos mód pont nélkül beállna, vagy a házhozszállítás is
 *   választót nyitna;
 * - a sorok nem a GLS saját nevét, leírását és logóját mutatnák, vagy a
 *   FOXPOST-sor GLS-t (vagy Packetát) kapna;
 * - a hivatalos kereső nem a magyar, telítettség-szűrt alakban nyílna, vagy a
 *   nehézárunak automatát is kínálna;
 * - a keresőből a böngésző adata menne a módra az azonosító helyett;
 * - ha a kereső nem tölt be, hibaüzenet jönne a tartalék lista helyett;
 * - az üzemen kívüli pont választható volna;
 * - a kosárban álló pont nem a fajtája logójával, nyitvatartásával látszana.
 */
describe("a GLS a szállítási lépésben", () => {
  it("a sorok a szolgáltató saját nevével, leírásával és logójával állnak", () => {
    rajzol()
    const sorok = screen.getAllByTestId("delivery-option-radio")
    expect(sorok[0].textContent).toContain("GLS házhozszállítás")
    expect(sorok[0].textContent).toContain(
      "Kézbesítés a megadott címre · 1–2 munkanap",
    )
    expect(sorok[0].querySelector("img")?.getAttribute("src")).toBe(
      "/images/gls.png",
    )
    expect(sorok[1].textContent).toContain(
      "GLS ParcelShop vagy automata · 1–2 munkanap",
    )
    expect(sorok[1].querySelector("img")?.getAttribute("src")).toBe(
      "/images/gls-csomagpont.png",
    )
    // a nehézáru csak ParcelShopba mehet, és a leírás sem ígér automatát
    expect(sorok[2].textContent).toContain("GLS ParcelShop · 1–2 munkanap")
    expect(sorok[2].textContent).not.toContain("automata")
    expect(sorok[3].textContent).toContain(
      "FOXPOST automata vagy átvételi pont · 1–2 munkanap",
    )
    for (const sor of sorok) expect(sor.textContent).not.toMatch(/Packeta/)
  })

  it("a GLS csomagpont a hivatalos keresőt nyitja magyarul, szűrve; a házhozszállítás semmit", () => {
    setShippingMethod.mockResolvedValue({ ok: true })
    rajzol()
    fireEvent.click(radio(0))
    expect(screen.queryByTestId("gls-valaszto")).toBeNull()
    fireEvent.click(radio(1))
    expect(radio(1).className).toContain("border-acr-heritage")
    expect(keresoElem().tagName.toLowerCase()).toBe("gls-dpm")
    expect(keresoElem().getAttribute("country")).toBe("hu")
    expect(keresoElem().getAttribute("language")).toBe("hu")
    expect(keresoElem().getAttribute("filter-saturation")).toBe("1,2")
    expect(keresoElem().getAttribute("filter-type")).toBeNull()
  })

  it("a nehézáru keresője csak ParcelShopot kínál", () => {
    rajzol()
    fireEvent.click(radio(2))
    expect(keresoElem().getAttribute("filter-type")).toBe("parcel-shop")
  })

  it("a keresőből csak az azonosító megy a módra, a forrásával", async () => {
    setShippingMethod.mockResolvedValue({ ok: true })
    rajzol()
    fireEvent.click(radio(1))
    await act(async () => {
      keresoElem().dispatchEvent(
        new CustomEvent("change", {
          detail: {
            id: "1011-ALPHAZOOKF",
            name: "Hamis név",
            lockerSaturation: "lowVolume",
          },
        }),
      )
    })
    expect(setShippingMethod).toHaveBeenCalledWith({
      cartId: "cart-1",
      shippingMethodId: "so-gls",
      data: { gls_pickup_point: { id: "1011-ALPHAZOOKF", source: "finder" } },
    })
  })

  it("ha a kereső nem tölt be, a lista jön magától, hibaüzenet nélkül", async () => {
    vi.useFakeTimers()
    try {
      rajzol()
      fireEvent.click(radio(1))
      expect(screen.queryByTestId("gls-lista")).toBeNull()
      await act(async () => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByTestId("gls-lista")).toBeTruthy()
      expect(screen.queryByTestId("gls-kereso")).toBeNull()
      expect(screen.getByTestId("csomagpont-valaszto").textContent).toContain(
        "Keress irányítószámra vagy városra.",
      )
      expect(screen.getByTestId("csomagpont-valaszto").textContent).not.toMatch(
        /nem sikerült|hiba/i,
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("a listában az üzemen kívüli pont tiltott, a magas kihasználtságú jelzett; a választás a lista forrásával megy", async () => {
    searchGlsPickupPoints.mockResolvedValue({
      elerheto: true,
      pontok: [
        {
          id: "LOCKER-OOO",
          name: "GLS Automata Rossz",
          address: "2100 Gödöllő, Piac 2.",
          zip: "2100",
          city: "Gödöllő",
          variant: "GLS Automata",
          tipus_logo: "/images/gls-automata.png",
          nem_valaszthato: true,
          figyelmeztetes: "Jelenleg nem választható.",
        },
        {
          id: "LOCKER-HIGH",
          name: "GLS Automata Tele",
          address: "2100 Gödöllő, Fő tér 1.",
          zip: "2100",
          city: "Gödöllő",
          variant: "GLS Automata",
          tipus_logo: "/images/gls-automata.png",
          figyelmeztetes: "Magas kihasználtság: a kézbesítés hosszabb lehet.",
        },
      ],
      talalat: 2,
    })
    setShippingMethod.mockResolvedValue({ ok: true })
    rajzol()
    fireEvent.click(radio(1))
    fireEvent.click(screen.getByTestId("gls-lista-nezet"))
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), {
      target: { value: "2100" },
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    expect(searchGlsPickupPoints).toHaveBeenCalledWith("2100", "so-gls")
    const [rossz, tele] = await screen.findAllByTestId("csomagpont")
    expect((rossz as HTMLButtonElement).disabled).toBe(true)
    expect(rossz.textContent).toContain("Jelenleg nem választható.")
    await act(async () => {
      fireEvent.click(rossz)
    })
    expect(setShippingMethod).not.toHaveBeenCalled()
    expect(tele.textContent).toContain(
      "Magas kihasználtság: a kézbesítés hosszabb lehet.",
    )
    expect(tele.querySelector("img")?.getAttribute("src")).toBe(
      "/images/gls-automata.png",
    )
    await act(async () => {
      fireEvent.click(tele)
    })
    expect(setShippingMethod).toHaveBeenCalledWith({
      cartId: "cart-1",
      shippingMethodId: "so-gls",
      data: { gls_pickup_point: { id: "LOCKER-HIGH", source: "fallback" } },
    })
  })

  it("a kosárban álló pont a fajtája logójával, nyitvatartással és jellemzőkkel látszik", () => {
    rajzol(
      kosar([
        {
          id: "sm-1",
          shipping_option_id: "so-gls",
          data: {
            gls_pickup_point: {
              id: "HU1117-ALLEE",
              name: "GLS Automata – Allee",
              address: "1117 Budapest, Október huszonharmadika utca 8–10.",
              type: "parcel-locker",
              hours: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
                day,
                from: "00:00",
                to: "24:00",
              })),
              features: ["acceptsCard", "pickup", "delivery"],
              has_wheelchair_access: true,
            },
          },
        },
      ]),
    )
    const blokk = screen.getByTestId("gls-kivalasztott")
    expect(blokk.textContent).toContain("GLS Automata – Allee")
    expect(blokk.textContent).toContain(
      "1117 Budapest, Október huszonharmadika utca 8–10. · 0–24",
    )
    expect(screen.getByTestId("gls-kivalasztott-info").textContent).toBe(
      "GLS Automata · 0–24 · bankkártya · akadálymentes",
    )
    expect(
      screen.getByTestId("gls-kivalasztott-logo").getAttribute("src"),
    ).toBe("/images/gls-automata.png")
    // „Másik pont választása”: újra a kereső
    fireEvent.click(screen.getByTestId("gls-masik-pont"))
    expect(screen.getByTestId("gls-kereso")).toBeTruthy()
  })

  it("a Foxpost ugyanabban a lépésben a Foxpost keresőjét használja", async () => {
    searchFoxpostPickupPoints.mockResolvedValue({
      elerheto: true,
      pontok: [],
      talalat: 0,
    })
    rajzol()
    fireEvent.click(radio(3))
    // a hivatalos kereső nyílik; a lista-tartalék is a Foxpost listájából keres
    expect(screen.getByTestId("foxpost-kereso")).toBeTruthy()
    fireEvent.click(screen.getByTestId("foxpost-kereso-lista"))
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), {
      target: { value: "Gödöllő" },
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    expect(searchFoxpostPickupPoints).toHaveBeenCalledWith("Gödöllő")
    expect(searchGlsPickupPoints).not.toHaveBeenCalled()
  })
})
