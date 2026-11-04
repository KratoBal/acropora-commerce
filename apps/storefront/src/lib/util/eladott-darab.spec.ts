import { describe, expect, it } from "vitest"

import {
  ELADOTT_LAP_MEZOK,
  fajKulcs,
  kaphatoHasonlok,
  nemElerhetoLapCim,
} from "./eladott-darab"

/*
  A NEM ELERHETO EGYEDI DARAB LAPJA (V2.4, kartya 0c1265d2). MI PIROSIT: ha a faj nem a cim latin binomialisabol jon;
  ha egy nem kaphato (kezelt keszlet, nulla, utanrendeles nelkul) darab a hasonlok koze kerul, vagy maga a termek; ha
  az azonos faj nem all elol; ha a lapcim tullepi a 60 karaktert; ha a mezokeszletbol kimarad a kaphatosaghoz kello
  ket mezo.
*/
const kaphato = {
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: 2,
}
const elfogyott = {
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: 0,
}

describe("eladott egyedi darab", () => {
  it("a fajt a cim latin nevebol veszi, kulonben nincs faj", () => {
    expect(fajKulcs("Acropora abrolhosensis ULTRA")).toBe(
      "acropora abrolhosensis",
    )
    expect(fajKulcs("Acropora divaricata Joe's Mango Garden")).toBe(
      "acropora divaricata",
    )
    expect(fajKulcs("Tropic Marin Pro-Coral")).toBeNull()
    expect(fajKulcs("lehabzó 200")).toBeNull()
    expect(fajKulcs(null)).toBeNull()
  })

  it("csak kaphato darabot ad, a sajatot nem, es elol az azonos faj, utana a nemzetseg", () => {
    const sajat = {
      id: "s",
      title: "Acropora abrolhosensis ULTRA",
      variants: [elfogyott],
    }
    const lista = [
      { id: "s", title: "Acropora abrolhosensis ULTRA", variants: [kaphato] },
      { id: "masik", title: "Montipora capricornis", variants: [kaphato] },
      { id: "nem", title: "Acropora tenuis", variants: [kaphato] },
      { id: "faj", title: "Acropora abrolhosensis kék", variants: [kaphato] },
      {
        id: "elfogyott",
        title: "Acropora abrolhosensis zöld",
        variants: [elfogyott],
      },
    ]
    expect(kaphatoHasonlok(lista, sajat, 12).map((t) => t.id)).toEqual([
      "faj",
      "nem",
      "masik",
    ])
    expect(kaphatoHasonlok(lista, sajat, 2).map((t) => t.id)).toEqual([
      "faj",
      "nem",
    ])
  })

  it("a lapcim jelen ideju, es 60 karakterbe fer", () => {
    expect(
      nemElerhetoLapCim("Acropora abrolhosensis ULTRA", "Nem elérhető: "),
    ).toBe("Nem elérhető: Acropora abrolhosensis ULTRA | Acropora")
    const hosszu = nemElerhetoLapCim("A".repeat(80), "Nem elérhető: ")
    expect(hosszu.length).toBeLessThanOrEqual(60)
    expect(hosszu.endsWith("… | Acropora")).toBe(true)
  })

  it("a mezokeszlet keri a kaphatosaghoz kello ket mezot", () => {
    expect(ELADOTT_LAP_MEZOK).toContain("+variants.manage_inventory")
    expect(ELADOTT_LAP_MEZOK).toContain("+variants.allow_backorder")
    expect(ELADOTT_LAP_MEZOK).toContain("+metadata")
  })
})
