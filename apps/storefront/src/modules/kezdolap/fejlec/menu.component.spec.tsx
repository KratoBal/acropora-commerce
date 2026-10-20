import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))

import { KezdolapMenu } from "./menu"
import type { MenuPont } from "./menu-adat"

/**
 * A DESIGN LENYILO MENUJE.
 *
 * MI PIROSIT: ha a panel alapbol lathato; ha a gomb nem jelzi az allapotat
 * (aria-expanded); ha a hover nem nyit es a kimozdulas nem csuk; ha az Escape
 * nem csuk es nem adja vissza a fokuszt; ha egy kulso kattintas nem csuk; ha a
 * lenyilo nelkuli pont gomb lenne (halott gomb) a cimes helyett; ha a kartya
 * hivatkozasa felirat nelkul megjelenik; ha a kategoria-linkek nem a valodi
 * cimre mutatnak.
 */
const PONTOK: MenuPont[] = [
  {
    felirat: "Élőállat",
    href: null,
    oszlopok: [
      {
        cim: "Korallok",
        href: "/categories/korallok",
        linkek: [{ nev: "SPS korallok", href: "/categories/sps" }],
      },
    ],
    kartya: {
      cim: "Jó tudni",
      szoveg: "Szöveg.",
      felirat: "",
      href: null,
      minta: true,
    },
  },
  {
    felirat: "Szolgáltatások",
    href: "/hamarosan/szolgaltatasok",
    oszlopok: [],
    kartya: null,
  },
]

describe("a kezdőlap lenyíló menüje", () => {
  afterEach(cleanup)

  const panel = () => screen.getByTestId("kl-panel-0")
  const nyitva = () =>
    panel().className.includes("visible") &&
    !panel().className.includes("invisible")

  it("alapból zárva, a gomb jelzi az állapotát", () => {
    render(<KezdolapMenu pontok={PONTOK} />)
    expect(nyitva()).toBe(false)
    expect(
      screen.getByTestId("kl-menu-gomb-0").getAttribute("aria-expanded"),
    ).toBe("false")
  })

  it("a kattintás (és az Enter) nyit és zár, a gomb jelzi", () => {
    render(<KezdolapMenu pontok={PONTOK} />)
    const gomb = screen.getByTestId("kl-menu-gomb-0")
    fireEvent.click(gomb)
    expect(nyitva()).toBe(true)
    expect(gomb.getAttribute("aria-expanded")).toBe("true")
    fireEvent.click(gomb)
    expect(nyitva()).toBe(false)
  })

  it("a hover nyit, a kimozdulás csuk", () => {
    const { container } = render(<KezdolapMenu pontok={PONTOK} />)
    fireEvent.mouseEnter(screen.getByTestId("kl-menu-gomb-0").closest("li")!)
    expect(nyitva()).toBe(true)
    fireEvent.mouseLeave(container.firstChild as Element)
    expect(nyitva()).toBe(false)
  })

  it("az Escape csuk és a fókuszt a gombra adja", () => {
    render(<KezdolapMenu pontok={PONTOK} />)
    const gomb = screen.getByTestId("kl-menu-gomb-0")
    fireEvent.click(gomb)
    fireEvent.keyDown(panel(), { key: "Escape" })
    expect(nyitva()).toBe(false)
    expect(document.activeElement).toBe(gomb)
  })

  it("egy kívüli kattintás csuk", () => {
    render(
      <div>
        <KezdolapMenu pontok={PONTOK} />
        <button data-testid="kivul">kívül</button>
      </div>,
    )
    fireEvent.click(screen.getByTestId("kl-menu-gomb-0"))
    expect(nyitva()).toBe(true)
    fireEvent.pointerDown(screen.getByTestId("kivul"))
    expect(nyitva()).toBe(false)
  })

  it("a lenyíló nélküli pont link, nem gomb; a panel linkjei a valódi címre mutatnak", () => {
    render(<KezdolapMenu pontok={PONTOK} />)
    expect(screen.queryByTestId("kl-menu-gomb-1")).toBeNull()
    expect(screen.getByTestId("kl-menu-link-1").getAttribute("href")).toBe(
      "/hu/hamarosan/szolgaltatasok",
    )
    expect(
      screen.getByText("SPS korallok").closest("a")?.getAttribute("href"),
    ).toBe("/hu/categories/sps")
    expect(
      screen.getByText("Korallok").closest("a")?.getAttribute("href"),
    ).toBe("/hu/categories/korallok")
  })

  it("a kártya hivatkozása felirat és cél nélkül nem jelenik meg, a minta-jelölő igen", () => {
    render(<KezdolapMenu pontok={PONTOK} />)
    const kartya = screen.getByTestId("kl-kartya-0")
    expect(kartya.querySelector("a")).toBeNull()
    expect(screen.getByTestId("minta-jelzo")).toBeTruthy()
  })
})
