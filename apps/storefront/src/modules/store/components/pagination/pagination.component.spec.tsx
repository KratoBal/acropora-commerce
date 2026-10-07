import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  usePathname: () => "/hu/categories/szivattyuk",
}))

import { Pagination } from "./index"

/**
 * A LAPOZO VALODI LINKEKET AD (SEO frontend FE-1).
 *
 * MI PIROSIT: ha a lapok ujra `onClick`-es gombok lesznek (a kereso nem koveti
 * oket), ha a link elveszti a rendezest, vagy ha az aktualis lap is link.
 */
describe("a lapozó", () => {
  afterEach(cleanup)

  // FE-7 3. resz: a szuro a szervertol jon (`lapozoKeres`), nem `useSearchParams`-bol
  it("minden nem aktuális lap <a href>, a szűrővel együtt", () => {
    render(<Pagination page={2} totalPages={3} keres="sortBy=price_asc" />)
    const linkek = screen.getAllByRole("link")
    expect(linkek.map((a) => a.getAttribute("href"))).toEqual([
      "/hu/categories/szivattyuk?sortBy=price_asc",
      "/hu/categories/szivattyuk?sortBy=price_asc&page=3",
    ])
    expect(screen.queryAllByRole("button")).toEqual([])
  })

  it("az aktuális lap nem link, hanem aria-current", () => {
    render(<Pagination page={2} totalPages={3} />)
    const aktualis = screen.getByText("2")
    expect(aktualis.tagName).not.toBe("A")
    expect(aktualis.getAttribute("aria-current")).toBe("page")
  })
})
