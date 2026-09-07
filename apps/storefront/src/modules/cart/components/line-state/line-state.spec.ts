import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest"

import {
  CART_LINE_LABEL,
  UNIQUE_IN_CART_PROMISE,
  cartLineProduct,
  cartLineStateOf,
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

/**
 * MELYIK TERMEK-OBJEKTUMOT OLVASSA A SOR.
 *
 * A szamok egy VALODI staging kosarrol valok (2026-09-07): a valtozat alatti
 * termek EGY kulcsot hordoz (`id`), az `item.product` HUSZONNYOLCAT. A sor
 * eddig a rosszat olvasta, es ettol a jelzo mindig `undefined` volt.
 */
describe("a kosársor termék-objektuma", () => {
  it("az item.product-ot választja, mert az hordozza a mezőket", () => {
    const eredmeny = cartLineProduct({
      product: { metadata: { unique_piece: "true" }, collection_id: "coll_1" },
      variant: { product: { id: "prod_1" } },
    });

    expect(eredmeny.metadata).toEqual({ unique_piece: "true" });
    expect(eredmeny.collection_id).toBe("coll_1");
  });

  /**
   * ES A MASIK IRANY, KULON ALLITASSAL: ha az `item.product` HIANYZIK, a
   * valtozat alatti termek a tartalek. Enelkul egy "mindig ures objektumot
   * ado" valtozat is zold maradna.
   */
  it("item.product híján a változat alattira esik vissza", () => {
    expect(
      cartLineProduct({ variant: { product: { id: "prod_1" } } }),
    ).toEqual({ id: "prod_1" });
  });

  it("egyik sincs: üres objektum, nem hibázik", () => {
    expect(cartLineProduct({})).toEqual({});
    expect(cartLineProduct({ variant: null })).toEqual({});
  });

  /**
   * ES A VEGE: a jelzo TENYLEG atmegy a valasztason. Ez koti ossze a ket
   * fuggvenyt -- a hibas allapotban pontosan ez a lanc szakadt el.
   */
  it("a kiválasztott termékből az EGYEDI állapot áll elő", () => {
    const sor = {
      product: { metadata: { unique_piece: true } },
      variant: { product: { id: "prod_1" } },
    };

    expect(
      cartLineStateOf({
        productMetadata: cartLineProduct(sor).metadata,
        stillAvailable: true,
      }),
    ).toBe("EGYEDI");
  });
});

/**
 * ES HOGY A SOR KOMPONENSE TENYLEG A FUGGVENYT HASZNALJA.
 *
 * A fenti allitasok a valasztast merik. Azt NEM, hogy a komponens elfogadja-e:
 * egy visszairt `item.variant?.product?.metadata` sor mellett mind zold
 * maradna, es pontosan ez volt a hibas allapot.
 *
 * A komponens kliens-komponens, de a valasztas egyetlen JSX-koron kivuli sor,
 * ezert a forrast olvassuk. Amit mer: MIT AD AT a komponens.
 */
describe("a kosársor komponense a közös választást használja", () => {
  const forras = readFileSync(
    join(process.cwd(), "src/modules/cart/components/item/index.tsx"),
    "utf-8",
  );

  /** ISMERT POZITIV KONTROLL: tenyleg a kosarsor komponenset olvastuk be. */
  it("a forrás olvasható, és ez tényleg a kosársor", () => {
    expect(forras).toContain("cartLineStateOf");
    expect(forras).toContain("data-testid=\"product-row\"");
  });

  it("nem a változat alatti terméket olvassa", () => {
    expect(forras).toContain("cartLineProduct(item)");
    expect(forras).not.toContain("item.variant?.product?.metadata");
    expect(forras).not.toContain("similarItemsHref(item.variant?.product");
  });
});
