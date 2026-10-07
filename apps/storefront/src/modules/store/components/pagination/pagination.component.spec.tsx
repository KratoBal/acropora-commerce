import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// a `usePathname` szandekosan a BELSO utat adja: a lapozo nem hasznalhatja
const ut = vi.hoisted(() => ({ ertek: "/hu/_p/2/categories/szivattyuk" }))
vi.mock("next/navigation", () => ({
  usePathname: () => ut.ertek,
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
    render(
      <Pagination
        page={2}
        totalPages={3}
        cel={{ alap: "/hu/categories/szivattyuk", keres: "sortBy=price_asc" }}
      />,
    )
    const linkek = screen.getAllByRole("link")
    expect(linkek.map((a) => a.getAttribute("href"))).toEqual([
      "/hu/categories/szivattyuk?sortBy=price_asc",
      "/hu/categories/szivattyuk?sortBy=price_asc&page=3",
    ])
    expect(screen.queryAllByRole("button")).toEqual([])
  })

  /*
    FE-7 3. resz (barracuda vegleges review): a `_p` lap a belso uton
    renderelodik. MI PIROSIT: a link a `usePathname`-bol epul, es a `/_p/`
    utra mutat, amit kivulrol 404 fogad.
  */
  it("a link a nyilvános alap-útra mutat, akkor is, ha a router a belsőt adja", () => {
    render(
      <Pagination
        page={2}
        totalPages={3}
        cel={{ alap: "/hu/categories/szivattyuk", keres: "" }}
      />,
    )
    const hrefek = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
    expect(hrefek).toEqual([
      "/hu/categories/szivattyuk",
      "/hu/categories/szivattyuk?page=3",
    ])
    expect(hrefek.join(" ")).not.toContain("/_p/")
  })

  it("az aktuális lap nem link, hanem aria-current", () => {
    render(<Pagination page={2} totalPages={3} />)
    const aktualis = screen.getByText("2")
    expect(aktualis.tagName).not.toBe("A")
    expect(aktualis.getAttribute("aria-current")).toBe("page")
  })
})
