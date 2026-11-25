import { describe, expect, it } from "vitest"

import { fizetesiHelyzet } from "./fizetesi-helyzet"
import { paymentTextKeys, type GuestPaymentKind } from "./guest-order"
import { fizetesiAllapot } from "./rendelesek"

/*
  A KOZOS FIZETESI HELYZET ES A KET LAP OSSZEVETESE (kartya 7bfca4eb, acrobot 60978). MI PIROSIT: a szabaly egyik lapon valtozik,
  a masikon nem (a #891 v2 hibaja ilyen volt); a feloldott zarolas canceled allapota elvesz; a bolti fizetes authorized-ja kartyas
  zarolasnak latszik; a lezart rendelesen zarolas-szo all.
*/
const STATES = [
  null,
  "not_paid",
  "awaiting",
  "authorized",
  "partially_authorized",
  "captured",
  "partially_captured",
  "partially_refunded",
  "refunded",
  "canceled",
  "requires_action",
]
const KINDS: (GuestPaymentKind | null)[] = [
  null,
  "card",
  "card_released",
  "card_link",
  "cod",
  "store",
  "transfer",
]

describe("a fizetesi helyzet", () => {
  it("a fajta es az allapot egyutt donti el", () => {
    expect(fizetesiHelyzet("canceled", "card_released")).toBe("feloldott")
    expect(fizetesiHelyzet("not_paid", "card_released")).toBe("feloldott")
    expect(fizetesiHelyzet("not_paid", "card_link")).toBe("linkre_var")
    expect(fizetesiHelyzet("awaiting", "transfer")).toBe("atutalasra_var")
    expect(fizetesiHelyzet("awaiting", null)).toBe("varakozik")
    expect(fizetesiHelyzet("awaiting", "cod")).toBe("atvetelkor")
    expect(fizetesiHelyzet("authorized", "store")).toBe("boltban")
    expect(fizetesiHelyzet("authorized", "card", "closed")).toBe(
      "lezart_zarolas",
    )
    expect(fizetesiHelyzet("authorized", "card", "stocking")).toBeNull()
    expect(fizetesiHelyzet("canceled", "card")).toBeNull()
    expect(fizetesiHelyzet("captured", "cod")).toBeNull()
    expect(fizetesiHelyzet(null, "cod")).toBeNull()
    // an advance by transfer (2b): its own situation; any other method's partial capture keeps the raw status
    expect(fizetesiHelyzet("partially_captured", "transfer")).toBe(
      "eloleg_beerkezett",
    )
    expect(fizetesiHelyzet("partially_captured", "card")).toBeNull()
  })
})

describe("a vendeg-lap es a fiok ugyanazt mondja", () => {
  const vendeg = (state: string | null, kind: GuestPaymentKind | null) => {
    const text = paymentTextKeys(state, kind)?.text ?? ""
    return text.endsWith("awaitingRelease.text")
      ? "feloldva"
      : text.endsWith("advanceReceived.text")
        ? "eloleg"
        : /\.awaiting(Link)?\.text$/.test(text)
          ? "fizetesre_var"
          : "mas"
  }
  const fiok = (state: string | null, kind: GuestPaymentKind | null) => {
    const szo = fizetesiAllapot(state, undefined, kind)
    return szo === "fizetés az áru megérkezése után"
      ? "feloldva"
      : szo === "előleg beérkezett"
        ? "eloleg"
        : szo === "fizetésre vár"
          ? "fizetesre_var"
          : "mas"
  }

  it("minden allapot x fajta eseten: feloldott ugyanott, es ahol a vendeg-lap fizetesre varast mond, ott a fiok is", () => {
    const elteres: string[] = []
    for (const state of STATES)
      for (const kind of KINDS) {
        const v = vendeg(state, kind)
        const f = fiok(state, kind)
        // the one intended difference: a plain card order waiting (rare: the card holds at checkout) has no guest line, while
        // the account list wants a status word and shows the raw "fizetésre vár"
        const szandekos =
          fizetesiHelyzet(state, kind) === "kartya_var" &&
          v === "mas" &&
          f === "fizetesre_var"
        if (v !== f && !szandekos)
          elteres.push(`${state}/${kind}: vendeg ${v}, fiok ${f}`)
      }
    expect(elteres).toEqual([])
  })
})
