import { HttpTypes } from "@medusajs/types"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const setShippingMethod = vi.fn()
const searchFoxpostPickupPoints = vi.fn()

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
}))

import Shipping from "./index"
import { FOXPOST_KERESO_ORIGIN } from "@modules/checkout/components/foxpost-kereso"

afterEach(cleanup)
beforeEach(() => {
  setShippingMethod.mockReset()
  searchFoxpostPickupPoints.mockReset()
})

const mod = (id: string, nev: string) =>
  ({
    id,
    name: nev,
    price_type: "flat",
    amount: 1150,
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
        mod("so-gls", "GLS"),
        mod("so-fox", "Foxpost"),
      ]}
      foxpostOptionId="so-fox"
    />,
  )

const PONT = {
  id: "HU1",
  name: "FOXPOST A-BOX Gödöllő",
  address: "2100 Gödöllő, Fő tér 1.",
  zip: "2100",
  city: "Gödöllő",
}

const valasztottPont = (
  adat: unknown,
  origin = FOXPOST_KERESO_ORIGIN,
  forras?: Window | null,
) => {
  const keret = screen.getByTestId("foxpost-kereso-keret") as HTMLIFrameElement
  window.dispatchEvent(
    new MessageEvent("message", {
      data: typeof adat === "string" ? adat : JSON.stringify(adat),
      origin,
      source: forras === undefined ? keret.contentWindow : forras,
    }),
  )
}

/** A hivatalos kereso uzenete: a foxplus.json alaku pont, JSON szovegkent (mérve). */
const KERESO_PONT = {
  place_id: 680,
  operator_id: "hu53",
  name: "FOXPOST A-BOX Bp. 01. ker. Batthyány téri Vásárcsarnok",
  address: "1011 Budapest, I, 01 Batthyány tér 5.",
  zip: "1011",
  city: "Budapest",
  variant: "FOXPOST A-BOX",
  paymentOptions: ["card", "link"],
  service: ["pick up", "dispatch"],
}

/**
 * A FOXPOST ÁTVÉTELI PONT VÁLASZTÓ (Figma 486:3, 486:191, 486:346).
 * MI PIROSIT: ha a Foxpost kiválasztása pont nélkül beállítja a módot; ha nem
 * a hivatalos kereső nyílik meg elsőként; ha más ablak vagy más forrás
 * üzenete pontot állít; ha a kereső pontja nem jut el a mód adatába; ha a
 * lista-tartalék nem érhető el; ha a "Tovább" a pont előtt is mehet; ha a
 * kosárban álló pont típusa vagy részletei nem látszanak.
 */
