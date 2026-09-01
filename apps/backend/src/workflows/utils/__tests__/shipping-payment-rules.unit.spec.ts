import { SHIPPING_ROLE_PAYMENTS } from "../payment-eligibility";
import {
  SHIPPING_PAYMENT_RULE_SEED,
  toShippingRolePayments,
  type ShippingPaymentRuleRow,
} from "../shipping-payment-rules";

describe("the stored matrix and the code matrix", () => {
  it("agree exactly, so the table can replace the constant without a behaviour change", () => {
    expect(toShippingRolePayments(SHIPPING_PAYMENT_RULE_SEED)).toEqual(
      SHIPPING_ROLE_PAYMENTS,
    );
  });

  it("covers every shipping role, including the one with a single method", () => {
    const seeded = new Set(
      SHIPPING_PAYMENT_RULE_SEED.map((row) => row.shipping_role),
    );

    for (const role of Object.keys(SHIPPING_ROLE_PAYMENTS)) {
      expect(seeded.has(role)).toBe(true);
    }
  });
});

describe("turning stored rows into the eligibility map", () => {
  it("orders each list by position, not by the order rows arrive in", () => {
    const rows: ShippingPaymentRuleRow[] = [
      { shipping_role: "GLS_NORMAL", payment_role: "COD", position: 2 },
      { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 1 },
    ];

    expect(toShippingRolePayments(rows).GLS_NORMAL).toEqual([
      "ONLINE_CARD",
      "COD",
    ]);

    const reversed: ShippingPaymentRuleRow[] = [
      { shipping_role: "GLS_NORMAL", payment_role: "COD", position: 1 },
      { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 2 },
    ];

    expect(toShippingRolePayments(reversed).GLS_NORMAL).toEqual([
      "COD",
      "ONLINE_CARD",
    ]);
  });

  it("gives every shipping role a list, so an unconfigured one is empty and not undefined", () => {
    const result = toShippingRolePayments([]);

    expect(result.PICKUP).toEqual([]);
    expect(result.GLS_NORMAL).toEqual([]);
    expect(result.GLS_HEAVY).toEqual([]);
    expect(result.FOXPOST).toEqual([]);
  });

  it("skips an unknown role instead of throwing, and keeps the rest of the list", () => {
    const rows: ShippingPaymentRuleRow[] = [
      { shipping_role: "GLS_NORMAL", payment_role: "ONLINE_CARD", position: 1 },
      {
        shipping_role: "GLS_NORMAL",
        payment_role: "BANK_TRANSFER",
        position: 2,
      },
      { shipping_role: "GLS_EXPRESS", payment_role: "COD", position: 1 },
    ];

    const result = toShippingRolePayments(rows);

    expect(result.GLS_NORMAL).toEqual(["ONLINE_CARD"]);
    expect(Object.keys(result).sort()).toEqual(
      ["FOXPOST", "GLS_HEAVY", "GLS_NORMAL", "PICKUP"].sort(),
    );
  });

  it("does not list the same payment method twice for one shipping method", () => {
    const rows: ShippingPaymentRuleRow[] = [
      { shipping_role: "PICKUP", payment_role: "ONLINE_CARD", position: 1 },
      { shipping_role: "PICKUP", payment_role: "ONLINE_CARD", position: 2 },
    ];

    expect(toShippingRolePayments(rows).PICKUP).toEqual(["ONLINE_CARD"]);
  });
});
