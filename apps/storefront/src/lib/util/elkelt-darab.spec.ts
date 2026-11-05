import { describe, expect, it } from "vitest"

import {
  ELKELT_KOD,
  elkeltATetelek,
  elkeltDarabokAzUzenetbol,
  elkeltKezelok,
  elkeltParam,
  hasonloKaphato,
} from "./elkelt-darab"

/**
 * A KOZBEN ELKELT EGYEDI DARAB (V2.5). MI PIROSIT: ha egy rossz alaku uzenetbol ertesites lesz; ha a kereso-parameterbol olyan
 * kezelo kerul az oldalra, ami nincs a kosarban; ha az elkelt darab a sajat hasonlojai kozott szerepel; ha egy nem kaphato darab
 * hasonlokent jelenik meg; ha a kod vagy a lista hossza kontroll nelkul megy tovabb.
 */
describe("elkeltDarabokAzUzenetbol", () => {
  const uzenet = `${ELKELT_KOD}:[{"title":"WYSIWYG Acropora","handle":"wysiwyg-acropora"}]`
  it("reads the lines after the code, wherever the code stands in the message", () => {
    expect(elkeltDarabokAzUzenetbol(uzenet)).toEqual([
      { title: "WYSIWYG Acropora", handle: "wysiwyg-acropora" },
    ])
    expect(elkeltDarabokAzUzenetbol(`Error: ${uzenet}`)).toHaveLength(1)
  })
  it("is null for another error, a broken JSON, an empty or a wrong-shaped list, a bad handle", () => {
    for (const rossz of [
      "A rendelést nem tudtuk leadni.",
      `${ELKELT_KOD}:[{nem json`,
      `${ELKELT_KOD}:[]`,
      `${ELKELT_KOD}:{"title":"x","handle":"y"}`,
      `${ELKELT_KOD}:[{"title":5,"handle":"y"}]`,
      `${ELKELT_KOD}:[{"title":"x","handle":"../etc"}]`,
      `${ELKELT_KOD}:[{"title":"x","handle":""}]`,
    ])
      expect(elkeltDarabokAzUzenetbol(rossz)).toBeNull()
  })
  it("keeps at most five lines", () => {
    const sok = Array.from({ length: 8 }, (_, i) => ({
      title: `T${i}`,
      handle: `h${i}`,
    }))
    expect(
      elkeltDarabokAzUzenetbol(`${ELKELT_KOD}:${JSON.stringify(sok)}`),
    ).toHaveLength(5)
  })
})

describe("the search parameter", () => {
  it("round-trips the handles, valid ones only, no duplicates, at most five", () => {
    expect(
      elkeltParam([
        { title: "A", handle: "a" },
        { title: "B", handle: "b" },
      ]),
    ).toBe("a,b")
    expect(elkeltKezelok("a,b,a, c ,")).toEqual(["a", "b", "c"])
    expect(elkeltKezelok(["x", "y"])).toEqual(["x"])
    expect(elkeltKezelok("a/b,<script>,ok-1")).toEqual(["ok-1"])
    expect(elkeltKezelok(undefined)).toEqual([])
    expect(elkeltKezelok("1,2,3,4,5,6,7")).toHaveLength(5)
  })
})

describe("elkeltATetelek", () => {
  const tetelek = [
    {
      id: "line_1",
      title: "WYSIWYG Acropora",
      product_handle: "wysiwyg-acropora",
    },
    { id: "line_2", title: "Pumpa", product_handle: "pumpa" },
  ]
  it("keeps only the handles that are really lines of the cart, with the cart's own title and the line id", () => {
    expect(
      elkeltATetelek(["wysiwyg-acropora", "nincs-a-kosarban"], tetelek),
    ).toEqual([
      {
        title: "WYSIWYG Acropora",
        handle: "wysiwyg-acropora",
        lineId: "line_1",
      },
    ])
    expect(elkeltATetelek(["x"], undefined)).toEqual([])
    expect(elkeltATetelek([], tetelek)).toEqual([])
  })
  it("a line without an id is not offered (there would be nothing to remove)", () => {
    expect(
      elkeltATetelek(["pumpa"], [{ title: "Pumpa", product_handle: "pumpa" }]),
    ).toEqual([])
  })
})

describe("hasonloKaphato", () => {
  const termek = (handle: string, keszlet: number) => ({
    handle,
    variants: [
      {
        manage_inventory: true,
        allow_backorder: false,
        inventory_quantity: keszlet,
      },
    ],
  })
  it("gives at most three purchasable pieces, never the sold one, never one out of stock", () => {
    const lista = [
      termek("elkelt", 1),
      termek("a", 1),
      termek("b", 0),
      termek("c", 2),
      termek("d", 1),
      termek("e", 3),
    ]
    expect(hasonloKaphato(lista, ["elkelt"]).map((t) => t.handle)).toEqual([
      "a",
      "c",
      "d",
    ])
    expect(hasonloKaphato([termek("b", 0)], [])).toEqual([])
    expect(hasonloKaphato([{ handle: null, variants: [] }], [])).toEqual([])
  })
})
