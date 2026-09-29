import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/categories/halak/tengeri-halak",
}))

import { FejlecMenu } from "./fejlec-menu"

const gyoker = (id: string, name: string, handle: string) =>
  ({ id, name, handle, category_children: [] }) as never

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
    render(
      <FejlecMenu
        kategoriak={[
          gyoker("k1", "Korallok", "korallok"),
          gyoker("k2", "Halak", "halak"),
          gyoker("k3", "Termékek", "termekek"),
        ]}
      />,
    )
    const kiemelt = ["Korallok", "Halak", "Termékek"].filter((nev) =>
      screen
        .getByTestId(`category-menu-trigger-${nev}`)
        .className.includes("font-semibold"),
    )
    expect(kiemelt).toEqual(["Halak"])
  })
})
