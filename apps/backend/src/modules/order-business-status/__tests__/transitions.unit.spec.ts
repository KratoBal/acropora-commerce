import { assertBusinessStatusTransition } from "../transitions"
import {
  ORDER_BUSINESS_STATUSES,
  ORDER_BUSINESS_STATUS_LABELS,
  OrderBusinessStatus,
} from "../types"

const admin =
  (from: OrderBusinessStatus | null, to: OrderBusinessStatus) => () =>
    assertBusinessStatusTransition({ from, to, actor: "admin", source: "admin" })

describe("order business-status transitions", () => {
  it("allows a newly created order to enter Feldolgozásra vár", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: null,
        to: "pending_processing",
        actor: "system",
        source: "order_created",
      }),
    ).not.toThrow()
  })

  it("allows the store-pickup path from Készletezés alatt to Átvehető", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: "stocking",
        to: "ready_for_pickup",
        actor: "admin",
        source: "admin",
      }),
    ).not.toThrow()
  })

  it("rejects the forbidden Feldolgozásra vár to Megrendelés lezárva transition", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: "pending_processing",
        to: "closed",
        actor: "admin",
        source: "admin",
      }),
    ).toThrow("pending_processing cannot transition to closed")
  })

  it("allows an admin Kiszállítás to Megrendelés lezárva transition", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: "out_for_delivery",
        to: "closed",
        actor: "admin",
        source: "admin",
      }),
    ).not.toThrow()
  })

  it("allows an admin to reopen Sikertelenül lezárt rendelés into Készletezés alatt", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: "closed_unsuccessfully",
        to: "stocking",
        actor: "admin",
        source: "admin",
      }),
    ).not.toThrow()
  })

  it("rejects a transition away from Megrendelés lezárva", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: "closed",
        to: "stocking",
        actor: "admin",
        source: "admin",
      }),
    ).toThrow("closed cannot transition to stocking")
  })
})

/**
 * THE SEVENTH STATUS, Visszaigazolva (Balázs, 2026-09-03: "Keruljon fel
 * hetedikkent"). It stands between Feldolgozásra vár and Készletezés alatt.
 */
describe("the seventh business status, Visszaigazolva", () => {
  it("lists seven statuses in the shop's order, each with its Hungarian label", () => {
    expect(
      ORDER_BUSINESS_STATUSES.map((s) => ORDER_BUSINESS_STATUS_LABELS[s]),
    ).toEqual([
      "Feldolgozásra vár",
      "Visszaigazolva",
      "Készletezés alatt",
      "Kiszállítás",
      "Átvehető",
      "Megrendelés lezárva",
      "Sikertelenül lezárt rendelés",
    ])
  })

  it("lets an admin confirm an order waiting for processing", () => {
    expect(admin("pending_processing", "confirmed")).not.toThrow()
  })

  it("does not let the carrier confirm an order", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: "pending_processing",
        to: "confirmed",
        actor: "carrier",
        source: "carrier",
      }),
    ).toThrow("carrier cannot transition pending_processing to confirmed")
  })

  it("leads on to Készletezés alatt, or closes unsuccessfully", () => {
    expect(admin("confirmed", "stocking")).not.toThrow()
    expect(admin("confirmed", "closed_unsuccessfully")).not.toThrow()
  })

  it("does not skip stocking from Visszaigazolva", () => {
    expect(admin("confirmed", "out_for_delivery")).toThrow(
      "confirmed cannot transition to out_for_delivery",
    )
    expect(admin("confirmed", "ready_for_pickup")).toThrow(
      "confirmed cannot transition to ready_for_pickup",
    )
    expect(admin("confirmed", "closed")).toThrow(
      "confirmed cannot transition to closed",
    )
  })

  it("is not an entry point for a new order", () => {
    expect(() =>
      assertBusinessStatusTransition({
        from: null,
        to: "confirmed",
        actor: "system",
        source: "order_created",
      }),
    ).toThrow("Only a newly created order may enter Feldolgozásra vár")
  })

  it("is not where a reopened order goes back to", () => {
    expect(admin("closed_unsuccessfully", "confirmed")).toThrow(
      "closed_unsuccessfully cannot transition to confirmed",
    )
  })

  /*
   * THE EXISTING DIRECT STEP STAYS. Whether Visszaigazolva is a mandatory
   * step is not decided; until it is, adding the status must not take an
   * existing transition away.
   */
  it("keeps the existing Feldolgozásra vár to Készletezés alatt step", () => {
    expect(admin("pending_processing", "stocking")).not.toThrow()
  })
})
