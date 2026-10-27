import { describe, expect, it } from "vitest"

import { markaNev } from "./marka-nev"

/**
 * A MARKA SORRENDJE A FEEDEEVAL EGYEZIK (audit S4): `context.brands[id] ??
 * product.collection?.title?.trim()` a `merchant-feed-item.ts`-ben. A hatter
 * es a kirakat ket kodbazis, ezert ugyanezek az esetek a hatter feed-tesztjeben
 * is allnak. MI PIROSIT: ha a modul neve nem nyer; ha a szokozos vagy ures
 * modul-nev nyer a gyujtemeny fol; ha a gyujtemeny cime nincs vagdalva; ha
 * semmi marka eseten ures sztring null helyett.
 */
describe("a termék márkája", () => {
  it.each([
    ["Aquaforest", "Hanna", "Aquaforest"],
    ["  Aquaforest ", "Hanna", "Aquaforest"],
    [null, "Hanna", "Hanna"],
    [undefined, "  Hanna ", "Hanna"],
    ["   ", "Hanna", "Hanna"],
    ["", "Hanna", "Hanna"],
    [null, null, null],
    [null, "   ", null],
    ["  ", undefined, null],
  ])("modul %j, gyűjtemény %j → %j", (modul, gyujtemeny, varhato) => {
    expect(markaNev(modul, gyujtemeny)).toBe(varhato)
  })
})
