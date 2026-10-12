import { describe, expect, it } from "vitest"

import {
  ELES_HOSZTOK,
  elesTiltottUtak,
  robotsHazirend,
} from "./robots-hazirend"

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

/**
 * AZ ELES TILTOTT UTAK (FE-4). AZ ILLESZTO A GOOGLE SZABALYAT KOVETI (barracuda
 * #540 review): a `*` barmilyen karaktersor, a `/`-t is beleertve, a `$` a vege,
 * es a szabaly prefix. Egy szegmensre forditott `*` a sajat ertelmezesunket
 * igazolna, nem a keresoet.
 *
 * MI PIROSITJA: ha a kosar, a penztar, a fiok, a rendeles vagy az API kimarad;
 * ha a kereses tiltott lenne (akkor a noindexet a kereso nem latna); vagy ha egy
 * "cart" kezdetu termek (cartridge) is tiltott lenne -- ezt a regi,
 * csillagos-szegmenses cart-minta tette.
 */
describe("az éles hoszt tiltott útjai", () => {
  const googleIlleszt = (minta: string, ut: string) =>
    new RegExp(
      "^" +
        minta
          .replace(/[.+?^{}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\$$/, "$"),
    ).test(ut)
  const utak = elesTiltottUtak(["hu"])
  const tiltott = (ut: string) => utak.some((m) => googleIlleszt(m, ut))

  it("a privát utak tiltottak, a régió országkódjával", () => {
    for (const ut of [
      "/hu/cart",
      "/hu/checkout?step=address",
      "/hu/account/orders",
      "/hu/order/order_01/confirmed",
      "/hu/rendeles-fizetese/token123",
      "/api/rum",
    ])
      expect(tiltott(ut), ut).toBe(true)
  })

  it("a keresés, a szűrő, a nyilvános lapok és a cart-kezdetű termék nem tiltott", () => {
    for (const ut of [
      "/hu/store?q=hanna",
      "/hu/store?marka=boyu",
      "/hu/termek/hanna-hi780",
      "/hu/termek/cartridge-szurobetet",
      "/hu/termek/accountable-pumpa",
      "/hu/categories/korallok",
      "/hu/marka/aquaforest",
      "/hu",
    ])
      expect(tiltott(ut), ut).toBe(false)
  })

  it("két régió két sort ad, csillag nélkül", () => {
    const ket = elesTiltottUtak(["hu", "at"])
    expect(ket).toContain("/at/cart")
    expect(ket.some((m) => m.includes("*"))).toBe(false)
  })
})
