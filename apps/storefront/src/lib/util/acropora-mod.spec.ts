import { describe, expect, it } from "vitest"

import { modKategoriaUtvonalhoz, vilagModhoz } from "./acropora-mod"

/**
 * A P1a mod-szabalya: WYSIWYG, hal es gerinctelen = Reef; minden mas Commerce.
 *
 * MI PIROSIT: ha a nem WYSIWYG korall Reef lesz (a meglevo vilag-valto
 * szabalya, ami a P1a szerint mar nem all); ha a WYSIWYG csak gyokerkent
 * szamitana (a stage-en a Korallok ALATT all); ha az ures utvonal Reef lenne.
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

  it("a nem WYSIWYG korall Commerce (EZ ELTER a meglevo vilag-valtotol)", () => {
    expect(modKategoriaUtvonalhoz(["Korallok"])).toBe("commerce")
    expect(modKategoriaUtvonalhoz(["Korallok", "LPS"])).toBe("commerce")
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
