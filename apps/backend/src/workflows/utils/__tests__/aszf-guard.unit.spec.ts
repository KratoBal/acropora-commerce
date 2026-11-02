import { ASZF_HIANYZIK, guardAszf } from "../aszf-guard"
import { LEGAL_NOT_READY } from "../legal-documents"

/**
 * THE ÁSZF NET WHERE THERE IS NO MONEY YET (acrobot 26330). MI PIROSÍT: ha egy
 * rekord nélküli kosár közös PaymentIntentet kapna (stripe-start); ha egy
 * rekord nélküli utánvétes vagy bolti kosár rendelést adna le; ha a kártyás
 * út (ahol a kártya már zárolva lehet) a leadásnál elakadna.
 */
/** The record logic is tested with the legal documents ready; the gate has its own describe below. */
const READY = { complete: true as const }
const rekord = { idopont: "2026-10-05T13:30:00.000Z", verzio: "v", dokumentum: "d" }
const kosar = (metadata: Record<string, unknown> | null, sessions: { provider_id: string; status: string }[] = []) => ({
  metadata,
  sessions,
})

describe("the ÁSZF guard", () => {
  it("no record: no card payment starts", () => {
    expect(guardAszf(kosar(null), "start_card_payment", READY)).toEqual({ action: "refuse", message: ASZF_HIANYZIK })
    expect(guardAszf(kosar({ egyeb: 1 }), "start_card_payment", READY).action).toBe("refuse")
  })

  it("no record: a cash on delivery or pay-at-store order is not placed", () => {
    expect(
      guardAszf(kosar(null, [{ provider_id: "pp_acropora_cod", status: "authorized" }]), "place_order", READY)
    ).toEqual({ action: "refuse", message: ASZF_HIANYZIK })
    expect(guardAszf(kosar(null), "place_order", READY).action).toBe("refuse")
  })

  it("the card path is not stopped at placing: the card may already be held, the session still pending", () => {
    expect(
      guardAszf(kosar(null, [{ provider_id: "pp_stripe_stripe", status: "pending" }]), "place_order", READY)
    ).toEqual({ action: "pass" })
  })

  it("with the record everything passes; a malformed record does not count", () => {
    expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "start_card_payment", READY)).toEqual({ action: "pass" })
    expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "place_order", READY)).toEqual({ action: "pass" })
    expect(guardAszf(kosar({ aszf_elfogadas: "igen" }), "start_card_payment", READY).action).toBe("refuse")
  })

  it("an unknown cart is the route's to answer", () => {
    expect(guardAszf(null, "place_order", READY)).toEqual({ action: "pass" })
  })

  describe("the legal documents come first (card f6cb0a51)", () => {
    const notReady = { complete: false as const, missing: ["FOGYASZTOBARAT_ID_EN"] }
    const refused = { action: "refuse", message: LEGAL_NOT_READY }

    it("not ready: a cart WITH the record is still refused, at both points", () => {
      expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "start_card_payment", notReady)).toEqual(refused)
      expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "place_order", notReady)).toEqual(refused)
    })

    it("not ready: the card path is refused at placing too, unlike the missing record", () => {
      const card = [{ provider_id: "pp_stripe_stripe", status: "pending" }]
      expect(guardAszf(kosar(null, card), "place_order", notReady)).toEqual(refused)
    })

    it("ready: the record rules as before", () => {
      expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "place_order", READY)).toEqual({ action: "pass" })
      expect(guardAszf(kosar(null), "place_order", READY)).toEqual({ action: "refuse", message: ASZF_HIANYZIK })
    })

    it("an unknown cart is still the route's to answer", () => {
      expect(guardAszf(null, "place_order", notReady)).toEqual({ action: "pass" })
    })

    it("by default it reads the environment: the English source empty means refused", () => {
      const before = { ...process.env }
      try {
        process.env.FOGYASZTOBARAT_ENABLED = "true"
        delete process.env.FOGYASZTOBARAT_ID_EN
        expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "place_order")).toEqual(refused)
        process.env.FOGYASZTOBARAT_ID_EN = "ENSHOP01"
        expect(guardAszf(kosar({ aszf_elfogadas: rekord }), "place_order")).toEqual({ action: "pass" })
      } finally {
        process.env = before
      }
    })
  })
})
