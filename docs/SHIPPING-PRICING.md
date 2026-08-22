# Shipping pricing

Shipping pricing centralizes operational HUF settings, merchandise-value
calculation, and a pure role-based pricing policy. The Acropora fulfillment
provider connects these components to Medusa's calculated shipping runtime.

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

## Checkout runtime

`src/modules/acropora-fulfillment` is registered as provider
`fp_acropora_shipping`. For a calculated shipping option Medusa passes the
option's `data`, the shipping-method data, and the cart fulfillment context to
the provider. Medusa 2.19 does not pass the shipping option's database ID as a
separate `calculatePrice` argument, so every activated option must store its own
stable shipping-option ID in `data.id`.

The runtime path is:

```text
shipping option data.id
  -> existing shipping-option ID-to-role mapping
  -> cart context.items
  -> calculateGoodsTotal
  -> validated commerce settings
  -> calculateShippingPrice
  -> calculated_amount
```

Unknown option data, absent carrier settings, and malformed settings fail
closed. Pickup resolves to zero before carrier settings are read. Configured HUF
amounts are returned as tax-inclusive so the configured number is the checkout
charge.

The provider preserves manual/no-op fulfillment execution. It does not call
GLS or Foxpost APIs, book shipments, or create labels. Registering the provider
does not activate it for existing shipping options; follow
`CALCULATED-SHIPPING-ROLLOUT.md` in a separately approved environment change.
