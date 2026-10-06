import { describe, expect, it } from "vitest"

import {
  foxpostPontReszletek,
  foxpostPontTipus,
  foxpostSzallitasiAdat,
  foxpostTiltottTetel,
  foxpostTiltvaSzoveg,
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

/**
 * A "FOXPOST LETILTVA" ALLAPOT (7.5; Figma 486:346). MI PIROSIT: ha a donto
 * tetel helyett mast nevezne meg; ha normal kosarnal is szolna; ha csak bolti
 * atvetelnel (ott az atveteli sav beszel) is megjelenne; ha nev nelkul
 * kitalalt szoveget mondana.
 */
describe("foxpostTiltottTetel", () => {
  const tetelek = [
    { id: "l1", product_title: "Red Sea Coral Pro" },
    { id: "l2", product_title: "Acropora tenisz „Miami Vice”" },
  ]

  it("nehezarunal es Foxpost nelkuli tetelnel a donto tetelt nevezi meg", () => {
    expect(
      foxpostTiltottTetel(tetelek, {
        shipping_class: "NO_FOXPOST",
        shipping_class_source: "l2",
      }),
    ).toBe("Acropora tenisz „Miami Vice”")
    expect(
      foxpostTiltottTetel(tetelek, {
        shipping_class: "HEAVY",
        shipping_class_source: "l1",
      }),
    ).toBe("Red Sea Coral Pro")
  })

  it("normal kosarnal, csak bolti atvetelnel, ismeretlen sornal es valasz nelkul hallgat", () => {
    expect(
      foxpostTiltottTetel(tetelek, {
        shipping_class: "NORMAL",
        shipping_class_source: null,
      }),
    ).toBeNull()
    expect(
      foxpostTiltottTetel(tetelek, {
        shipping_class: "PICKUP_ONLY",
        shipping_class_source: "l2",
      }),
    ).toBeNull()
    expect(
      foxpostTiltottTetel(tetelek, {
        shipping_class: "HEAVY",
        shipping_class_source: "nincs",
      }),
    ).toBeNull()
    expect(foxpostTiltottTetel(tetelek, null)).toBeNull()
  })

  it("a Figma mondata", () => {
    expect(foxpostTiltvaSzoveg("Acropora tenisz „Miami Vice”")).toBe(
      "Ez a tétel nem küldhető automatába: Acropora tenisz „Miami Vice”.",
    )
  })
})
