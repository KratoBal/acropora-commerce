import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { en } from "@lib/i18n/dictionary/en"
import { hu } from "@lib/i18n/dictionary/hu"

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
 * A lista 2026-11-03 ota a kozos lista-lapon all (`store-lista-lap.tsx`), a
 * cim pedig a szotarbol jon (`category.allProducts`, magyar es angol). A
 * `StoreListaLap` kiszolgalo-komponens: a renderelt cimet a komponens-teszt
 * (`store-lista-lap.component.spec.tsx`) meri. Ez a FORRAST olvassa, es azt
 * bizonyitja, hogy a lap a szotar kulcsat hasznalja, a szotar pedig mindket
 * nyelven megadja a cimet. Amit nem: hogy a bongeszo ezt rajzolja ki.
 */
describe("a store lap címe", () => {
  const sablonok = join(__dirname, "..", "..", "..", "templates")
  const forras = readFileSync(join(sablonok, "store-lista-lap.tsx"), "utf-8")
  const kod = forras
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")

  /** ISMERT POZITIV KONTROLL: a fajlt tenyleg beolvastuk, es ez a lista-lap. */
  it("a lista-lap forrása olvasható, és a közös keretet rajzolja", () => {
    expect(kod).toContain("<ListaLap")
  })

  /**
   * A MEGJEGYZESEKET KISZEDJUK: enelkul egy magyarazo bekezdes, ami idezi a
   * cimet, kielegitene a sajat allitasat. Ez ma tobbszor is elofordult.
   */
  it("a lap címe a szótár kulcsából áll, nem beírt szövegből", () => {
    expect(kod).toContain('t("category.allProducts")')
    expect(kod).not.toContain("Minden termék")
    expect(kod).not.toContain("All products")
  })

  it("a szótár magyarul és angolul is megadja a címet", () => {
    expect(hu.category.allProducts).toBe("Minden termék")
    expect(en.category.allProducts).toBe("All products")
  })

  it("kereséskor a találati lap áll, egyébként a lista-lap", () => {
    const index = readFileSync(join(sablonok, "index.tsx"), "utf-8")
    expect(index).toContain("<KeresesLap")
    expect(index).toContain("<StoreListaLap")
  })
})
