import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({ listProducts: vi.fn() }))
vi.mock("@lib/data/products", () => adat)
vi.mock("@lib/data/regions", () => ({
  getRegion: vi.fn(async () => ({ id: "reg_1", currency_code: "huf" })),
}))
vi.mock("@modules/products/components/product-preview", () => ({
  default: ({ product }: { product: { title: string } }) => (
    <span data-testid="kartya">{product.title}</span>
  ),
}))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import type { NemKaphatoTermek } from "@lib/data/nem-kaphato"

import NemKaphatoLap from "./nem-kaphato-lap"

/*
  A NEM KAPHATO TERMEK LAPJA (V4.2; acrobot 42186). MI PIROSIT: ha a gepi
  kategoria+marka jelolt a "helyette" cim ala kerul; ha kezzel megadott kapcsolat
  nelkul hianyzik a "nem talalunk kozvetlen helyettesitot" mondat; ha a kartyak
  sorrendje nem a hatter sorrendje; ha a kategoria-hivatkozas rossz helyre mutat.
*/
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const termek = (id: string) => ({ id, title: `T ${id}` })
const alap: NemKaphatoTermek = {
  termek: {
    id: "prod_regi",
    title: "Régi tápoldat",
    handle: "regi-tapoldat",
    kategoria: { id: "pcat_1", name: "Tápoldatok", handle: "tapoldatok" },
  },
  helyette: ["prod_b", "prod_a"],
  hasonlo: ["prod_c"],
}

async function rajzol(a: NemKaphatoTermek) {
  render(await NemKaphatoLap({ adat: a, countryCode: "hu" }))
}

describe("a nem kaphato lap", () => {
  it("a kezzel megadott helyettesitot es a gepi jeloltet ket kulon szakaszban mutatja", async () => {
    adat.listProducts.mockResolvedValue({
      response: {
        products: [termek("prod_a"), termek("prod_c"), termek("prod_b")],
      },
    })
    await rajzol(alap)

    expect(screen.getByTestId("nem-kaphato-cim")).toHaveTextContent(
      "Ez a termék már nem kapható",
    )
    expect(
      screen.getByText("Régi tápoldat már nem szerepel a kínálatunkban."),
    ).toBeInTheDocument()
    const helyette = screen.getByTestId("nem-kaphato-helyette")
    expect(within(helyette).getByRole("heading")).toHaveTextContent(
      "Ezeket találtuk helyette",
    )
    expect(
      within(helyette)
        .getAllByTestId("kartya")
        .map((k) => k.textContent),
    ).toEqual(["T prod_b", "T prod_a"])
    const hasonlo = screen.getByTestId("nem-kaphato-hasonlo")
    expect(within(hasonlo).getByRole("heading")).toHaveTextContent(
      "Hasonló termékek ugyanabból a kategóriából",
    )
    expect(
      within(hasonlo)
        .getAllByTestId("kartya")
        .map((k) => k.textContent),
    ).toEqual(["T prod_c"])
    expect(screen.queryByTestId("nem-kaphato-nincs")).toBeNull()
    expect(adat.listProducts.mock.calls[0][0].queryParams).toMatchObject({
      id: ["prod_b", "prod_a", "prod_c"],
    })
  })

  it("kezzel megadott kapcsolat nelkul a mondat all, a gepi jelolt kulon marad", async () => {
    adat.listProducts.mockResolvedValue({
      response: { products: [termek("prod_c")] },
    })
    await rajzol({ ...alap, helyette: [] })
    expect(screen.getByTestId("nem-kaphato-nincs")).toHaveTextContent(
      "Most nem találunk közvetlen helyettesítőt.",
    )
    expect(screen.queryByTestId("nem-kaphato-helyette")).toBeNull()
    expect(screen.getByTestId("nem-kaphato-hasonlo")).toBeInTheDocument()
  })

  it("jelolt nelkul csak a mondat, es nem ker termeket", async () => {
    await rajzol({ ...alap, helyette: [], hasonlo: [] })
    expect(screen.getByTestId("nem-kaphato-nincs")).toBeInTheDocument()
    expect(screen.queryByTestId("nem-kaphato-hasonlo")).toBeNull()
    expect(adat.listProducts).not.toHaveBeenCalled()
  })

  it("a kategoriahoz es a keresohoz vezet, kategoria nelkul csak a keresohoz", async () => {
    adat.listProducts.mockResolvedValue({ response: { products: [] } })
    await rajzol(alap)
    expect(screen.getByTestId("nem-kaphato-kategoria")).toHaveAttribute(
      "href",
      "/categories/tapoldatok",
    )
    expect(screen.getByTestId("nem-kaphato-kategoria")).toHaveTextContent(
      "Vissza a kategóriához: Tápoldatok",
    )
    expect(screen.getByTestId("nem-kaphato-kereses")).toHaveAttribute(
      "href",
      "/store",
    )
    cleanup()
    await rajzol({ ...alap, termek: { ...alap.termek, kategoria: null } })
    expect(screen.queryByTestId("nem-kaphato-kategoria")).toBeNull()
  })
})
