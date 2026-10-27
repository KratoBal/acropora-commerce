import { describe, expect, it } from "vitest"

import { egysegarNevbol } from "./egysegar"

/**
 * AZ EGYSEGAR A NEVBOL (audit P1/3). MI PIROSIT: ha egy bizonytalan nevbol
 * (ket mennyiseg, szorzo, mg, meret) egysegar lesz; ha a gramm es a ml atvaltasa
 * elcsuszik; ha a kerekites nem egesz forint; ha egy nulla ar egysegarat ad.
 * A hatter `unit-price.unit.spec.ts`-e ugyanezt a szabalyt veti ossze a
 * hatter masolataval.
 */
describe("az egységár a névből", () => {
  it.each([
    ["Aquaforest Pro Bio F 25g", 1250, "kg", 50000, "25 g", "25g"],
    ["Excel Flake 70g", 2100, "kg", 30000, "70 g", "70g"],
    ["BAKTÉRIUMKULTÚRA 3785ml", 18900, "l", 4993, "3785 ml", "3785ml"],
    ["haleledel 156gr", 1560, "kg", 10000, "156 g", "156g"],
    ["Tengeri só 20 kg", 20000, "kg", 1000, "20 kg", "20kg"],
    ["Vízkondicionáló 1,5 l", 3000, "l", 2000, "1,5 l", "1.5l"],
  ])("%s", (nev, ar, alap, egysegar, kiszereles, feed) => {
    expect(egysegarNevbol(nev, ar)).toEqual({
      alap,
      ar: egysegar,
      kiszereles,
      feedMertek: feed,
    })
  })

  it.each([
    "Jebao PP-4 keringető",
    "Tápoldat 250 ml / 1 l kiszerelésben",
    "Eledel 4x25g",
    "Eledel 2 x 50 ml",
    "Eledel 25g x 4",
    "Blue Life Flux RX 2000mg",
    "D-D Jumpguard Pro kiugrásgátló 180x90cm",
    "Red Sea átlátszó háló 90cm*4m",
    "Valami 0 ml",
  ])("bizonytalan név, nincs egységár: %s", (nev) => {
    expect(egysegarNevbol(nev, 1000)).toBeNull()
  })

  it("nulla, negatív vagy hiányzó ár és hiányzó név nem ad egységárat", () => {
    for (const ar of [0, -1, null, undefined, Number.NaN])
      expect(egysegarNevbol("Eledel 25g", ar)).toBeNull()
    expect(egysegarNevbol(undefined, 1000)).toBeNull()
  })
})
