import { describe, expect, it } from "vitest"

import { ELO_ALLAT_GYOKEREK } from "@modules/products/components/lap-vaz/vilag-valto"

import {
  modKategoriaUtvonalhoz,
  REEF_GYOKEREK,
  vilagModhoz,
} from "./acropora-mod"

/**
 * A mod-szabaly, Balazs 2026-09-28 18:52 UTC-s dontese szerint: MINDEN korall,
 * hal es gerinctelen Reef, a WYSIWYG-tol fuggetlenul; minden mas Commerce.
 *
 * MI PIROSIT: ha a nem WYSIWYG korall Commerce lesz (a P1a eredeti szabalya,
 * amit a dontes felulirt); ha a gyoker neve mashol is Reef-be vinne; ha az ures
 * utvonal Reef lenne; ha a lista elvalik a termeklap vilag-valtojatol.
 */
describe("modKategoriaUtvonalhoz", () => {
  it("hal es gerinctelen gyoker alatt Reef, barmilyen melyen", () => {
    expect(modKategoriaUtvonalhoz(["Halak"])).toBe("reef")
    expect(modKategoriaUtvonalhoz(["Gerinctelenek", "Garnélák"])).toBe("reef")
  })

  it("a WYSIWYG az utvonal barmely pontjan Reef (a stage-en a Korallok alatt all)", () => {
    expect(modKategoriaUtvonalhoz(["Korallok", "WYSIWYG"])).toBe("reef")
    expect(modKategoriaUtvonalhoz(["Korallok", "WYSIWYG", "SPS"])).toBe("reef")
  })

  it("MINDEN korall Reef, a nem WYSIWYG is (Balazs dontese, 2026-09-28)", () => {
    expect(modKategoriaUtvonalhoz(["Korallok"])).toBe("reef")
    expect(modKategoriaUtvonalhoz(["Korallok", "LPS"])).toBe("reef")
  })

  it("a WYSIWYG mas gyoker alatt is Reef", () => {
    expect(modKategoriaUtvonalhoz(["Termékek", "WYSIWYG"])).toBe("reef")
  })

  /**
   * A KET LISTA EGYUTT MOZOG. A termeklap vilag-valtoja ugyanezt a harom
   * gyokeret veszi sotetnek; ha az egyik bovul vagy szukul, a masik nem
   * maradhat le -- kulonben egy lap mas modban allna, mint a sajat tokenjei.
   */
  it("a Reef gyokerek azonosak a termeklap sotet gyokereivel", () => {
    expect([...REEF_GYOKEREK].sort()).toEqual([...ELO_ALLAT_GYOKEREK].sort())
  })

  it("technika es minden mas Commerce, az ures utvonal is", () => {
    expect(modKategoriaUtvonalhoz(["Termékek", "Világítás"])).toBe("commerce")
    expect(modKategoriaUtvonalhoz([])).toBe("commerce")
    expect(modKategoriaUtvonalhoz([null, "  "])).toBe("commerce")
  })

  it("a nev kis- es nagybetutol, szokoztol fuggetlen", () => {
    expect(modKategoriaUtvonalhoz([" halak "])).toBe("reef")
    expect(modKategoriaUtvonalhoz(["Korallok", "wysiwyg"])).toBe("reef")
  })

  it("a gyoker neve mas helyen nem visz Reef-be", () => {
    expect(modKategoriaUtvonalhoz(["Termékek", "Halak eledele"])).toBe(
      "commerce",
    )
    expect(modKategoriaUtvonalhoz(["Termékek", "Halak"])).toBe("commerce")
  })
})

describe("vilagModhoz", () => {
  it("a mod a meglevo data-vilag kapcsolora kepezodik le", () => {
    expect(vilagModhoz("reef")).toBe("sotet")
    expect(vilagModhoz("commerce")).toBe("vilagos")
  })
})
