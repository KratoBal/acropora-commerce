import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const allapot = vi.hoisted(() => ({
  utvonal: "/hu/categories/halak/tengeri-halak",
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => allapot.utvonal,
}))

import { FejlecMenu } from "./fejlec-menu"

const gyoker = (id: string, name: string, handle: string) => ({
  tipus: "gyoker" as const,
  felirat: name,
  kategoria: { id, name, handle, category_children: [] } as never,
})
const PONTOK = [
  gyoker("k1", "Korallok", "korallok"),
  gyoker("k2", "Halak", "halak"),
  {
    tipus: "oldal" as const,
    felirat: "Vízkezelés",
    handle: "vízkezelés---termékek",
  },
  { tipus: "hamarosan" as const, felirat: "Tudástár", tema: "tudastar" },
]
const kiemeltek = () =>
  Array.from(
    document.querySelectorAll(
      '[data-testid^="category-menu-trigger-"], [data-testid^="fejlec-menu-link-"]',
    ),
  )
    .filter((e) => e.className.includes("font-semibold"))
    .map((e) => e.textContent)

/**
 * AZ AKTUALIS GYOKER KIEMELESE (P1b): a Figma a hal-listan a "Halak" pontot
 * 600-as sulyban, a cimszinben mutatja (234:29). A kategorialap utvonalanak
 * elso kategoria-szegmense donti el.
 *
 * MI PIROSIT: ha nem az utvonal gyokere, hanem a mely szegmens dont (itt a
 * "tengeri-halak" alkategoria); ha tobb pont is kiemelt.
 */
describe("a fejléc-menü az aktuális gyökeret kiemeli", () => {
  afterEach(cleanup)

  it("a Halak lapon pontosan a Halak pont kiemelt", () => {
    allapot.utvonal = "/hu/categories/halak/tengeri-halak"
    render(<FejlecMenu pontok={PONTOK} />)
    expect(kiemeltek()).toEqual(["Halak"])
  })

  it("az alkategória-oldalon a hozzá tartozó link kiemelt", () => {
    allapot.utvonal = "/hu/categories/v%C3%ADzkezel%C3%A9s---term%C3%A9kek"
    render(<FejlecMenu pontok={PONTOK} />)
    expect(kiemeltek()).toEqual(["Vízkezelés"])
  })

  it("a Hamarosan lapon a témája kiemelt", () => {
    allapot.utvonal = "/hu/hamarosan/tudastar"
    render(<FejlecMenu pontok={PONTOK} />)
    expect(kiemeltek()).toEqual(["Tudástár"])
  })

  it("minden pont viseli a kiemelés kulcsát (data-fejlec-pont)", () => {
    allapot.utvonal = "/hu"
    render(<FejlecMenu pontok={PONTOK} />)
    const kulcsok = Array.from(
      document.querySelectorAll("[data-fejlec-pont]"),
    ).map((e) => e.getAttribute("data-fejlec-pont"))
    expect(kulcsok).toEqual(["korallok", "halak", "vizkezeles", "tudastar"])
  })
})
