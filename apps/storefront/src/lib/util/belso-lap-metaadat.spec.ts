import { describe, expect, it } from "vitest"

import { lapozottCim, lapozottMetaadat } from "./belso-lap-metaadat"

/*
  A LAPOZOTT LAP METAADATA (FE-7 3. resz). MI PIROSIT: a canonical az 1. lapra
  mutat (a 2. lap masolatnak latszik); az og:url elter a canonicaltol; a cim az
  1. lapeval azonos; vagy kitalalt canonical kerul egy lapra, aminek nem volt.
*/
describe("a lapozott lap metaadata", () => {
  const alap = {
    title: "Szivattyúk | Acropora",
    alternates: { canonical: "/hu/categories/szivattyuk" },
    openGraph: { url: "/hu/categories/szivattyuk", title: "Szivattyúk" },
  }

  it("saját canonical, ugyanaz az og:url, lapszám a címben", () => {
    const m = lapozottMetaadat(alap, "2")
    expect(m.alternates?.canonical).toBe("/hu/categories/szivattyuk?page=2")
    expect((m.openGraph as { url?: string }).url).toBe(
      "/hu/categories/szivattyuk?page=2",
    )
    expect(m.title).toBe("Szivattyúk | Acropora (2. oldal)")
  })

  it("canonical nélkül érintetlen, OG-t sem talál ki", () => {
    expect(lapozottMetaadat({ title: "X" }, "2")).toEqual({ title: "X" })
    expect(
      lapozottMetaadat({ alternates: { canonical: "/hu/a" } }, "3").openGraph,
    ).toBeUndefined()
  })

  it("sablon-címet nem ír át", () => {
    const sablon = { default: "A", template: "%s | B" }
    expect(lapozottCim(sablon, 2)).toBe(sablon)
  })
})
