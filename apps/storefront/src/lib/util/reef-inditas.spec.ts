import { describe, expect, it } from "vitest"

import {
  kaphatoReefTermekek,
  REEF_ALCIM,
  REEF_BEVEZETO,
  REEF_CIM,
  REEF_LEPESEK,
  REEF_ZARSZO,
  reefKezelok,
} from "./reef-inditas"

/**
 * "INDITSD EL A KOROLLOS AKVARIUMODAT" (V4.4). MI PIROSIT: egy nyitott jeloles (EL, KITOLTENDO) vagy egy meg nem letezo
 * oldalra mutato hivatkozas (V4.3 tunet-oldalak) az oldal szovegeben; egy kihagyott lepes; ket kezelo ugyanarra a termekre;
 * egy nem megveheto termek a megjeleno listaban; gondolatjel a szovegben.
 */
const minden = (): string[] => [
  REEF_CIM,
  REEF_ALCIM,
  REEF_BEVEZETO,
  REEF_ZARSZO,
  ...REEF_LEPESEK.flatMap((l) => [
    l.cim,
    l.tovabblepes,
    l.kategoriak ?? "",
    ...l.bekezdesek.flat(),
    ...(l.csoportok ?? []).flatMap((c) => [c.cim, c.megjegyzes ?? ""]),
  ]),
]

describe("a szoveg", () => {
  it("RE-LEPESEK: hat lepes, sorban 1-6, mindegyiknek van cime, tovabblepesi feltetele es bekezdese", () => {
    expect(REEF_LEPESEK.map((l) => l.szam)).toEqual([1, 2, 3, 4, 5, 6])
    for (const lepes of REEF_LEPESEK) {
      expect(lepes.cim.trim()).not.toBe("")
      expect(lepes.tovabblepes.trim()).not.toBe("")
      expect(lepes.bekezdesek.length).toBeGreaterThan(0)
    }
  })

  it("RE-NYITOTT: nyitott jeloles vagy meg nem letezo oldalra mutato hivatkozas nincs a szovegben", () => {
    const szoveg = minden().join("\n")
    for (const tiltott of [
      "KITÖLTENDŐ",
      "[EL",
      "EL:",
      "V4.3",
      "tünet-oldal",
      "Probléma alapú",
      "oldalt nem kapott",
    ]) {
      expect(szoveg, tiltott).not.toContain(tiltott)
    }
  })

  it("RE-GONDOLATJEL: nincs gondolatjel (em dash) vagy dupla kotojel a szovegben", () => {
    const szoveg = minden().join("\n")
    expect(szoveg).not.toContain("—")
    expect(szoveg).not.toContain(" -- ")
  })

  it("RE-TERMEKEK: minden termeknek van cikkszama es szabalyos kezeloje, es egy termek csak egyszer all", () => {
    const termekek = REEF_LEPESEK.flatMap((l) =>
      (l.csoportok ?? []).flatMap((c) => c.termekek),
    )
    expect(termekek.length).toBeGreaterThanOrEqual(25)
    for (const t of termekek) {
      expect(t.sku.trim()).not.toBe("")
      expect(t.handle).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
    expect(new Set(termekek.map((t) => t.handle)).size).toBe(termekek.length)
    expect(new Set(termekek.map((t) => t.sku)).size).toBe(termekek.length)
    expect(reefKezelok()).toHaveLength(termekek.length)
  })
})

describe("kaphatoReefTermekek", () => {
  const v = (over = {}) => ({
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 0,
    ...over,
  })

  it("RK-KAPHATO: kezelo -> cim, csak a megveheto termekekre (keszlet, utanrendelheto, nem kezelt keszlet)", () => {
    const ki = kaphatoReefTermekek([
      {
        handle: "van-keszlet",
        title: " Van készlet ",
        variants: [v({ inventory_quantity: 2 })],
      },
      {
        handle: "utanrendelheto",
        title: "Utánrendelhető",
        variants: [v({ allow_backorder: true })],
      },
      {
        handle: "nem-kezelt",
        title: "Nem kezelt",
        variants: [v({ manage_inventory: false })],
      },
      { handle: "nincs-keszlet", title: "Nincs", variants: [v()] },
      { handle: "nincs-valtozat", title: "Változat nélkül", variants: [] },
      {
        handle: "nincs-cim",
        title: " ",
        variants: [v({ inventory_quantity: 1 })],
      },
      {
        handle: 5,
        title: "Rossz kezelő",
        variants: [v({ inventory_quantity: 1 })],
      },
    ])
    expect(ki).toEqual({
      "van-keszlet": "Van készlet",
      utanrendelheto: "Utánrendelhető",
      "nem-kezelt": "Nem kezelt",
    })
  })

  it("RK-URES: hianyzo vagy rossz valasz ures eredmeny, nem hiba", () => {
    expect(kaphatoReefTermekek(null)).toEqual({})
    expect(kaphatoReefTermekek(undefined)).toEqual({})
    expect(kaphatoReefTermekek([])).toEqual({})
  })
})
