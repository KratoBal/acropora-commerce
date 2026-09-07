import { describe, expect, it } from "vitest"

import {
  CART_LINE_LABEL,
  cartLineStateOf,
  UNIQUE_IN_CART_PROMISE,
} from "./line-state"

describe("a kosársor állapota", () => {
  it("jelző nélküli tétel NORMAL, akkor is, ha közben elfogyott", () => {
    expect(
      cartLineStateOf({ productMetadata: null, stillAvailable: true }),
    ).toBe("NORMAL")
    /**
     * ES EZ A MASODIK FELE FONTOSABB: egy elfogyott, de NEM egyedi tetel nem
     * "elkelt". Visszajohet, tehat a kosarban maradhat -- a tervben is kulon
     * allapot ("Utanpotlas uton"), nem ez.
     */
    expect(
      cartLineStateOf({ productMetadata: null, stillAvailable: false }),
    ).toBe("NORMAL")
  })

  it("kimondott jelzővel EGYEDI, amíg megvehető", () => {
    expect(
      cartLineStateOf({
        productMetadata: { unique_piece: "true" },
        stillAvailable: true,
      }),
    ).toBe("EGYEDI")
  })

  /**
   * A SORREND ALLITASA: az ELKELT elozi az EGYEDIT. Egy elkelt peldany egyedi
   * IS, de a vevonek nem azt kell megtudnia, hogy egyedi, hanem hogy mar nincs.
   */
  it("egyedi példány, ami közben elkelt: ELKELT, nem EGYEDI", () => {
    expect(
      cartLineStateOf({
        productMetadata: { unique_piece: true },
        stillAvailable: false,
      }),
    ).toBe("ELKELT")
  })
})

describe("a kosár szövegei", () => {
  /**
   * A KOSARBAN "ELKELT" ALL, NEM "ELADVA": ket kulonbozo pillanat. A
   * terméklapon a peldanyt korabban vettek meg, a kosarban a vevo mar dontott,
   * es kozben kelt el.
   */
  it("az elkelt tétel szava a kosárban Elkelt", () => {
    expect(CART_LINE_LABEL.ELKELT).toBe("Elkelt")
    expect(CART_LINE_LABEL.ELKELT).not.toBe("Eladva")
  })

  it("nincs két kötőjel a vevőnek szánt szövegekben", () => {
    for (const szoveg of [
      UNIQUE_IN_CART_PROMISE,
      ...Object.values(CART_LINE_LABEL),
    ]) {
      expect(szoveg).not.toContain("--")
    }
  })
})
