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
    "Jebao DW-16 áramoltató 16000 l/h",
    "Resun Wave Maker HWM2000 600l/h",
    "Octo Pulse4 17000 l/h áramoltató OP-4",
    "AI - Nero 7 Submersible Pump áramoltató ~ 15142 l/h",
    "Ecotech Marine Vortech MP10QD prémium áramoltató (9500l/h)",
    "Ecotech Marine Vortech MP40QD prémium áramoltató (19.000 l/h)",
    "Ultra Reef Skimmer 190 lehabzó (300-900l)",
    "Ultra Reef Skimmer 190 lehabzó (100 - 400 l)",
    "Ultra Reef Skimmer lehabzó (200–500l)",
    "Tápoldat 19.000 ml",
    "Só 1.000 g",
    "Medence víz 19 000 l",
    "FLUVAL FX6, 1500L-es külső szűrő",
    "Vertex Előszűrőzsák tartó 100ml-s - titán csavarokkal 11cm",
    "CUH-18L - 18W-os UVC pótizzó",
    "Arka szűrőanyagtartó zsák 1000ml",
    "Arka - 30cm-es, nagy méretű pipetta - 50ml",
    "Fauna Marin Skim Breeze reactor - 2,5 L - lehabzóhoz CO2 előszűrő tartály",
    "Blue Life Red Cyano Rx 4g - Phosphate RX ComboPack",
  ])("bizonytalan név, nincs egységár: %s", (nev) => {
    expect(egysegarNevbol(nev, 1000)).toBeNull()
  })

  it("nulla, negatív vagy hiányzó ár és hiányzó név nem ad egységárat", () => {
    for (const ar of [0, -1, null, undefined, Number.NaN])
      expect(egysegarNevbol("Eledel 25g", ar)).toBeNull()
    expect(egysegarNevbol(undefined, 1000)).toBeNull()
  })
})
