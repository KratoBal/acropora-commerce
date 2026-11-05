import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const hasonlo = vi.fn()
vi.mock("@lib/data/hasonlo-kaphato", () => ({
  hasonloKaphatoTermekek: (...a: unknown[]) => hasonlo(...a),
}))
const torles = vi.fn()
vi.mock("@lib/data/cart", () => ({
  deleteLineItem: (...a: unknown[]) => torles(...a),
}))
vi.mock("@modules/layout/components/kosar-allapot/kosar-esemeny", () => ({
  kosarValtozott: vi.fn(),
}))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

import ElkeltErtesites from "./index"

afterEach(() => {
  cleanup()
  hasonlo.mockReset()
})

/*
  WHAT TURNS THIS RED (V2.5). The sentence missing the piece's name; no similar pieces and no "none" sentence; more than the
  given similar pieces drawn; the "other items kept" line shown for a cart with only the sold piece; ANY sentence about the
  money already paid (it is an open legal question): no refund promise, no word about the hold.
*/
const elkeltek = [
  { title: "WYSIWYG Acropora", handle: "wysiwyg-acropora", lineId: "line_1" },
]
const render_ = async (
  over: { maradtMas?: boolean; countryCode?: string } = {},
) =>
  render(
    await ElkeltErtesites({
      elkeltek,
      countryCode: over.countryCode ?? "hu",
      maradtMas: over.maradtMas ?? false,
    }),
  )

describe("ElkeltErtesites", () => {
  it("names the piece in the human sentence and lists the similar pieces as links", async () => {
    hasonlo.mockResolvedValue([
      { id: "p1", title: "Hasonló A", handle: "hasonlo-a" },
      { id: "p2", title: "Hasonló B", handle: "hasonlo-b" },
    ])
    await render_()
    expect(screen.getByRole("alert").textContent).toContain(
      "Ez a darab közben elkelt",
    )
    expect(screen.getByTestId("cart-sold-text").textContent).toContain(
      "WYSIWYG Acropora",
    )
    const links = screen.getByTestId("cart-sold-similar").querySelectorAll("a")
    expect(Array.from(links).map((a) => a.getAttribute("href"))).toEqual([
      "/termek/hasonlo-a",
      "/termek/hasonlo-b",
    ])
    expect(hasonlo).toHaveBeenCalledWith({ elkeltek, countryCode: "hu" })
  })

  it("says so when there is no similar piece", async () => {
    hasonlo.mockResolvedValue([])
    await render_()
    expect(screen.getByTestId("cart-sold-none").textContent).toContain(
      "Most nincs kapható hasonló darabunk",
    )
    expect(screen.queryByTestId("cart-sold-similar")).toBeNull()
  })

  it("mentions the rest of the cart only when there is one", async () => {
    hasonlo.mockResolvedValue([])
    await render_({ maradtMas: true })
    expect(screen.getByTestId("cart-sold-notice").textContent).toContain(
      "A kosarad többi tétele megmaradt",
    )
    cleanup()
    await render_({ maradtMas: false })
    expect(screen.getByTestId("cart-sold-notice").textContent).not.toContain(
      "többi tétele",
    )
  })

  it("says nothing about money already paid, a refund or a hold", async () => {
    hasonlo.mockResolvedValue([])
    await render_()
    expect(screen.getByTestId("cart-sold-notice").textContent).not.toMatch(
      /visszat[eé]r[ií]t|zárol|kifizet|levon|refund|hold|charged/i,
    )
  })

  it("speaks English on the English storefront", async () => {
    hasonlo.mockResolvedValue([])
    await render_({ countryCode: "en-hu" })
    expect(screen.getByTestId("cart-sold-notice").textContent).toContain(
      "has just been sold",
    )
  })

  it("offers a remove button per sold line that deletes THAT line with the existing action (barracuda, #675)", async () => {
    hasonlo.mockResolvedValue([])
    torles.mockResolvedValue(undefined)
    await render_()
    const gomb = screen.getByTestId("cart-sold-remove-line_1")
    expect(gomb.textContent).toContain("Kiveszem a kosárból")
    fireEvent.click(gomb)
    await waitFor(() => expect(torles).toHaveBeenCalledWith("line_1"))
    expect(torles).toHaveBeenCalledTimes(1)
  })

  it("the remove button is in English on the English storefront", async () => {
    hasonlo.mockResolvedValue([])
    await render_({ countryCode: "en-hu" })
    expect(screen.getByTestId("cart-sold-remove-line_1").textContent).toContain(
      "Remove from my cart",
    )
  })
})
