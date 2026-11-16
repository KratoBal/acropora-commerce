import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

vi.mock("@lib/data/cart", () => ({
  updateLineItem: vi.fn(),
  deleteLineItem: vi.fn(async () => undefined),
}))

import Item from "./index"

afterEach(cleanup)

/*
  A TÉTEL KÉPÉNEK LINKJE NEVET KAP (task t-20261116-penztar-link-nev). A CI akadálymentességi mérése a pénztár cím- és szállítás-lapján
  egy névtelen billentyű-állomást talált: `a#flex.w-full`, a tétel képének linkje (2026-11-16 CI-napló). Egy kép nélküli terméknél a
  Thumbnail díszítő (`alt=""`) helykitöltőt rajzol, és a link neve üres marad. MI PIROSÍT: ha a link neve megint üres egy kép nélküli
  tételnél; ha a név a VÁLTOZAT neve a termék neve helyett (a vevő a terméket keresi); ha a termék neve hiányában nincs tartalék.
*/
function sor(
  over: Partial<{
    product_title: string | null
    title: string | null
    variantTitle: string | null
  }> = {},
): HttpTypes.StoreCartLineItem {
  return {
    id: "item-1",
    quantity: 1,
    product_title:
      "product_title" in over ? over.product_title : "Próba termék",
    title: "title" in over ? over.title : "Kicsi",
    product_handle: "proba-termek",
    thumbnail: null,
    total: 1000,
    original_total: 1000,
    variant: {
      id: "variant-1",
      title: "variantTitle" in over ? over.variantTitle : "Kicsi",
      product: { id: "prod-1", metadata: {}, images: [] },
    },
  } as unknown as HttpTypes.StoreCartLineItem
}

const rajzol = (item: HttpTypes.StoreCartLineItem) =>
  render(
    <table>
      <tbody>
        <Item item={item} type="preview" currencyCode="huf" />
      </tbody>
    </table>,
  )

describe("a tétel képének linkje a kosárban és a pénztár oldalsávjában", () => {
  it("egy kép nélküli tételnél is a termék nevét viseli (a link neve nem üres)", () => {
    rajzol(sor())
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.endsWith("/termek/proba-termek"))!
    expect(link).toBeDefined()
    expect(link).toHaveAccessibleName("Próba termék")
  })

  it("a termék nevét viseli, nem a változatét", () => {
    rajzol(sor({ product_title: "Acropora tenuis", title: "Kicsi" }))
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.endsWith("/termek/proba-termek"))!
    expect(link).toHaveAccessibleName("Acropora tenuis")
    expect(link).not.toHaveAccessibleName("Kicsi")
  })

  it("egy ÜRES termék-név sem hagyja névtelenül a linket: a sor címe a tartalék (barracuda, #788)", () => {
    rajzol(sor({ product_title: "", title: "Tartalék cím" }))
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.endsWith("/termek/proba-termek"))!
    expect(link).toHaveAccessibleName("Tartalék cím")
  })

  it("a termék neve nélkül a sor címe a tartalék", () => {
    rajzol(sor({ product_title: null, title: "Tartalék cím" }))
    const link = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.endsWith("/termek/proba-termek"))!
    expect(link).toHaveAccessibleName("Tartalék cím")
  })
})