describe("a Foxpost átvételi pont választó a szállítási lépésben", () => {
  // a név és a leírás Balázs GLS-promptjának 2. pontja szerint (2026-10-05)
  it("a mód hivatalos néven és logóval áll a listában", () => {
    rajzol()
    expect(screen.getByTestId("foxpost-mod-nev").textContent).toBe("FOXPOST")
    expect(
      screen.getByTestId("foxpost-mod-nev").parentElement?.textContent,
    ).toContain("FOXPOST automata vagy átvételi pont · 1–2 munkanap")
    expect(screen.getAllByTestId("foxpost-logo").length).toBeGreaterThan(0)
  })

  it("a Foxpost kiválasztása a hivatalos keresőt nyitja, és még nem állít módot", () => {
    rajzol()
    expect(screen.queryByTestId("foxpost-kereso")).toBeNull()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    const keret = screen.getByTestId(
      "foxpost-kereso-keret",
    ) as HTMLIFrameElement
    expect(keret.getAttribute("src")).toBe(
      "https://cdn.foxpost.hu/apt-finder/v1/app/",
    )
    expect(screen.queryByTestId("csomagpont-valaszto")).toBeNull()
    expect(setShippingMethod).not.toHaveBeenCalled()
  })

  it("a kereső pontja az azonosítójával kerül a mód adatába", async () => {
    setShippingMethod.mockResolvedValue({ ok: true })
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    await act(async () => valasztottPont(KERESO_PONT))
    expect(setShippingMethod).toHaveBeenCalledWith({
      cartId: "cart-1",
      shippingMethodId: "so-fox",
      data: { foxpost_pickup_point: { id: "hu53", source: "finder" } },
    })
  })

  it("más forrás, más ablak vagy rossz alakú üzenet nem állít pontot", async () => {
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    await act(async () => {
      valasztottPont(KERESO_PONT, "https://evil.example")
      valasztottPont(KERESO_PONT, FOXPOST_KERESO_ORIGIN, window)
      valasztottPont("nem json")
      valasztottPont({ name: "azonosító nélkül" })
    })
    expect(setShippingMethod).not.toHaveBeenCalled()
  })

  it("kérésre a foxplus.json lista jön, a Figma mondataival, és onnan is választható", async () => {
    searchFoxpostPickupPoints.mockResolvedValue({
      elerheto: true,
      pontok: [
        {
          ...PONT,
          variant: "Packeta Z-Pont",
          services: ["pick up"],
          payment_options: ["cash"],
          icon_url: "https://cdn.foxpost.hu/icons/Z-POINT_icon_low.png",
          findme: "A trafik a sarkon van.",
        },
      ],
      talalat: 1,
    })
    setShippingMethod.mockResolvedValue({ ok: true })
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    fireEvent.click(screen.getByTestId("foxpost-kereso-lista"))
    expect(screen.getByTestId("csomagpont-valaszto").textContent).toContain(
      "Keress irányítószámra vagy városra.",
    )
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), {
      target: { value: "Gödöllő" },
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    // a Z-Pont Z-Pontként, a saját ikonjával, és csak azzal, amit tud
    expect(screen.getByTestId("csomagpont-tipus").textContent).toBe(
      "Packeta Z-Pont / átvevőhely",
    )
    expect(screen.getByTestId("csomagpont-ikon").getAttribute("src")).toBe(
      "https://cdn.foxpost.hu/icons/Z-POINT_icon_low.png",
    )
    expect(screen.getByTestId("csomagpont-reszletek").textContent).toBe(
      "Csak csomagátvétel · Fizetés: készpénz",
    )
    expect(screen.getByTestId("csomagpont-findme").textContent).toBe(
      "A trafik a sarkon van.",
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont"))
    })
    expect(setShippingMethod).toHaveBeenCalledWith({
      cartId: "cart-1",
      shippingMethodId: "so-fox",
      data: { foxpost_pickup_point: { id: "HU1", source: "fallback" } },
    })
  })

  it("ha a kereső nem tölt be időben, magától a lista jön", async () => {
    vi.useFakeTimers()
    try {
      rajzol()
      fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
      expect(screen.queryByTestId("csomagpont-valaszto")).toBeNull()
      await act(async () => {
        vi.advanceTimersByTime(15_000)
      })
      expect(screen.getByTestId("csomagpont-valaszto")).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it("a lista hibája és üressége a Figma mondataival szól, hibánál Újra", async () => {
    rajzol()
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    fireEvent.click(screen.getByTestId("foxpost-kereso-lista"))
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), {
      target: { value: "x" },
    })
    searchFoxpostPickupPoints.mockResolvedValueOnce({
      elerheto: false,
      pontok: [],
      talalat: 0,
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    })
    expect(screen.getByTestId("csomagpont-nem-elerheto").textContent).toContain(
      "Nem sikerült betölteni a FOXPOST pontokat.",
    )
    searchFoxpostPickupPoints.mockResolvedValueOnce({
      elerheto: true,
      pontok: [],
      talalat: 0,
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("csomagpont-ujra"))
    })
    await waitFor(() =>
      expect(screen.getByTestId("csomagpont-nincs").textContent).toBe(
        "Nem találtunk átvételi pontot. Próbáld irányítószámmal.",
      ),
    )
  })

  it("a Tovább gomb a pont kiválasztásáig nem mehet, akkor sem, ha más mód áll a kosárban", () => {
    rajzol(kosar([{ id: "sm-1", shipping_option_id: "so-gls", data: {} }]))
    fireEvent.click(screen.getAllByTestId("delivery-option-radio")[1])
    expect(
      (screen.getByTestId("submit-delivery-option-button") as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  it("egy Z-BOX a kosárban Packeta Z-BOX-ként áll, a saját ikonjával (5. és 19. pont)", () => {
    rajzol(
      kosar([
        {
          id: "sm-1",
          shipping_option_id: "so-fox",
          data: {
            foxpost_pickup_point: {
              id: "zbox1",
              name: "Z-BOX Gödöllő Auchan",
              address: "2100 Gödöllő, Kenyérgyári út 1.",
              variant: "FOXPOST Z-BOX",
              icon_url: "https://cdn.foxpost.hu/icons/zbox.png",
              services: ["pick up"],
            },
          },
        },
      ]),
    )
    expect(screen.getByTestId("foxpost-kivalasztott-tipus").textContent).toBe(
      "Packeta Z-BOX",
    )
    expect(
      screen.getByTestId("foxpost-kivalasztott-ikon").getAttribute("src"),
    ).toBe("https://cdn.foxpost.hu/icons/zbox.png")
  })

  it("a kosárban álló pontot típussal és részletekkel mutatja, a Tovább mehet, és másik választható", () => {
    rajzol(
      kosar([
        {
          id: "sm-1",
          shipping_option_id: "so-fox",
          data: {
            foxpost_pickup_point: {
              id: "hu53",
              name: KERESO_PONT.name,
              address: KERESO_PONT.address,
              variant: "FOXPOST A-BOX",
              services: ["pick up", "dispatch"],
              payment_options: ["card", "link"],
            },
          },
        },
      ]),
    )
    const kartya = screen.getByTestId("foxpost-kivalasztott")
    expect(kartya.textContent).toContain(KERESO_PONT.name)
    expect(kartya.textContent).toContain(KERESO_PONT.address)
    expect(screen.getByTestId("foxpost-kivalasztott-tipus").textContent).toBe(
      "FOXPOST automata",
    )
    // a tipus hivatalos ikonja, ha a pont rekordja hordozza (19. pont)
    expect(screen.queryByTestId("foxpost-kivalasztott-ikon")).toBeNull()
    expect(
      screen.getByTestId("foxpost-kivalasztott-reszletek").textContent,
    ).toBe("Csomagfeladás és -átvétel · Fizetés: bankkártya, fizetési link")
    expect(screen.queryByTestId("foxpost-kereso")).toBeNull()
    expect(
      (screen.getByTestId("submit-delivery-option-button") as HTMLButtonElement)
        .disabled,
    ).toBe(false)
    fireEvent.click(screen.getByTestId("foxpost-masik-pont"))
    expect(screen.getByTestId("foxpost-kereso")).toBeTruthy()
  })
})
