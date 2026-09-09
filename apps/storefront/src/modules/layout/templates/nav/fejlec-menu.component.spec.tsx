import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FejlecMenu } from "./fejlec-menu"

vi.mock("next/navigation", () => ({ useParams: () => ({ countryCode: "hu" }) }))
afterEach(cleanup)

const root = (
  name: string,
  children: { name: string; children?: string[] }[] = [],
) =>
  ({
    id: name,
    name,
    handle: name.toLowerCase(),
    category_children: children.map((child) => ({
      id: `${name}-${child.name}`,
      name: child.name,
      handle: child.name.toLowerCase(),
      category_children: (child.children ?? []).map((grandchild) => ({
        id: `${name}-${child.name}-${grandchild}`,
        name: grandchild,
        handle: grandchild.toLowerCase(),
      })),
    })),
  }) as never

const categories = [
  root("Termékek", [
    { name: "Világítás", children: ["LED", "T5"] },
    { name: "Szivattyúk" },
  ]),
  root("Halak", [{ name: "Gébek" }]),
  root("Korallok", [{ name: "SPS" }]),
  root("Gerinctelenek", [{ name: "Rákok" }]),
]
const open = () => {
  render(<FejlecMenu kategoriak={categories} />)
  fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
}

describe("a kis lenyíló kategóriamenü", () => {
  it("a rögzített menüpont alatt megjelenik a három hasáb", () => {
    open()
    expect(screen.getByTestId("category-menu-panel").textContent).toContain(
      "Termékek",
    )
    expect(
      screen.getByTestId("category-menu-quick-links").textContent,
    ).toContain("Akciók")
    expect(
      screen.getByTestId("category-menu-editorial-card").textContent,
    ).toContain("Így állítsd")
  })
  it("Escape, az újrakattintott menüpont és a tényleges külső háttér is bezár", () => {
    open()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
    fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
    fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
    fireEvent.click(screen.getByTestId("category-menu-trigger-Termékek"))
    fireEvent.click(screen.getByTestId("category-menu-backdrop"))
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })
  it("a nyíl helyben nyit csempéket és nem navigál, a szöveg saját lapra mutat", () => {
    open()
    expect(screen.getByText("Világítás").getAttribute("href")).toContain(
      "/categories/világítás",
    )
    fireEvent.click(screen.getAllByTestId("category-menu-category-expand")[1])
    expect(screen.getByTestId("category-menu-panel")).toBeTruthy()
    expect(
      screen.getByTestId("category-menu-subcategory-tiles").textContent,
    ).toContain("LED")
  })
  it("a második hasáb nyilaival is bejárható", () => {
    open()
    const first = screen.getAllByTestId("category-menu-category-expand")[0]
    first.focus()
    fireEvent.keyDown(first, { key: "ArrowDown" })
    expect(document.activeElement).toBe(
      screen.getAllByTestId("category-menu-category-expand")[1],
    )
  })
})
