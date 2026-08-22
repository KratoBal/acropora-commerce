# Shipping pricing foundation

The shipping-pricing foundation is deliberately separate from runtime checkout
wiring. It centralizes operational HUF settings, merchandise-value calculation,
and a pure role-based pricing policy for a later calculated-price fulfillment
provider.

## Commerce settings

| Key                           | Default | Meaning                                        |
| ----------------------------- | ------: | ---------------------------------------------- |
| `cash_on_delivery_fee_huf`    |     450 | Per-order cash-on-delivery handling fee        |
| `shipping_gls_normal_huf`     |    none | Normal GLS delivery price                      |
| `shipping_gls_heavy_huf`      |    none | Heavy GLS delivery price                       |
| `shipping_foxpost_huf`        |    none | Foxpost parcel-point delivery price            |
| `free_shipping_threshold_huf` |   50000 | Merchandise threshold for free normal delivery |

The repository contains no approved canonical carrier prices. Carrier accessors
therefore fail when their row is absent instead of silently inventing a charge.
All values are non-negative whole HUF amounts and are validated both when stored
through the Admin API and when read for pricing.

## Goods total

`src/workflows/utils/goods-total.ts` is the single definition:

```text
goods_total = sum(unit_price * quantity) for non-fee line items
```

Shipping methods are not line items and are never passed to this function. A
fee line item is excluded only when its metadata contains
`acropora_line_item_kind: "fee"`. Missing metadata means merchandise, so a
custom item is not discarded merely because it has no product or variant.
Promotions, loyalty, tax totals, shipping and fees do not alter `goods_total`.

## Pure pricing policy

- `PICKUP` is always 0 HUF.
- `GLS_NORMAL` reads `shipping_gls_normal_huf`.
- `GLS_HEAVY` reads `shipping_gls_heavy_huf` and is not waived by the normal
  free-shipping threshold.
- `FOXPOST` reads `shipping_foxpost_huf`.
- `GLS_NORMAL` and `FOXPOST` become 0 HUF when
  `goods_total >= free_shipping_threshold_huf`.

This foundation does not register a fulfillment provider, change shipping
options or price rules, create a positive COD fee line item, call carrier APIs,
or connect the policy to cart/checkout workflows. Those are separate reviewed
changes.
