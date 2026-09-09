import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { categoryGroups, directCategoryLinks, FejlecMenu } from "./fejlec-menu"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const category = (
  name: string,
  children: { name: string; children?: string[] }[] = [],
) =>
  ({
    id: `category-${name}`,
    name,
    handle: name.toLowerCase(),
    category_children: children.map((child) => ({
      id: `category-${name}-${child.name}`,
      name: child.name,
      handle: child.name.toLowerCase(),
      category_children: (child.children ?? []).map((grandchild) => ({
        id: `category-${name}-${child.name}-${grandchild}`,
        name: grandchild,
        handle: grandchild.toLowerCase(),
      })),
    })),
  }) as never

const categories = [
  category("Termékek", [
    { name: "Világítás", children: ["LED", "T5"] },
    { name: "Szivattyúk", children: ["Visszatérő"] },
  ]),
  category("Korallok", [{ name: "SPS" }, { name: "LPS" }]),
]

const openMenu = () => {
  render(<FejlecMenu kategoriak={categories} />)
  fireEvent.click(screen.getByTestId("category-menu-button"))
}

describe("a teljes képernyős kategóriamenü", () => {
  it("a Menü gomb nyitja és újra bezárja a panelt", () => {
    render(<FejlecMenu kategoriak={categories} />)

    const button = screen.getByTestId("category-menu-button")
    expect(button.getAttribute("aria-expanded")).toBe("false")

    fireEvent.click(button)
    expect(screen.getByTestId("category-menu-panel")).toBeTruthy()
    expect(button.getAttribute("aria-expanded")).toBe("true")

    fireEvent.click(button)
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })

  it("ráálláskor a harmadik oszlop a kiválasztott kategóriára vált", () => {
    openMenu()

    fireEvent.mouseEnter(
      screen.getAllByTestId("category-menu-top-level-item")[1],
    )

    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).toContain("Korallok")
    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).toContain("SPS")
    expect(
      screen
        .getByTestId("category-menu-subcategories")
        .getAttribute("aria-live"),
    ).toBe("polite")
    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).not.toContain("Világítás")
  })

  it("a második oszlop nyilaival is vált a kiválasztás", () => {
    openMenu()

    const first = screen.getAllByTestId("category-menu-top-level-item")[0]
    first.focus()
    fireEvent.keyDown(first, { key: "ArrowDown" })

    expect(document.activeElement).toBe(
      screen.getAllByTestId("category-menu-top-level-item")[1],
    )
    expect(
      screen.getByTestId("category-menu-subcategories").textContent,
    ).toContain("Korallok")
  })

  it("Escape-re és a panelen kívüli kattintásra bezár", () => {
    openMenu()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()

    fireEvent.click(screen.getByTestId("category-menu-button"))
    fireEvent.click(screen.getByTestId("category-menu-backdrop"))
    expect(screen.queryByTestId("category-menu-panel")).toBeNull()
  })

  it("mobilon a kategória koppintása a részletek nézetére vált, a vissza gomb pedig visszalép", () => {
    openMenu()

    fireEvent.click(screen.getAllByTestId("category-menu-top-level-item")[1])
    expect(screen.getByTestId("category-menu-back")).toBeTruthy()

    fireEvent.click(screen.getByTestId("category-menu-back"))
    expect(screen.getByTestId("category-menu-top-level").className).toContain(
      "block",
    )
    expect(
      screen.getByTestId("category-menu-subcategories").className,
    ).toContain("hidden")
  })
})

describe("a kategóriafa harmadik oszlopa", () => {
  it("a tényleges harmadik szintet csoportként, a hiányzó szintet közvetlen linkként kezeli", () => {
    const products = categories[0]

    expect(categoryGroups(products).map((group) => group.name)).toEqual([
      "Világítás",
      "Szivattyúk",
    ])
    expect(directCategoryLinks(categories[1]).map((link) => link.name)).toEqual(
      ["SPS", "LPS"],
    )
  })
})
