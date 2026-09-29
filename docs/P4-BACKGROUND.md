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

**The picker, added later in today's look (not the Figma redesign):**
- `GET /store/foxpost` tells the checkout which option is Foxpost (the role table lives in the backend) and whether it is available.
- In the existing shipping step, choosing Foxpost opens `CsomagpontValaszto`: a postcode or city search, the results list, and the chosen point.
- Choosing a point sets the method with the point in its `data`. Until then the method is not set, and "Tovább a fizetéshez" stays disabled.
- The point already in the cart is shown back.

**Not in this PR:**
- **GLS pickup points:** there is no GLS directory in the code, only the option names. It needs the official GLS ParcelShop documentation (`P4-LEFT-OUT.md`).

### 1b. The GLS pickup-point picker

acrobot's decision, 2026-09-29: our own picker from GLS's public list, **no third-party script in the checkout**, and both GLS ids stored on the order.

**The source:** GLS's own map widget reads its points from `map.gls-croatia.com/data/deliveryPoints/{country}.json`, measured in the widget's code.
- The file was downloaded to `exchange/gls-widget-2026-09-29/data/deliveryPoints/hu.json`: 4081 points, 926 parcel shops and 3155 lockers, shape `{"items": [...]}`.
- **Fields:** `id`, `goldId`, `name`, `contact.{postalCode, city, address}`, `type`, `features`, `lockerSaturation`.

**Backend:**
- `GlsPickupPointsService` fetches the list on the server and caches it for a day, like Foxpost.
- **It leaves out** out-of-order lockers (369, as the widget itself disables them), points without `delivery`, unknown types and malformed rows.
- **The search** is shared with Foxpost (`pickup-point-search.ts`), so both answer the same way.
- **`glsPointAllowed` holds the heavy rule in one place:** the heavy-goods option offers parcel shops only; the ordinary GLS pickup point offers both kinds (acrobot, 2026-09-29).
- **`GET /store/gls`** names the options that go to a point (by binding: `ACROPORA_SO_GLS_POINT`, `ACROPORA_SO_GLS_HEAVY_POINT`), because "GLS csomagpont" shares its role with home delivery.
- **`GET /store/gls/pickup-points?q&option_id`** searches with the rule of that option; the browser sends no heavy flag.
- **The fulfillment provider** requires `data.gls_pickup_point.id` for those options, checks it against our copy of the list and the rule, and stores `id`, `gold_id`, name, address and type. Label printing (MyGLS) needs one of the two ids, and it is not yet known which.

**Storefront:** the Foxpost picker became carrier-neutral (`szolgaltato` and `kereso` props). The shipping step keeps one map from option to carrier, so Foxpost and GLS take the same path: choosing opens the picker, the point sets the method, and the cart's point is shown back.

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
1. **Move the pickup lines.** They go to a new pickup cart with the same customer, region, channel and addresses, linked both ways in metadata (`acropora_pickup_cart_id`, `acropora_parent_cart_id`). The promotion codes are applied to it where they are valid, but **only the codes that divide with the lines**: percentage codes and fixed per-item (`each`) codes (`pickupPromoCodes`).
   - Measured on stage (2026-09-29, the same two lines whole and split): a 10% code gave 950 Ft whole and 100 + 850 split. A fixed cart-level code (`fixed`, `across`) gave 635 Ft whole and 635 on **each** part, so it was taken twice. Such a code now stays on the shipped cart only.
   - Two known limits. If the shipped part is smaller than the fixed discount, the customer gets less than the one cart would have given. An **automatic** fixed cart-level promotion applies itself to each cart, whatever the codes. Stage has none: acrobot measured the promotion table on 2026-09-29, and both codes there are `is_automatic=false`.
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

**Since 2b:** the order details page also names the pair, as a link to its details. Measured live on the account list first: #3 says "Egy leadásból: #4, bolti átvétel", and #4 says "…#3, kiszállítás".

