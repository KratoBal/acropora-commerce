import { arrivalStep, knownAvailableChanged, knownAvailableOf } from "../arrival"

/*
  WHAT TURNS THIS RED ("Szólj, ha jön hasonló", V2.4, card 0c1265d2). A buyer told about the pieces the sold page
  already listed when they signed up; a piece that came after the sign-up, or the sold piece itself coming back, taken
  as seen; a product sign-up taking its own product as seen; a product that ran out and came back not told again; the
  mail naming an older arrival when a newer one is there.
*/
const SIGNED_UP = "2026-11-09T12:00:00.000Z"
const before = "2026-11-01T00:00:00.000Z"
const after = "2026-11-09T13:00:00.000Z"
const p = (id: string, created_at: string) => ({ id, title: `Acropora tenuis ${id}`, handle: id, created_at })
const row = (over: Record<string, unknown> = {}) => ({
  subject_kind: "species",
  source_product_id: "prod_sold",
  consented_at: new Date(SIGNED_UP),
  known_available: null as unknown,
  ...over,
})

describe("arrivalStep", () => {
  it("SA-ARR-FIRST: the first sweep takes what was buyable at the sign-up as seen, and tells nothing", () => {
    const step = arrivalStep(row(), [p("prod_b", before), p("prod_a", before)])
    expect(step).toEqual({ known_available: ["prod_a", "prod_b"], arrived: null })
  })

  it("SA-ARR-NEW: a piece created after the sign-up is news at the first sweep already", () => {
    const step = arrivalStep(row(), [p("prod_a", before), p("prod_new", after)])
    expect(step.arrived?.id).toBe("prod_new")
    expect(step.known_available).toEqual(["prod_a"])
  })

  it("SA-ARR-SOLD: the sold piece the form stood on is never taken as seen", () => {
    expect(arrivalStep(row(), [p("prod_sold", before)]).arrived?.id).toBe("prod_sold")
  })

  it("SA-ARR-PRODUCT: a product sign-up is told as soon as its product can be bought", () => {
    const step = arrivalStep(row({ subject_kind: "product", source_product_id: "prod_x" }), [p("prod_x", before)])
    expect(step.arrived?.id).toBe("prod_x")
  })

  it("SA-ARR-LATER: on a later sweep, a product outside the seen set is news, one inside it is not", () => {
    const known = ["prod_a"]
    expect(arrivalStep(row({ known_available: known }), [p("prod_a", before)]).arrived).toBeNull()
    // an older product that was not buyable at the first sweep and is now
    expect(arrivalStep(row({ known_available: known }), [p("prod_a", before), p("prod_old", before)]).arrived?.id).toBe(
      "prod_old"
    )
  })

  it("SA-ARR-BACK: a seen product that ran out leaves the set, so its coming back is news", () => {
    const out = arrivalStep(row({ known_available: ["prod_a", "prod_b"] }), [p("prod_b", before)])
    expect(out).toEqual({ known_available: ["prod_b"], arrived: null })
    expect(arrivalStep(row({ known_available: out.known_available }), [p("prod_a", before), p("prod_b", before)]).arrived?.id).toBe(
      "prod_a"
    )
  })

  it("SA-ARR-NEWEST: of two arrivals the mail names the newest piece", () => {
    const step = arrivalStep(row({ known_available: [] }), [p("prod_1", before), p("prod_2", after)])
    expect(step.arrived?.id).toBe("prod_2")
  })

  it("SA-ARR-NOTHING: nothing buyable is no arrival and an empty set", () => {
    expect(arrivalStep(row(), [])).toEqual({ known_available: [], arrived: null })
  })
})

describe("the stored set", () => {
  it("SA-ARR-STORED: an array of ids, or null before the first sweep; a change is a first sweep or a different set", () => {
    expect(knownAvailableOf(null)).toBeNull()
    expect(knownAvailableOf({})).toBeNull()
    expect(knownAvailableOf(["a", 1, "b"])).toEqual(["a", "b"])
    expect(knownAvailableChanged(null, [])).toBe(true)
    expect(knownAvailableChanged(["b", "a"], ["a", "b"])).toBe(false)
    expect(knownAvailableChanged(["a", "b"], ["b"])).toBe(true)
  })
})
