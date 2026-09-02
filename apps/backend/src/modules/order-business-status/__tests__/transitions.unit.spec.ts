import { assertBusinessStatusTransition } from "../transitions"

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
