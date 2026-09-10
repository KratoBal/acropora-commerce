import { describe, expect, it } from "vitest"

import { ELES_HOSZTOK, robotsHazirend } from "./robots-hazirend"

/**
 * A HAROM IRANY, ES A HARMADIK A LENYEG.
 *
 * Az elso ketto (eles -> engedett, teszt -> tiltott) AKKOR IS ATMENNE, ha a fuggveny
 * a listatol fuggetlenul dontene -- peldaul ha a "staging" szot keresne a nevben.
 * Az ISMERETLEN hoszt az, ami megmondja, hogy az ALAPERTELMEZES tenyleg tilt.
 *
 * (acrobot kikotese, 2026-09-10: "Enelkul a ket elso allitas akkor is atmenne, ha a kod
 * mindig allow-t adna a listatol fuggetlenul.")
 */
describe("robots hazirend hosztnev szerint", () => {
  it("az eles hoszt engedett", () => {
    expect(robotsHazirend("shop.acropora.hu").engedett).toBe(true)
  })

  it("a teszt hoszt tiltott", () => {
    expect(robotsHazirend("shop-staging.acropora.hu").engedett).toBe(false)
  })

  /**
   * EZ AZ AZ ALLITAS, AMI AZ ALAPERTELMEZEST MERI. Egy olyan megvalositas, ami
   * mindenkinek `allow`-t ad, az elso ketton fennakadna -- de egy olyan, ami csak a
   * "-staging" utotagot tiltja, NEM. Ez a sor fogja meg azt.
   */
  it("ismeretlen hoszt tiltott -- az alapertelmezes a tiltas", () => {
    expect(robotsHazirend("valami-uj-kornyezet.acropora.hu").engedett).toBe(
      false,
    )
    expect(robotsHazirend("localhost:8000").engedett).toBe(false)
    expect(robotsHazirend("").engedett).toBe(false)
    expect(robotsHazirend(null).engedett).toBe(false)
  })

  /**
   * A HOSZT FEJLEC PORTOT ES NAGYBETUT IS HOZHAT. Normalizalas nelkul egy
   * `SHOP.ACROPORA.HU` vagy egy `shop.acropora.hu:443` alak CSENDBEN a tilto agra
   * esne -- vagyis epp az eles boltot tiltana ki, ami a sulyosabb hiba.
   */
  it("a portot es a kis-nagybetut normalizalja", () => {
    expect(robotsHazirend("SHOP.ACROPORA.HU").engedett).toBe(true)
    expect(robotsHazirend("shop.acropora.hu:443").engedett).toBe(true)
    expect(robotsHazirend("  shop.acropora.hu  ").engedett).toBe(true)
  })

  /**
   * A LISTA MA EGY ELEMU, ES EZ SZANDEK. Ha valaki bovíti, ez a szam valtozik, es a
   * valtozas latszik a diffben -- egy nemaan bovulo lista pontosan az, amit el akarunk
   * kerulni.
   */
  it("az eles lista ma egy elemu", () => {
    expect(ELES_HOSZTOK).toEqual(["shop.acropora.hu"])
  })
})