**Not in 2b:**
- the Figma redesign of the cart and checkout (waits for Balázs's word);
- the card payment for both orders in one transaction (P4-3).

### Still to come
- **One SimplePay transaction for both orders:** part of P4-3.

## 3. SimplePay (P4-3, P4-4)

**The source:** SimplePay's public API v2 description, version 2026-09-01 (`exchange/simplepay-v2-2026-09-29/SimplePay_2x_API_v2_HU_260901`). Line numbers below are that file's `.txt`.
- This is the redirect payment on SimplePay's own page.
- The "auto" interface (`SimplePay_2.0_AutoPayment`) takes the card data on our side, which needs PCI-DSS, so it is **not** used.

**Decisions (acrobot, 2026-09-29):**
- One-step charge (`twoStep: false`).
- The data-transfer statement as a required checkbox in the payment step, with the SimplePay logo and the payment-information link. The final text goes to Balázs before P4-4.
- One SimplePay transaction pays both orders of a split cart (Balázs, 16:09 UTC).

### 3a. The provider (`src/modules/simplepay`, `pp_simplepay_simplepay`)

- **Signature** (`signature.ts`): HMAC-SHA384 over the **raw** body bytes, base64, in the `Signature` header (L590-599, L2568).
  - Both of the document's test vectors reproduce exactly: the request signature (L632-641) and the back redirect's `s` (L994-996). For the latter, `s` signs the **decoded** JSON of `r`, measured on the document's own example.
  - The unit tests pin both vectors.
- **Client** (`client.ts`): every call is POST JSON with a fresh 32-character `salt`, our `merchant` and `sdkVersion`, signed.
  - An answer is believed only when its signature verifies on the raw bytes.
  - An `errorCodes` answer is a refusal reported with its codes.
  - The URLs are `https://sandbox.simplepay.hu/payment/v2/` and `https://secure.simplepay.hu/payment/v2/` (L439, L462).
- **Provider** (`service.ts`):
  - `initiatePayment` → `start`:
    - Medusa's amount and currency; HUF must be whole (L573-575).
    - `methods: ["CARD"]`, `language: "HU"`, a 30-minute timeout.
    - The back URL from **our** configuration, never from the request.
    - `orderRef` is the session id plus a suffix; a failed orderRef may be reused, a paid one not (L667-668).
    - The customer's email and billing address come with the session data; 3DS needs them (L758-773). Without them it refuses.
  - `authorizePayment` → `query`. FINISHED is money (CAPTURED, one-step); INIT and INPAYMENT are still pending; cancelled, timeout or not authorized are CANCELED; anything unknown is ERROR, not a guess. **The customer's return is never proof of payment** (L372, L533, L726).
  - `refundPayment` → `refund`, partial up to the charged amount.
  - `cancelPayment` → `transactioncancel`, only while INIT (L1541); a paid transaction is refunded, not cancelled.
  - `updatePayment` with a new amount starts a new transaction.
  - The IPN answer (L1189-1193: the received data plus `receiveDate`, signed) is more than Medusa's generic webhook route can give, so it gets its own route in P4-3b.
- **Configuration** (`medusa-config.ts`, `.env.template`): `SIMPLEPAY_MERCHANT`, `SIMPLEPAY_SECRET_KEY`, `SIMPLEPAY_SANDBOX` (the sandbox unless exactly `false`) and `SIMPLEPAY_BACK_URL`.
  - Unconfigured, the provider loads and refuses every call.
  - It is offered only when linked to the region and named by `ACROPORA_PP_ONLINE_CARD`, which stays empty until the sandbox key is set.

### 3b. The IPN (`POST /simplepay/ipn`)

SimplePay calls this URL when a transaction ends (section 3.14, L1147-1203). It is set in the SimplePay admin, not in the start request (L1147), and must be public without protection in front (L1154-1156). Stage: `https://commerce-stage.acropora.hu/simplepay/ipn`, to be set only once this route is deployed.

- **Reading** (`ipn.ts`, `readSimplePayIpn`): the body is kept **raw** (`preserveRawBody` in `middlewares.ts`), because the signature covers the exact bytes.
  - Unconfigured shop: 503. Empty or non-JSON body: 400. Bad signature: 401.
  - Another merchant, or no `orderRef`, `transactionId` or `status`: 400.
- **The answer** (`simplePayIpnAnswer`): the received fields unchanged, plus `receiveDate` (`2019-09-09T14:46:20+0000` form), signed over exactly the bytes sent, in the `Signature` header (L1189-1193). Pinned by a test on the document's own IPN example (L1179-1188).
- **FINISHED makes the order** (`workflows/utils/simplepay-finish.ts`), even if the customer never returns (L372):
  - the payment session is `orderRef` up to its last dash (`payses_…`); anything else is not ours;
  - the IPN's `transactionId` must be the one stored on that session;
  - then the same `completeSplitCart` the storefront uses, so whichever comes first makes the order and the second finds it made. On the way the provider asks SimplePay again (`query`), so the IPN is never the only evidence.
  - **A mixed cart is refused** until P4-3c: its lines would have to move after payment.
- **If the order cannot be made, the answer is 500**, and the error is logged with the orderRef and transaction. SimplePay then retries for three days (L1157-1174) instead of believing we are done. It waits 20 seconds for the answer (L1164).
- **Every other status** (CANCELLED, TIMEOUT, …) is acknowledged with the signed answer and changes nothing.

### 3c. One transaction for both orders of a split cart (P4-3c)

**Decision (acrobot, 2026-09-29, variant B):** the cart is split **before** the payment starts, and the one transaction is for the two finished carts together. The money and the two orders' sum then cannot differ by construction. A cancelled or failed payment puts the lines back.

**P4-3c2a, the provider and its guard (#433):**
- **The shipped cart's session** carries `simplepay_joint: { total }`. It starts ONE transaction for that total, which must be at least the session's own amount.
- **The pickup cart's session** carries `simplepay_joined: { transactionId, orderRef, total, own, … }`, the shipped session's facts. It starts nothing and carries the shipped session's transaction.
  - It joins only if the two parts **together** are exactly the transaction's total: the shipped session's `own` plus its own amount.
  - This matters because the pickup cart's promotions are computed again after the split, so its total can move after the start. Checking each part alone would let both orders book more than was paid (nautilus's review, 2026-09-29).
- **Both sessions keep `own`,** their own amount, apart from `total`, the transaction's.
- **Dropping the pickup session never cancels the shared payment.**
- **A new amount on either cart** is refused rather than restarted alone. The split's payment is started again for both.
- **A FINISHED transaction whose `total` (L1392) is not the one we started** reads as `TOTAL_MISMATCH`, an error, never as paid. This holds for every SimplePay payment, split or not.
- **The client cannot set these keys:** the store route that creates payment sessions refuses `simplepay`, `simplepay_joint` and `simplepay_joined` in its `data` (`refuse-client-simplepay-keys.ts`). Otherwise a cart could borrow someone else's paid transaction, or name its own amount. Only our split route sets them.

**P4-3c2b, the start and the completion:**
- **`POST /store/carts/:id/simplepay-start`** (`startSharedSplitPayment`). The request carries only the cart id; the provider (`ACROPORA_PP_ONLINE_CARD`), the payer (the cart's email and billing address) and every amount are read on the server.
  1. The pickup lines move to their own cart, as in the completion (`moveToPickupCart`, shared with it).
  2. Both carts' totals are read.
  3. The shipped cart's session starts one transaction for their sum (`simplepay_joint`).
  4. The pickup cart's session joins it (`simplepay_joined`).
  5. The answer carries `payment_url` and the totals.
  - **If anything fails before the customer is sent to pay,** the lines move back and the cart is whole again.
  - **Called again** (a second click, or after a cancelled payment), it reuses the split and starts a new transaction. Medusa deletes the old session, which releases its unpaid transaction.
  - **A cart that is not split** is paid the ordinary way, and is refused here.
- **The completion of a split paid together** (`completeSplitCart`, when the cart's session shares its transaction):
  - nothing moves;
  - the shipped cart is completed on its card session;
  - the pickup cart keeps its joined card session instead of payment in the shop.
  - **A failure moves nothing back:** the payment belongs to the two carts as they are, and the IPN retries.
  - **A pickup line added to the shipped cart after the start** is refused.
- **The check before any cart becomes an order** (`assertSimplePayShare`, in the `validate` hook):
  - a card session's own amount must be the cart's total;
  - the shipped cart's transaction must be its total plus its pickup pair's, and the pair must carry the same transaction;
  - a pickup cart's transaction must be its shipped cart's.
  - Together with the provider's FINISHED-total check, the money and the orders cannot differ.
- **The IPN** (`finishSimplePayOrder`): the orderRef leads to the shipped cart and `completeSplitCart` does the rest. A cart still mixed when paid was paid as one and is still refused.

### Still to come

- **P4-3c3:** putting the lines back on a cancelled or failed payment (the failed-status IPN, which needs the "Rendszer értesítések" switch in the SimplePay admin, and the back page).
- **P4-4:** the storefront: logo, statement checkbox, redirect to `paymentUrl`, and the back page with the texts section 3.13 requires.

