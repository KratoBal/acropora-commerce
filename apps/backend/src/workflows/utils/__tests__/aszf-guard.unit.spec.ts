import { ASZF_HIANYZIK, guardAszf } from "../aszf-guard"

/**
 * THE ÁSZF NET WHERE THERE IS NO MONEY YET (acrobot 26330). MI PIROSÍT: ha egy
 * rekord nélküli kosár közös PaymentIntentet kapna (stripe-start); ha egy
 * rekord nélküli utánvétes vagy bolti kosár rendelést adna le; ha a kártyás
 * út (ahol a kártya már zárolva lehet) a leadásnál elakadna.
 */
const rekord = { idopont: "2026-10-05T13:30:00.000Z", verzio: "v", dokumentum: "d" }
const kosar = (metadata: Record<string, unknown> | null, sessions: { provider_id: string; status: string }[] = []) => ({
  metadata,
  sessions,
})

describe("the ÁSZF guard", () => {
  it("no record: no card payment starts", () => {
    expect(guardAszf(kosar(null), "start_card_payment")).toEqual({ action: "refuse", message: ASZF_HIANYZIK })
    expect(guardAszf(kosar({ egyeb: 1 }), "start_card_payment").action).toBe("refuse")
  })

  it("no record: a cash on delivery or pay-at-store order is not placed", () => {
    expect(
      guardAszf(kosar(null, [{ provider_id: "pp_acropora_cod", status: "authorized" }]), "place_order")
    ).toEqual({ action: "refuse", message: ASZF_HIANYZIK })
    expect(guardAszf(kosar(null), "place_order").action).toBe("refuse")
  })

  it("the card path is not stopped at placing: the card may already be held, the session still pending", () => {
    expect(
      guardAszf(kosar(null, [{ provider_id: "pp_stripe_stripe", status: "pending" }]), "place_order")
    ).toEqual({ action: "pass" })
  })

  it("with the record everything passes; a malformed record does not count", () => {
    expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "start_card_payment")).toEqual({ action: "pass" })
    expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "place_order")).toEqual({ action: "pass" })
    expect(guardAszf(kosar({ aszf_elfogadas: "igen" }), "start_card_payment").action).toBe("refuse")
  })

  it("an unknown cart is the route's to answer", () => {
    expect(guardAszf(null, "place_order")).toEqual({ action: "pass" })
  })
})
