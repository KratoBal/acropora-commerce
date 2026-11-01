import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/categories/korallok",
}))

import { translator } from "@lib/i18n/dictionary"

import EloAllatKartya from "./elo-allat-kartya"

type Valtozat = {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_quantity?: number | null
  calculated_price?: unknown
}

const ar = (calculated: number) => ({
  calculated_amount: calculated,
  original_amount: calculated,
  currency_code: "huf",
  calculated_price: { price_list_type: "default" },
})

const termek = (
  valtozatok: Valtozat[],
  metadata: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) =>
  ({
    id: "prod_1",
    handle: "acropora-austera",
    title: "Acropora austera",
    subtitle: "Zöld ágas",
    thumbnail: null,
    images: [],
    metadata,
    variants: valtozatok.map((v, i) => ({ id: `v${i}`, ...v })),
    ...extra,
  }) as never

const kezelt = (db: number): Valtozat => ({
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: db,
  calculated_price: ar(45000),
})

const jelveny = () => screen.queryByTestId("kartya-jelveny")?.textContent

/**
 * AZ ELO ALLAT KARTYAJA. MI PIROSIT: ha az egyedi peldany jelvenye elmarad; ha
 * az elkelt peldany tovabbra is "Reszletek" gombot kap, vagy nincs
 * athuzva az ara; ha ket darabnal nem all a "2 db"; ha a felirat az angol
 * oldalon magyar marad (a jelveny, a gomb); ha a latin nev nem jelenik meg.
 */
describe("az élőállat-kártya", () => {
  afterEach(cleanup)

  it("kapható egyedi példány: jelvény és Részletek, a latin név dőlten", () => {
    render(
      <EloAllatKartya product={termek([kezelt(1)], { unique_piece: true })} />,
    )
    expect(jelveny()).toBe("1 db · Egyedi példány")
    expect(screen.getByTestId("kartya-reszletek").textContent).toBe("Részletek")
    expect(screen.getByTestId("kartya-ar").className).not.toContain(
      "line-through",
    )
    expect(screen.getByText("Zöld ágas").className).toContain("italic")
    expect(
      screen.getByTestId("category-product-card-livestock").className,
    ).toContain("border-acr-line")
  })

  it("elkelt egyedi példány: Elkelt jelvény, Hasonlót keresek, áthúzott ár", () => {
    render(
      <EloAllatKartya product={termek([kezelt(0)], { unique_piece: true })} />,
    )
    expect(jelveny()).toBe("Elkelt")
    expect(screen.getByTestId("kartya-reszletek").textContent).toBe(
      "Hasonlót keresek",
    )
    expect(screen.getByTestId("kartya-ar").className).toContain("line-through")
  })

  it("ugyanaz a nulla készlet egyedi jelző nélkül NEM elkelt", () => {
    render(<EloAllatKartya product={termek([kezelt(0)])} />)
    expect(jelveny()).toBeUndefined()
    expect(screen.getByTestId("kartya-reszletek").textContent).toBe("Részletek")
  })

  it("pontosan két darabnál a darabszám jelvény áll", () => {
    render(<EloAllatKartya product={termek([kezelt(2)])} />)
    expect(jelveny()).toBe("2 db")
  })

  it("három darabnál és jelző nélkül nincs jelvény", () => {
    render(<EloAllatKartya product={termek([kezelt(3)])} />)
    expect(jelveny()).toBeUndefined()
  })

  it("az angol fordítóval a jelvény és a gomb angol", () => {
    const t = translator("en")
    const { unmount } = render(
      <EloAllatKartya
        product={termek([kezelt(1)], { unique_piece: true })}
        t={t}
      />,
    )
    expect(jelveny()).toBe("1 pc · Unique piece")
    expect(screen.getByTestId("kartya-reszletek").textContent).toBe("Details")
    unmount()

    render(
      <EloAllatKartya
        product={termek([kezelt(0)], { unique_piece: true })}
        t={t}
      />,
    )
    expect(jelveny()).toBe("Sold")
    expect(screen.getByTestId("kartya-reszletek").textContent).toBe(
      "Find a similar one",
    )
  })

  it("a termék oldalára visz mindkét linkkel", () => {
    render(<EloAllatKartya product={termek([kezelt(1)])} />)
    const linkek = screen.getAllByRole("link")
    expect(linkek.length).toBeGreaterThanOrEqual(2)
    for (const link of linkek)
      expect(link.getAttribute("href")).toBe("/hu/termek/acropora-austera")
  })
})
