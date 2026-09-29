import { pickupSplit } from "../compute-shipping-class"
import { linesForCourierPrice, SPLIT_LINE_IDS_CONTEXT_KEY } from "../split-pricing-context"

/**
 * THE PICKUP SPLIT (P4-2). What must fail: a cart of pickup-only lines alone
 * being split; a mixed cart not split; a line that needs no shipping (the
 * cash-on-delivery fee) moving to the pickup order; the courier price counting
 * the split-off lines.
 */
describe("which lines become the pickup order", () => {
  const normal = { line_item_id: "l1" }
  const elo = { line_item_id: "l2", is_livestock: true }
  const fagyasztott = { line_item_id: "l3", is_frozen: true }
  const csakAtvetel = { line_item_id: "l4", pickup_only: true }

  it("splits every pickup-only line off a mixed cart", () => {
    const result = pickupSplit([normal, elo, fagyasztott, csakAtvetel])
    expect(result.split_line_ids).toEqual(["l2", "l3", "l4"])
    expect(result.rest.map((i) => i.line_item_id)).toEqual(["l1"])
  })

  it("splits nothing when every line is pickup-only, or none is", () => {
    expect(pickupSplit([elo, fagyasztott]).split_line_ids).toEqual([])
    expect(pickupSplit([normal]).split_line_ids).toEqual([])
    expect(pickupSplit([]).split_line_ids).toEqual([])
  })

  it("a line that needs no shipping neither splits nor makes a cart mixed", () => {
    const dij = { line_item_id: "fee", requires_shipping: false }
    expect(pickupSplit([elo, dij]).split_line_ids).toEqual([])
    const dijJelolve = { ...dij, is_livestock: true }
    expect(pickupSplit([normal, dijJelolve]).split_line_ids).toEqual([])
  })
})

describe("the lines a courier price counts", () => {
  const items = [{ id: "l1" }, { id: "l2" }, { id: "l3" }]

  it("leaves out the split-off lines", () => {
    expect(
      linesForCourierPrice(items, { [SPLIT_LINE_IDS_CONTEXT_KEY]: ["l2"] }).map(
        (i) => i.id
      )
    ).toEqual(["l1", "l3"])
  })

  it("counts every line without a split, or with a malformed one", () => {
    expect(linesForCourierPrice(items, {})).toHaveLength(3)
    expect(
      linesForCourierPrice(items, { [SPLIT_LINE_IDS_CONTEXT_KEY]: "l2" })
    ).toHaveLength(3)
  })
})
