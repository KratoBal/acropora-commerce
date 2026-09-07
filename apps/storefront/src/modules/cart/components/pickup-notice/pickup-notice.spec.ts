import { describe, expect, it } from "vitest"

import {
  PICKUP_LEAD,
  PICKUP_REASON,
  PICKUP_TITLE,
  pickupOnlyLines,
} from "./pickup-notice"

describe("mikor csak bolti átvétel van", () => {
  const ELO = {
    title: "Acropora tenuis",
    productMetadata: { unique_piece: "true" },
  }
  const MUSZAKI = { title: "Reef LED 160 Pro", productMetadata: null }

  it("jelző nélküli kosárnál egyetlen tétel sem korlátoz", () => {
    expect(pickupOnlyLines([MUSZAKI, MUSZAKI])).toEqual([])
  })

  /**
   * A NEVEKET ADJA VISSZA, NEM LOGIKAI ERTEKET, es ez a terv kikotese: a vevo
   * lassa, MELYIK tetel miatt. Egy `true` elrejtene pont azt, amit meg kell
   * mutatni.
   */
  it("megnevezi az élő tételt, a műszakit nem", () => {
    expect(pickupOnlyLines([MUSZAKI, ELO])).toEqual(["Acropora tenuis"])
  })

  /**
   * ES A SZABALY AZ EGESZ KOSARRA SZOL: egyetlen elo tetel is eleg. A vegyes
   * kosarat NEM bontjuk ket rendelesre (Balazs szabalya, 2026-08-31).
   */
  it("egyetlen élő tétel is elég a korlátozáshoz", () => {
    expect(pickupOnlyLines([MUSZAKI, MUSZAKI, ELO, MUSZAKI])).toHaveLength(1)
  })
})

describe("az átvételi sáv szövege", () => {
  /**
   * A HANGNEM TENYKOZLES, NEM TILTAS. A vevo nem hibazott, amikor elo allatot
   * tett a kosarba -- egy tilto szo azt uzenne, hogy valamit rosszul csinalt.
   */
  it("nem tiltó szavakkal beszél", () => {
    const egyben = [PICKUP_TITLE, PICKUP_LEAD, PICKUP_REASON].join(" ")
    for (const tilto of ["nem lehet", "tilos", "hiba", "nem választható"]) {
      expect(egyben.toLowerCase()).not.toContain(tilto)
    }
  })

  /**
   * ES AZ INDOK OTT ALL: enelkul a korlatozas onkenyesnek latszik. Ez az
   * ismert pozitiv kontroll a fenti tagado allitas melle -- kulonben egy URES
   * szoveg is atmenne rajta.
   */
  it("megmondja, MIÉRT", () => {
    expect(PICKUP_REASON).toContain("nem adunk fel csomagként")
  })

  it("nincs két kötőjel a vevőnek szánt szövegekben", () => {
    for (const szoveg of [PICKUP_TITLE, PICKUP_LEAD, PICKUP_REASON]) {
      expect(szoveg).not.toContain("--")
    }
  })
})
