import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/categories/termekek",
}))

import CommerceTermekKartya, { keszletSor } from "./termek-kartya"

type Valtozat = {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_quantity?: number | null
  calculated_price?: unknown
}

const ar = (calculated: number, original: number, tipus = "default") => ({
  calculated_amount: calculated,
  original_amount: original,
  currency_code: "huf",
  calculated_price: { price_list_type: tipus },
})

const termek = (valtozatok: Valtozat[], extra: Record<string, unknown> = {}) =>
  ({
    id: "prod_1",
    handle: "radion-xr15",
    title: "Radion XR15 G6 Pro",
    thumbnail: null,
    images: [],
    variants: valtozatok.map((v, i) => ({ id: `v${i}`, ...v })),
    ...extra,
  }) as never

const raktaron = (db: number): Valtozat => ({
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: db,
  calculated_price: ar(230000, 230000),
})

/**
 * A COMMERCE KARTYA (117:213). MI PIROSIT: ha a keszlet sora mast mond, mint a
 * termeklap szabalya; ha a marka kitalalt ertekkel all ott, ahol nincs
 * gyujtemeny; ha az akcio jelolo es a regi ar nem akcios arnal is megjelenik;
 * ha a gomb kosarat iger egy nem kaphato termeknel.
 */
describe("a Commerce termékkártya", () => {
  afterEach(cleanup)

  describe("a készlet sora", () => {
    it("egy változat, fogyó készlet: a darabszámot mondja", () => {
      expect(keszletSor(termek([raktaron(2)]))).toEqual({
        szoveg: "Raktáron – 2 db",
        kaphato: true,
      })
    })

    it("utánrendelhető: rendelhető, szám nélkül", () => {
      const v = { ...raktaron(0), allow_backorder: true }
      expect(keszletSor(termek([v]))).toEqual({
        szoveg: "Rendelhető",
        kaphato: true,
      })
    })

    it("több változatnál nem ad darabszámot", () => {
      expect(keszletSor(termek([raktaron(2), raktaron(5)])).szoveg).toBe(
        "Rendelhető",
      )
    })

    it("nulla készlet, utánrendelés nélkül: nincs raktáron", () => {
      expect(keszletSor(termek([raktaron(0)]))).toEqual({
        szoveg: "Nincs raktáron",
        kaphato: false,
      })
    })
  })

  it("a márka a gyűjteményből jön, és gyűjtemény nélkül nem áll ott", () => {
    const { rerender } = render(
      <CommerceTermekKartya
        product={termek([raktaron(2)], {
          collection: { title: "EcoTech Marine" },
        })}
      />,
    )
    expect(screen.getByTestId("kartya-marka").textContent).toBe(
      "EcoTech Marine",
    )

    rerender(<CommerceTermekKartya product={termek([raktaron(2)])} />)
    expect(screen.queryByTestId("kartya-marka")).toBeNull()
  })

  it("akciós árnál jelölő és áthúzott régi ár, különben egyik sem", () => {
    const akcios = {
      ...raktaron(2),
      calculated_price: ar(200000, 250000, "sale"),
    }
    const { rerender } = render(
      <CommerceTermekKartya product={termek([akcios])} />,
    )
    expect(screen.getByTestId("kartya-akcio").textContent).toBe("-20%")
    expect(screen.getByTestId("kartya-regi-ar").className).toContain(
      "line-through",
    )

    rerender(<CommerceTermekKartya product={termek([raktaron(2)])} />)
    expect(screen.queryByTestId("kartya-akcio")).toBeNull()
    expect(screen.queryByTestId("kartya-regi-ar")).toBeNull()
  })

  it("a kártya a terméklapra visz; a gomb csak kapható terméknél ígér kosarat", () => {
    const { rerender } = render(
      <CommerceTermekKartya product={termek([raktaron(2)])} />,
    )
    const link = screen.getByRole("link")
    expect(link.getAttribute("href")).toBe("/hu/products/radion-xr15")
    expect(link.textContent).toContain("Kosárba")

    rerender(<CommerceTermekKartya product={termek([raktaron(0)])} />)
    expect(screen.getByRole("link").textContent).toContain("Részletek")
    expect(screen.getByRole("link").textContent).not.toContain("Kosárba")
  })
})
