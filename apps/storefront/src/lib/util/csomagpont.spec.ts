import { describe, expect, it } from "vitest"

import {
  foxpostPontReszletek,
  foxpostPontTipus,
  foxpostSzallitasiAdat,
} from "./csomagpont"

/**
 * A FOXPOST PONT TIPUSA A VEVO SZAVAIVAL (Foxpost-prompt 5. pont). MI PIROSIT:
 * ha egy Z-BOX vagy egy Z-Pont FOXPOST automatakent jelenne meg (a Foxpost
 * sajat cimkeje a Z-BOX-ra is "FOXPOST Z-BOX"); ha egy ismeretlen tipus
 * automatava valna; ha a Packeta app fizetes a regi neven allna.
 */
describe("foxpostPontTipus", () => {
  it("a Foxpost harom mert cimkeje (2026-10-05) a prompt szavaira", () => {
    expect(foxpostPontTipus("FOXPOST A-BOX")).toBe("FOXPOST automata")
    expect(foxpostPontTipus("FOXPOST Z-BOX")).toBe("Packeta Z-BOX")
    expect(foxpostPontTipus("Packeta Z-Pont")).toBe(
      "Packeta Z-Pont / átvevőhely",
    )
  })

  it("a prompt rovid alakjai is, kis- es nagybetutol fuggetlenul", () => {
    expect(foxpostPontTipus("FOXPOST")).toBe("FOXPOST automata")
    expect(foxpostPontTipus("Z-BOX")).toBe("Packeta Z-BOX")
    expect(foxpostPontTipus("z-pont")).toBe("Packeta Z-Pont / átvevőhely")
  })

  it("egy Z-BOX soha nem automata, egy ismeretlen tipus a Foxpost szavaival marad", () => {
    expect(foxpostPontTipus("FOXPOST Z-BOX")).not.toContain("automata")
    expect(foxpostPontTipus("Packeta csomagpont")).toBe("Packeta csomagpont")
    expect(foxpostPontTipus("")).toBe("")
    expect(foxpostPontTipus(undefined)).toBe("")
  })
})

describe("foxpostPontReszletek", () => {
  it("a Packeta app fizetes a prompt neven (6. pont)", () => {
    expect(
      foxpostPontReszletek({
        services: ["pick up"],
        payment_options: ["card", "app"],
      }),
    ).toBe("Csak csomagátvétel · Fizetés: bankkártya, Packeta app")
  })
})

describe("foxpostSzallitasiAdat", () => {
  it("csak az azonosito es a valaszto megy, a lista az alapertelmezes", () => {
    expect(foxpostSzallitasiAdat("HU1", "finder")).toEqual({
      foxpost_pickup_point: { id: "HU1", source: "finder" },
    })
    expect(foxpostSzallitasiAdat("HU1")).toEqual({
      foxpost_pickup_point: { id: "HU1", source: "fallback" },
    })
  })
})
