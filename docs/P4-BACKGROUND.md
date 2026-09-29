# P4: the checkout background

Balázs allowed the P4 **background** on 2026-09-29 15:32 UTC: several shipping groups in one cart (live animals collected in person, equipment by courier), SimplePay, and the pickup-point picker. Scope is the test storefront and the stage backend only. Redrawing the cart and checkout screens is **not** part of it; that waits for his separate word, and so does P3.

The plan splits it into four PRs:

| PR | What | Waits on |
|---|---|---|
| P4-1 | pickup-point search, and the chosen point sent with the shipping method | nothing |
| P4-2 | a live animal's cart becomes two orders: the shipped one and a pickup one | nothing (decided 2026-09-29, section 2) |
| P4-3 | SimplePay provider, backend | the sandbox key and the official API v2 documentation |
| P4-4 | SimplePay redirect and return page, in the existing checkout step | P4-3 |

## 1. Pickup-point search (P4-1)

**Measured on 2026-09-29, before the change.**
- Foxpost is configured on stage.
- `GET /store/foxpost/pickup-points` answered the **whole directory in one response**: 5006 points, 1.66 MB.
- The storefront called `addShippingMethod` with `option_id` only. The fulfillment provider requires `data.foxpost_pickup_point.id` for the Foxpost option, so **Foxpost could not be chosen at checkout at all**.
- In the public directory (`cdn.foxpost.hu/foxplus.json`), every point carried `zip` and `city` (5006 of 5006), all postcodes four digits.

**The search:** `GET /store/foxpost/pickup-points?q=…&limit=…`
- **Matching:**
  - a query of 1 to 4 digits matches a **postcode prefix**;
  - otherwise **every word** must occur in the point's name, city or address, ignoring case and accents ("godollo" finds "Gödöllő").
- **Answer:** at most `limit` points (default 20, at most 50), ordered by postcode, then name, plus `count`, the number of all matches.
- **Points** now carry `zip` and `city`. Both are read when present and never required, so a point without them is kept, not dropped.
- **Without `q`**, the route answers the whole directory as before.
- **An unconfigured Foxpost** is still 200 with `available: false`; an unreachable directory is still 503.

**The storefront data layer:**
- `searchFoxpostPickupPoints(q, limit)` in `lib/data/csomagpont.ts`: an empty search does not call the backend, and any failure reads as "not available".
- `setShippingMethod` takes an optional `data`. `foxpostSzallitasiAdat(id)` builds `{ foxpost_pickup_point: { id } }`.
- Only the id is sent; the backend writes the name and address from its own directory, so a browser cannot put an invented point on an order.

**Not in this PR:**
- **The picker UI:** the checkout screens wait for Balázs's word, so nothing in the checkout calls these yet.
- **GLS pickup points:** there is no GLS directory in the code, only the option names. It needs the official GLS ParcelShop documentation (`P4-LEFT-OUT.md`).

## 2. Two orders from one cart (P4-2)

**The decision.** Balázs, 2026-09-29, 16:06 to 16:09 UTC, through acrobot:
- **The split:** when a cart has live animals and other items, placing the order creates **two orders**: the shipped one, and a pickup one for the pickup-only items.
- **The customer:** pays in **one step**, and sees **two orders**.
- **The notice:** the cart page and the order placement say clearly that the live animals make two orders.
- **The threshold:** free shipping counts the courier items only.
- **Payment:** the pickup part is paid in the shop, or together with the rest by card.

This replaces the 2026-08-31 rule, where a live animal made the whole cart pickup-only and nothing was split.

**Why two Medusa orders and not one, measured in 2.20.1:** a payment collection holds one payment session. `create-payment-session.js:120-123` deletes the existing session before creating a new one ("we don't support split payments at the moment"), and `complete-cart.js:340` authorizes `paymentSessions[0]` only. One order cannot carry cash on delivery and payment in the shop side by side.

**Which lines split off:** the pickup-only lines, by the same three flags that made a cart pickup-only (`pickup_only`, `is_frozen`, livestock product type). This is `pickupSplit` in `compute-shipping-class.ts`.
- They split off only from a **mixed** cart.
- A cart of pickup-only lines alone stays one pickup order, as before.
- A line that needs no shipping (the cash-on-delivery fee) never splits and never makes a cart mixed.

### 2a1. The shipped part while the cart is still whole

During checkout the cart stays **one cart**, so the cart page shows everything. Three things now leave the pickup lines out:

1. **The shipping class:** it is computed from the lines that ship, so the courier options appear for them. `GET /store/shipping-class` also returns `split_line_ids`, the lines of the pickup order.
2. **The courier price and its threshold:** a `setCalculatedShippingPricingContext` hook on **both** pricing paths passes the split-off line ids to the Acropora provider, which leaves them out of the goods total.
   - The paths are `calculateShippingOptionsPricesWorkflow` (what the checkout shows) and `listShippingOptionsForCartWithPricingWorkflow` (what `addShippingMethod` and the refresh charge).
   - With only one of them, the checkout would show one price and charge another.
