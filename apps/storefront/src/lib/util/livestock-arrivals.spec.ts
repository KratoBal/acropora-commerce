import { describe, expect, it } from "vitest"

import { arrivingAnimalsOf, groupedByKind } from "./livestock-arrivals"

/*
  WHAT TURNS THIS RED (V2.6 S4c, the arriving animals list). A row that is not exactly the contract reaching the page (an
  unknown kind or status, a day that does not exist, a label that is empty or absurdly long, a mistyped field): it names an
  arrival of a living animal, and a wrong line is worse than none. One bad row taking the whole list with it. The order
  not being the expected day first, then the name. A body that is not the contract reading as a list.
*/
const row = (over: Record<string, unknown> = {}) => ({
  id: "la_1",
  kind: "FISH",
  label: "Acanthurus japonicus",
  expected_on: "2026-11-20",
  status: "ORDERED",
  medusa_product_id: null,
  species_key: "acanthurus japonicus",
  species_buyable: false,
  ...over,
})

describe("arrivingAnimalsOf", () => {
  it("reads a row of the contract", () => {
    expect(arrivingAnimalsOf({ livestock_arrivals: [row()] })).toEqual([
      {
        id: "la_1",
        kind: "FISH",
        label: "Acanthurus japonicus",
        expectedOn: "2026-11-20",
        stage: "ordered",
        productId: null,
        speciesKey: "acanthurus japonicus",
        speciesBuyable: false,
      },
    ])
  })

  it("maps IN_TRANSIT, keeps a linked product and a null species key", () => {
    const [a] = arrivingAnimalsOf({
      livestock_arrivals: [
        row({
          status: "IN_TRANSIT",
          medusa_product_id: "prod_1",
          species_key: null,
        }),
      ],
    })
    expect(a).toMatchObject({
      stage: "in_transit",
      productId: "prod_1",
      speciesKey: null,
    })
  })

  it.each([
    ["an unknown kind", { kind: "BIRD" }],
    ["an unknown status", { status: "ARRIVED" }],
    ["a day that does not exist", { expected_on: "2026-02-31" }],
    ["a day in the wrong shape", { expected_on: "20.11.2026" }],
    ["an empty label", { label: "   " }],
    ["a label that is too long", { label: "x".repeat(201) }],
    ["a missing id", { id: "" }],
    ["a non-boolean species_buyable", { species_buyable: "false" }],
    ["a mistyped product id", { medusa_product_id: 7 }],
    ["an empty product id", { medusa_product_id: "" }],
    ["a mistyped species key", { species_key: 3 }],
  ])("drops a row with %s, and keeps the others", (_name, over) => {
    const list = arrivingAnimalsOf({
      livestock_arrivals: [row(), row({ id: "la_2", ...over })],
    })
    expect(list.map((a) => a.id)).toEqual(["la_1"])
  })

  it.each([null, undefined, "x", 5, [], {}, { livestock_arrivals: "x" }])(
    "reads %j as an empty list",
    (body) => {
      expect(arrivingAnimalsOf(body)).toEqual([])
    },
  )

  it("drops a row that is not an object", () => {
    expect(
      arrivingAnimalsOf({ livestock_arrivals: [null, 3, "x", [], row()] }),
    ).toHaveLength(1)
  })

  it("orders by the expected day, then by the name (Hungarian order)", () => {
    const list = arrivingAnimalsOf({
      livestock_arrivals: [
        row({ id: "c", expected_on: "2026-12-01", label: "A" }),
        row({ id: "b", expected_on: "2026-11-20", label: "Zebrasoma" }),
        row({ id: "a", expected_on: "2026-11-20", label: "Ábel" }),
      ],
    })
    expect(list.map((a) => a.id)).toEqual(["a", "b", "c"])
  })

  it("trims the label", () => {
    expect(
      arrivingAnimalsOf({ livestock_arrivals: [row({ label: "  Név  " })] })[0]!
        .label,
    ).toBe("Név")
  })
})

describe("groupedByKind", () => {
  it("groups in the fixed kind order and leaves an empty kind out", () => {
    const list = arrivingAnimalsOf({
      livestock_arrivals: [
        row({ id: "1", kind: "CORAL" }),
        row({ id: "2", kind: "FISH" }),
        row({ id: "3", kind: "CORAL", label: "B" }),
      ],
    })
    const groups = groupedByKind(list)
    expect(groups.map((g) => g.kind)).toEqual(["FISH", "CORAL"])
    expect(groups[1]!.animals.map((a) => a.id)).toEqual(["1", "3"])
  })
})
