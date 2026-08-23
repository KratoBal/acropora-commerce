# Calculated shipping rollout

This document is an operator runbook, not an automatically executed migration.
Do not apply it to stage or production as part of the code PR that introduces
the provider.

## What the code deployment does

The backend registers the existing manual provider and the new Acropora
provider. Medusa represents the latter as `fp_acropora_shipping`. Registration
alone does not change an existing shipping option's provider, price type, data,
prices, or rules.

## Required preflight

Before changing any shipping option, confirm all of these commerce-setting rows
exist and pass the Admin API validation. The currently approved configuration
is:

| Key                           | Value |
| ----------------------------- | ----: |
| `shipping_gls_normal_huf`     |  3500 |
| `shipping_gls_heavy_huf`      |  4500 |
| `shipping_foxpost_huf`        |  1150 |
| `free_shipping_threshold_huf` | 50000 |
| `cash_on_delivery_fee_huf`    |   450 |

These are environment configuration values, not application fallbacks. Missing
or invalid carrier rows intentionally block carrier-price calculation. Pickup
does not depend on them.

Also confirm that:

- `fp_acropora_shipping` is enabled and connected to every stock location used
  by the target shipping options;
- all target option IDs match the resolved bindings in
  `shipping-option-roles.ts`, including environment-variable overrides;
- every relevant Acropora product belongs to one shipping profile. Multiple
  shipping profiles are a blocker: Medusa 2.19 passes this provider only the
  items filtered for the option's shipping profile, while Acropora's threshold
  is defined for the full order goods total;
- the current option records have been exported, including `id`, name,
  provider ID, price type, data, metadata, shipping profile, service zone,
  type, and every shipping-option rule (`id`, attribute, operator, value);
- the current flat prices and their price rules have been exported separately,
  including each price's currency or region, amount, price-list/tier fields,
  and complete rule set;
- no unrelated shipping configuration rollout is in progress.

## Per-option activation contract

Each target option must be changed atomically to:

- `provider_id: "fp_acropora_shipping"`;
- `price_type: "calculated"`;
- provider option data containing `id` equal to that same shipping option's
  stable database ID.

Choose the corresponding fulfillment option exposed by the provider. Do not
write a role name into option data: role resolution remains centralized in the
existing ID-to-role mapping.

Before and after every update, assert:

```text
shipping_option.data.id === shipping_option.id
```

Stop the rollout on any mismatch. The update payload must omit `rules`
entirely. Snapshot the full existing rule array before the update and compare it
afterward, including `shipping_class`, `enabled_in_store`, and `is_return`.
Preserve the shipping profile, service zone, type, and metadata as well.

Changing `price_type` to `calculated` removes the option's flat prices and their
price rules in Medusa 2.19. They cannot remain on the option during an
observation window. The pre-update export is the rollback source of truth.

## Recommended rollout order

1. Deploy the backend code and verify startup/provider registration.
2. Complete the preflight without changing option records.
3. Activate pickup first and verify it resolves to 0 HUF.
4. Activate one normal carrier option and test the boundary cases.
5. Activate the remaining normal, Foxpost, and heavy options one at a time.
6. Verify checkout after each option and monitor calculation errors.
7. Stop if a second shipping profile is present; do not activate this provider
   until a full-cart goods-total design is implemented.

The legacy flat rules use a different boundary in the current environment:
1150/3500 HUF through `item_total <= 50000`, then zero from `>= 50001`.
Calculated pricing intentionally changes this to `goods_total >= 50000`.

## Acceptance checks

- Pickup: 0 HUF.
- GLS normal: 3500 HUF at `goods_total=49999`; 0 HUF at 50000 and 50001.
- Foxpost: 1150 HUF at `goods_total=49999`; 0 HUF at 50000.
- GLS heavy: 4500 HUF at 49999, 50000, and 100000.
- A 49600 HUF goods line plus a marked 450 HUF fee line has
  `goods_total=49600` and does not receive free normal shipping.
- Removing or corrupting a carrier setting in an isolated test environment
  prevents that carrier price from resolving; it never produces a silent zero.
- Existing shipping eligibility and payment eligibility remain unchanged.

## Rollback

For any failing option, restore its exported provider ID, flat price type, data,
shipping profile, service zone, type, metadata, and full shipping-option rule
set. Recreate the exported flat prices and their price rules; calculated
activation removed them from Medusa. Validate the `data.id === id` invariant and
compare the restored option and price snapshots before reopening checkout.

Do not disable or remove the Acropora provider while another option still
references it. A rollback is an environment change and requires the same
approval and verification as activation.
