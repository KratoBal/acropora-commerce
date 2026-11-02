import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ASZF_VERZIO_TESZT_MOD,
  ELO_KIRAKAT_HOSZTOK,
  JOGI_TESZT_SZOVEG,
  jogiKapuTesztMod,
} from "./jogi-kapu"

const TESZT = "https://shop-staging.acropora.hu"

/**
 * MI PIROSIT: ha hianyzo vagy elgepelt ertek bekapcsolna a teszt-modot; ha az
 * eles cimen (barmelyik irasmodjan) bekapcsolhato; ha a cim hianya vagy
 * olvashatatlansaga nem zarna le; ha a hatter hosztlistaja vagy verzioja mas.
 */
describe("a kirakat jogi kapuja", () => {
  // Az `undefined` argumentum a paraméter ALAPÉRTÉKÉT hívja (a környezetet), ezért a
  // „hiányzó” eseteket a környezet kiürítésével mérjük, nem `undefined` átadásával:
  // a CI-n a NEXT_PUBLIC_BASE_URL be van állítva, és a spec ettől függetlenül kell,
  // hogy mérjen (2026-11-02, a #622 CI-je ezen bukott).
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_LEGAL_GATE_MODE", "")
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "")
  })
  afterEach(() => vi.unstubAllEnvs())

  it("hianyzo, ures vagy elgepelt ertek: enforce", () => {
    for (const ertek of [
      undefined,
      "",
      " ",
      "enforce",
      "Test",
      "TEST",
      "teszt",
      "off",
    ])
      expect(jogiKapuTesztMod(ertek, TESZT)).toBe(false)
  })

  it("a pontos `test` teszt cimen teszt-mod", () => {
    expect(jogiKapuTesztMod("test", TESZT)).toBe(true)
    expect(jogiKapuTesztMod(" test ", TESZT)).toBe(true)
  })

  it("az eles cimen sosem teszt-mod, akarhogy irjak", () => {
    for (const cim of [
      "https://shop.acropora.hu",
      "https://shop.acropora.hu/",
      "https://SHOP.acropora.hu:443/hu",
      "https://www.shop.acropora.hu",
      "https://acropora.hu",
      "http://www.acropora.hu/",
    ])
      expect(jogiKapuTesztMod("test", cim)).toBe(false)
  })

  it("olvashatatlan vagy hianyzo cimnel nem bizonyithato, hogy nem eles: enforce", () => {
    for (const cim of ["", "   ", "nem cim", "shop.acropora.hu"])
      expect(jogiKapuTesztMod("test", cim)).toBe(false)
    // maga a változó hiányzik a környezetből
    vi.stubEnv("NEXT_PUBLIC_LEGAL_GATE_MODE", "test")
    expect(jogiKapuTesztMod()).toBe(false)
  })

  it("a mondat nem tartalmaz sajat jogi szoveget, csak a forrast nevezi meg", () => {
    expect(JOGI_TESZT_SZOVEG).toBe(
      "Teszt kirakat: a jogi dokumentumok az átálláskor a Fogyasztóbarátból jönnek.",
    )
  })

  it("a hatter hosztlistaja es teszt-verzioja egyezik a kirakatéval", () => {
    const hatter = readFileSync(
      resolve(
        __dirname,
        "../../../../backend/src/workflows/utils/legal-documents.ts",
      ),
      "utf8",
    )
    for (const host of ELO_KIRAKAT_HOSZTOK)
      expect(hatter).toContain(`"${host}"`)
    expect(hatter).toContain(
      `LEGAL_TEST_MODE_VERSION = "${ASZF_VERZIO_TESZT_MOD}"`,
    )
  })
})