3. **Completion:** a mixed cart is **refused** by the `completeCartWorkflow` validate hook.
   - Otherwise it would complete as one order, and a live animal would leave on a courier method.
   - The split completion (2a2) moves the pickup lines to their own cart first, so neither cart is mixed when it completes.

**The state between 2a1 and 2a2, on stage:** a mixed cart shows courier options and cannot be completed, because the split completion does not exist yet. Before 2a1 the same cart completed as one pickup order. Merging 2a1 and 2a2 close together keeps that window short.

### 2a2. The split completion: `POST /store/carts/:id/complete-split`

The storefront places every cart through this route; the core complete route refuses a mixed cart (2a1). A cart that is not mixed becomes one order, exactly as before.

**For a mixed cart** (`completeSplitCart` in `split-completion.ts`; the Medusa calls are in `split-completion-operations.ts`):
1. **Move the pickup lines.** They go to a new pickup cart with the same customer, region, channel and addresses, linked both ways in metadata (`acropora_pickup_cart_id`, `acropora_parent_cart_id`). The promotion codes are applied to it where they are valid.
2. **Set the pickup cart's shipping:** the store pickup (`ACROPORA_SO_PICKUP`).
3. **Re-make the shipped cart's payment:** the method the customer chose, read from the cart and never sent by the client.
   - Moving lines changes the total, and Medusa then deletes the payment session, so it is created again.
   - The cash-on-delivery fee is brought in line, repeating until both are settled.
4. **Complete the shipped cart first.** If that fails, the pickup lines move back, and the customer is where they were. The emptied pickup cart stays linked and is reused next time.
5. **Then the pickup cart,** with payment in the shop (`ACROPORA_PP_PAY_AT_STORE`). If that fails, the shipped order stands, the answer names the pickup cart as pending, and a repeated call finishes it.
6. **Link the two orders** both ways in metadata (`acropora_pickup_order_id`, `acropora_parent_order_id`). The link is written through the order module's `updateOrders`, because `updateOrderWorkflow` requires an admin user.

**Every step is safe to repeat.** A second call never makes a third cart or a second order.

**Refused before anything moves:**
- a mixed cart without a payment choice;
- payment in the shop not configured;
- a pickup product that is not on the store pickup option's shipping profile. Medusa would refuse to complete the pickup cart only **after** the shipped order was made.

**Measured on stage, 2026-09-29, with the test account:**
- The first placement made the shipped order #3 and left the pickup cart pending. The Mithrax product had no shipping profile, per the core completion's message: "The cart items require shipping profiles that are not satisfied by the current shipping methods".
- acrobot linked the product to the Default profile. A repeated call then made the pickup order #4 and linked the two, with no second shipped order.
- **So the failure path worked live.** The profile check above was added so that a gap known in advance never gets that far.

**The two orders of the live test:**

| Order | What it holds | Payment |
|---|---|---|
| #3 (`order_01M3Q1RGV3FDWZ4EW8QTKZN9J0`) | Aquavital Perlonvatta 1000 Ft, COD fee 450 Ft, GLS home delivery 3500 Ft; 4950 Ft in total | cash on delivery |
| #4 (`order_01M3Q1W37PRVZPEBQ89TB6EXKR`) | Mithrax 8500 Ft, store pickup 0 Ft | payment in the shop |

- Each points to the other in metadata.

**The answer:** `{ orders: [{ id, display_id }], pending_pickup_cart_id }`, the shipped order first.

**Measured and not measured:**
- The order of the steps, the rollback and the repeat behaviour are unit-tested on an in-memory shop.
- The Medusa calls themselves (cart creation, line moves, payment re-creation, the fee settling, both completions, the link) cannot run locally. They are measured on stage after merge, with a test cart: one pickup-only product and one ordinary product, cash on delivery.

### 2b. The storefront, in today's look

- **The notice.** A new "Két rendelés lesz belőle" band says "Az élő állat miatt két rendelésed keletkezik." and names the lines that go to the shop order. It shows:
  - on the cart page (`SplitNotice`, from `split_line_ids`);
  - at the top of the checkout, so it is visible at placement too (Balázs: "Már a kosár oldalon és rendelés leadásnál is jól láthatóan").
- **The old pickup band** now shows only for a cart that is pickup-only as a whole. Its sentence no longer says "nem bontjuk két rendelésre" or "a műszaki tételeket is ide készítjük össze"; the test pins that they stay out.
- **Placement.** `placeOrder` calls `POST /store/carts/:id/complete-split` for every cart and redirects to the first (shipped) order's confirmation. The country code is read from the cart before completion, because afterwards there is no cart to read it from.
- **The pair, named.** The confirmation page and both order cards in the account say "Egy leadásból: #13, bolti átvétel" (or "…, kiszállítás"), from the metadata link. The orders are fetched with `+metadata`.
- **The payment step is unchanged:** the backend already offers the shipped part's methods. The shop part is paid in the shop, as the notice says.

**Not in 2b:**
- the pair on the order details page;
- the Figma redesign of the cart and checkout (waits for Balázs's word);
- the card payment for both orders in one transaction (P4-3).

### Still to come
- **One SimplePay transaction for both orders:** part of P4-3.

