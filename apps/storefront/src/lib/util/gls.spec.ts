import { describe, expect, it } from "vitest"

import {
  GLS_LOGO,
  glsInfoSor,
  glsJellemzok,
  glsNyitvatartas,
  glsPontWidgetbol,
  glsTelitettsegAllapot,
  glsTipusFelirat,
  glsTipusLogo,
} from "./gls"

/*
  A GLS TISZTA SZABÁLYAI A PÉNZTÁRBAN. MI PIROSIT: a ParcelShop „automatának”
  látszik vagy fordítva; a nyitvatartás hamis napokat ír, vagy nem vonja össze
  az azonos napokat; olyan jellemző jelenik meg, amit a GLS adat nem állít; az
  üzemen kívüli pont választható; a kereső üzenetéből a név vagy más mező is
  átjön az azonosító mellett.
*/
const egesz = [1, 2, 3, 4, 5, 6, 7].map((day) => ({
  day,
  from: "00:00",
  to: "24:00",
}))

describe("GLS a pénztárban", () => {
  it("a fajta felirata és logója: ParcelShop vagy Automata", () => {
    expect(glsTipusFelirat("parcel-shop")).toBe("GLS ParcelShop")
    expect(glsTipusFelirat("parcel-locker")).toBe("GLS Automata")
    expect(glsTipusLogo("parcel-locker")).toBe(GLS_LOGO.automata)
    expect(glsTipusLogo("parcel-shop")).toBe(GLS_LOGO.csomagpont)
  })

  it("a nyitvatartás: 0–24, vagy az azonos napok összevonva, a zárt nap nélkül", () => {
    expect(glsNyitvatartas(egesz)).toBe("0–24")
    expect(
      glsNyitvatartas([
        ...[1, 2, 3, 4, 5].map((day) => ({ day, from: "08:00", to: "17:30" })),
        { day: 6, from: "09:00", to: "14:30" },
      ]),
    ).toBe("H–P 8–17:30, Szo 9–14:30")
    expect(
      glsNyitvatartas([
        { day: 2, from: "07:00", to: "20:00" },
        { day: 4, from: "07:00", to: "20:00" },
      ]),
    ).toBe("K 7–20, Cs 7–20")
    expect(glsNyitvatartas([])).toBeNull()
    expect(glsNyitvatartas(undefined)).toBeNull()
  })

  it("csak a GLS adat által állított jellemzők", () => {
    expect(
      glsJellemzok({
        features: ["acceptsCard", "acceptsCash", "pickup"],
        has_wheelchair_access: true,
      }),
    ).toEqual(["bankkártya", "készpénz", "akadálymentes"])
    expect(glsJellemzok({ features: ["pickup", "delivery"] })).toEqual([])
  })

  it("az info sor a Figma alakjában", () => {
    expect(
      glsInfoSor({
        type: "parcel-locker",
        hours: egesz,
        features: ["acceptsCard"],
        has_wheelchair_access: true,
      }),
    ).toBe("GLS Automata · 0–24 · bankkártya · akadálymentes")
    expect(glsInfoSor({ type: "parcel-shop" })).toBe("GLS ParcelShop")
  })

  it("a telítettség: az üzemen kívüli nem választható, a magas jelzett, a többi rendes", () => {
    expect(glsTelitettsegAllapot("outOfOrder")).toEqual({
      valaszthato: false,
      figyelmeztetes: "Jelenleg nem választható.",
    })
    expect(glsTelitettsegAllapot("highVolume")).toEqual({
      valaszthato: true,
      figyelmeztetes: "Magas kihasználtság: a kézbesítés hosszabb lehet.",
    })
    expect(glsTelitettsegAllapot("lowVolume")).toEqual({
      valaszthato: true,
      figyelmeztetes: null,
    })
    expect(glsTelitettsegAllapot(null)).toEqual({
      valaszthato: true,
      figyelmeztetes: null,
    })
  })

  it("a kereső üzenetéből csak az azonosító jön át", () => {
    expect(
      glsPontWidgetbol({
        id: " 1011-X ",
        name: "Hamis",
        lockerSaturation: "lowVolume",
      }),
    ).toEqual({ id: "1011-X" })
    expect(glsPontWidgetbol({ id: "" })).toBeNull()
    expect(glsPontWidgetbol({ id: 7 })).toBeNull()
    expect(glsPontWidgetbol("1011-X")).toBeNull()
    expect(glsPontWidgetbol(null)).toBeNull()
  })
})
