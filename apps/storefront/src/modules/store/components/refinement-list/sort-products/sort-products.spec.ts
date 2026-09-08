import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { RENDEZES_CIM, sortOptions } from "./index"

/**
 * A LISTA-NEZET VEZERLOI MAGYARUL (64c8452a).
 *
 * === MIERT KONSTANSOKRA ALLIT, ES NEM RENDERELT LAPRA ===
 *
 * A feliratok ADATKENT allnak (`sortOptions`, `RENDEZES_CIM`), tehat itt a
 * valodi ertekek merhetok, nem a forras szovege. Ez erosebb, mint egy
 * forras-kaparas: egy atnevezes vagy egy formazas nem befolyasolja.
 *
 * AMIT NEM MER: hogy a bongeszo tenylegesen ezt rajzolja ki. A bekotest a
 * komponens `title={RENDEZES_CIM}` es `items={sortOptions}` sora adja, es azt
 * a tipusellenorzes tartja -- de egy kesobbi atiras elveheti. Ez a hatar
 * kimondva, nem elfedve.
 */
describe("a rendezés-vezérlő feliratai", () => {
  /** ISMERT POZITIV KONTROLL: a lista tenyleg letezik es nem ures. */
  it("három rendezési lehetőség áll", () => {
    expect(sortOptions).toHaveLength(3)
    expect(sortOptions.map((o) => o.value)).toEqual([
      "created_at",
      "price_asc",
      "price_desc",
    ])
  })

  /**
   * A HIANY-ALLITAS ONMAGABAN GYENGE (egy ures lista is kielegitene), ezert a
   * fenti kontroll all mellette, es alatta a POZITIV allitas a magyar
   * feliratokra.
   */
  it("egyetlen felirat sem maradt angolul", () => {
    const feliratok = [RENDEZES_CIM, ...sortOptions.map((o) => o.label)]

    for (const angol of [
      "Sort by",
      "Latest Arrivals",
      "Price",
      "Low",
      "High",
    ]) {
      expect(feliratok.join(" | ")).not.toContain(angol)
    }
  })

  it("a feliratok magyarul, ékezettel állnak", () => {
    expect(RENDEZES_CIM).toBe("Rendezés")
    expect(sortOptions.map((o) => o.label)).toEqual([
      "Legújabbak",
      "Ár szerint növekvő",
      "Ár szerint csökkenő",
    ])
  })

  /**
   * A NYIL ELTUNT, ES EZ NEM STILUS: a magyar alak az IRANYT nevezi meg, tehat
   * nincs mit nyillal jelolni. Egy "Ár: alacsony -> magas" a szo szerinti
   * forditas lenne.
   */
  it("nincs nyíl a feliratokban", () => {
    for (const o of sortOptions) {
      expect(o.label).not.toContain("->")
    }
  })
})

/**
 * A STORE LAP CIME -- ES A HATARA, KIMONDVA.
 *
 * A `StoreTemplate` kiszolgalo-komponens, jsdomban nem renderelheto, ezert ez
 * a FORRAST olvassa, ugyanabban az alakban, mint a muszaki lap sablonjanal.
 * Amit bizonyit: a cim magyar es nincs benne az angol alak. Amit nem: hogy a
 * bongeszo ezt rajzolja ki.
 */
describe("a store lap címe", () => {
  const forras = readFileSync(
    join(__dirname, "..", "..", "..", "templates", "index.tsx"),
    "utf-8",
  )

  /** ISMERT POZITIV KONTROLL: a fajlt tenyleg beolvastuk, es ez a sablon. */
  it("a sablon forrása olvasható, és tartalmazza a cím elemét", () => {
    expect(forras).toContain('data-testid="store-page-title"')
  })

  it("a lap címe magyarul áll", () => {
    expect(forras).toContain(">Minden termék<")
    expect(forras).not.toContain(">All products<")
  })
})
