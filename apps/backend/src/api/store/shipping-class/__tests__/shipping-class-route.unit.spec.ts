import { GET } from "../route";

/**
 * A ROUTE HAROM DOLGOT ALLIT, ES MIND A HAROM KULON ROMOLHAT EL:
 *
 *   csak azt a NEGY mezot kerdezi le, amit a feloldo olvas
 *   a valaszban a KET mezo all, tobb nem
 *   nem letezo kosarnal NEM ad ures osztalyt, hanem hibat
 *
 * A harmadik a legfontosabb: egy ures valasz ugyanugy nezne ki, mint egy
 * NORMAL osztaly, es a kirakat a "nincs korlatozas" agra menne egy olyan
 * kosarnal, ami nem is letezik.
 */
const feloldo = jest.fn();

jest.mock("../../../../workflows/utils/resolve-cart-shipping-class", () => ({
  resolveCartShippingClass: (...args: unknown[]) => feloldo(...args),
}));

type Valasz = { json: jest.Mock };

const keres = (cartId: string, items: unknown[] | null) => {
  const graph = jest.fn().mockResolvedValue({
    data: items === null ? [] : [{ id: cartId, items }],
  });
  const req = {
    validatedQuery: { cart_id: cartId },
    scope: { resolve: () => ({ graph }) },
  };
  const res: Valasz = { json: jest.fn() };
  return { req, res, graph };
};

describe("GET /store/shipping-class", () => {
  beforeEach(() => {
    feloldo.mockReset();
    feloldo.mockResolvedValue({
      shipping_class: "PICKUP_ONLY",
      shipping_class_source: "item_1",
    });
  });

  it("returns the class AND the line that caused it", async () => {
    const { req, res } = keres("cart_1", [
      { id: "item_1", variant_id: "variant_1", requires_shipping: true },
    ]);

    await GET(req as never, res as never);

    expect(res.json).toHaveBeenCalledWith({
      shipping_class: "PICKUP_ONLY",
      shipping_class_source: "item_1",
    });
  });

  /**
   * A SOURCE NELKUL A ROUTE ERTELMETLEN: az osztalyt a kirakat kikovetkeztetne
   * abbol is, mely opciok jottek vissza. A MEGNEVEZES az, amiert ez a vegpont
   * letezik -- ezert all ra kulon allitas, nem csak a fenti egyuttes.
   */
  it("passes the line id through untouched", async () => {
    feloldo.mockResolvedValue({
      shipping_class: "NO_FOXPOST",
      shipping_class_source: "item_42",
    });
    const { req, res } = keres("cart_1", [
      { id: "item_42", variant_id: "variant_9", requires_shipping: true },
    ]);

    await GET(req as never, res as never);

    expect(res.json.mock.calls[0][0].shipping_class_source).toBe("item_42");
  });

  it("asks for exactly the fields the resolver reads", async () => {
    const { req, res, graph } = keres("cart_1", []);

    await GET(req as never, res as never);

    expect(graph.mock.calls[0][0].fields).toEqual([
      "id",
      "items.id",
      "items.variant_id",
      "items.requires_shipping",
    ]);
  });

  it("drops null lines before the resolver sees them", async () => {
    const { req, res } = keres("cart_1", [
      null,
      { id: "item_1", variant_id: "variant_1", requires_shipping: true },
    ]);

    await GET(req as never, res as never);

    expect(feloldo.mock.calls[0][0]).toEqual({
      items: [
        { id: "item_1", variant_id: "variant_1", requires_shipping: true },
      ],
    });
  });

  it("throws on a missing cart instead of answering NORMAL", async () => {
    const { req, res } = keres("cart_nincs", null);

    await expect(GET(req as never, res as never)).rejects.toThrow(/cart_nincs/);
    expect(res.json).not.toHaveBeenCalled();
  });
});
