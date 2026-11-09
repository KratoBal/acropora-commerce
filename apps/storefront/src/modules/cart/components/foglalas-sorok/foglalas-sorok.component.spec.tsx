import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { foglalasValaszbol } from "@lib/util/kosar-foglalas"

import FoglalasSorok from "."

afterEach(cleanup)

const MOST = new Date("2026-11-09T16:00:00.000Z")
const valasz = foglalasValaszbol({
  on: true,
  pieces: [
    {
      variant_id: "v1",
      unique: true,
      hold: { until: "2026-11-09T16:30:00.000Z", mine: true },
    },
    {
      variant_id: "v2",
      unique: true,
      hold: { until: "2026-11-09T15:50:00.000Z", mine: true },
    },
    {
      variant_id: "v3",
      unique: true,
      hold: { until: "2026-11-09T16:30:00.000Z", mine: false },
    },
    { variant_id: "v4", unique: false, hold: null },
  ],
})
const tetelek = [
  { variant_id: "v1", title: "Acropora A" },
  { variant_id: "v2", title: "Acropora B" },
  { variant_id: "v3", title: "Acropora C" },
  { variant_id: "v4", title: "Sótartó" },
]

/**
 * A KOSAR SAJAT FOGLALASAI (V2.3 S2b). MI PIROSIT: a sajat foglalas vege nem budapesti idoben all;
 * a lejart foglalas meg "tartjuk"-ot mond; mas kosar foglalasa vagy a nem egyedi tetel is sort kap;
 * valasz nelkul barmi kirajzolodik.
 */
describe("a kosár foglalás-sorai", () => {
  it("a saját élő és lejárt foglalás sort kap, a többi nem", () => {
    render(
      <FoglalasSorok
        tetelek={tetelek}
        foglalasok={valasz}
        countryCode="hu"
        most={MOST}
      />,
    )
    expect(
      screen.getAllByTestId("cart-hold-line").map((li) => li.textContent),
    ).toEqual([
      "Acropora A: ezt a darabot 17:30-ig neked tartjuk.",
      "Acropora B: a foglalás lejárt; ha még szabad, a rendeléskor a tiéd.",
    ])
  })

  it("válasz nélkül nincs semmi", () => {
    const { container } = render(
      <FoglalasSorok
        tetelek={tetelek}
        foglalasok={null}
        countryCode="hu"
        most={MOST}
      />,
    )
    expect(container.innerHTML).toBe("")
  })
})
