# P2: the Commerce cart page

> State on main `997105aa` (2026-11-16), test storefront only. Cart, checkout and the confirmation page are allowed on the test shop
> since Balázs's decision of 2026-11-02 (Eldöntendő thread, message 1566841539181805699). Nothing here goes live without his
> separate word, and nothing writes to the live Medusa.

## Figma source

Design hand-off `Kosar.dc.html` (2026-09-09, `exchange/design-handoff-2026-09-09/project/`), described in `exchange/kosar-terv-leiras-2026-09-09.md`:
**3a** the normal cart (live animal and technical items mixed, mobile and desktop) and **3b** three states (empty cart, stock change, a unique
specimen sold while in the cart). The Figma Page node is `201:2` (shared with the checkout; see `FIGMA-MAP.md`).

## What the design assumed, and what was decided since

The 3a design rests on one rule, stated in its headline: "if the cart holds a live animal, the WHOLE order is a personal pick-up, the
technical items are not split off". **That rule has not applied since 2026-09-29** (Balázs, through acrobot, 16:06 to 16:09 UTC): a cart with
a live animal AND a deliverable item becomes TWO orders, the delivered one and a shop pick-up one, placed together and seen by the buyer as
two orders. The old rule holds only for a cart where EVERY item is pick-up only (one shop order). The cart says this already: `PickupNotice`
(an all-pick-up cart) and `SplitNotice` (a mixed cart) in `modules/cart/components/pickup-notice/`.

Consequences for the design's pieces:

- The delivery boxes where a carrier is "disabled, because of item X" (3a: Foxpost "because of 2 items", GLS "because of 1 item") no longer
  describe the rule: a live animal does not disable the courier any more, it goes to the other order. What can still disable the Foxpost
  locker is a large item ("Nagyméretű, automatába nem fér", already shown on the item line).
- The positive box "A szállítás újra nyitva" (3b, after the live specimen is gone) lost its premise: shipping was not closed to begin with
  in a mixed cart.

## Built (found by searching the storefront source for the design's strings; this is a presence check, NOT a visual comparison)

| Design piece | Where |
| --- | --- |
| "Ezt a rendelést a boltban adjuk át" lead | `lib/i18n/dictionary/hu.ts` (`pickupLead`), `PickupNotice` |
| Two-order notice for a mixed cart | `SplitNotice` |
| Step indicator "1 / 3 · Kosár" | `components/step-indicator` |
| "Vásárlás folytatása", the VAT note, "Tovább a fizetéshez" | `hu.ts` (`continueShopping`, `vatNote`, `toCheckout`) |
| "Nem növelhető" on a unique specimen's quantity | `hu.ts` (`lineNotIncrementable`), `components/item` |
| "1 DB · EGYEDI PÉLDÁNY" badge | `modules/products/components/unique-piece-badge` |
| 3b empty cart: the WYSIWYG card, "Most kezdesz akváriumot?" | `components/empty-cart-message`, `hu.ts` (`emptyOfferWysiwyg`, `emptyStartTitle`) |
| 3b sold specimen: "ELKELT", "Hasonló példányok" | `components/elkelt-ertesites`, `lib/util/elkelt-darab.ts` |
| Reservation lines (V2.3 S2b) | `components/foglalas-sorok` |

## Not built, and why

String search found no occurrence of these (so each is absent or worded differently; the page was not compared visually):

| Design piece | Why it is not built |
| --- | --- |
| Eyebrow "ÉLŐ ÁLLAT A KOSÁRBAN" above the header box | the live-animal rule changed (above); the notice has its own wording |
| The "ÁTVÉTEL" and "FIZETÉS" boxes | `components/placeholder-section` holds their place (Balázs, 2026-09-07: build the layout as designed even if the function is not there yet), but **nothing renders it**: the cart template draws the items, the two notices, the sign-in prompt and the summary only. The boxes are absent, not empty. The prices are live data (below) |
| 3b stock-change state ("KÉSZLET VÁLTOZÁS": "Utánpótlás úton", "Raktáron helyette", "Értesíts, ha megjött", "nincs beszámítva") | until the stock-take, zero stock does not mean sold out (card 193926e2), so "an item ran out" cannot be decided; no replacement rule and no restock date exist |
| 3b "A szállítás újra nyitva" | its premise is gone (above) |
| Loyalty bar ("+3 930 hűségpont jár erre a rendelésre") | there is no loyalty data in the storefront (only the account menu's points) |
| Empty cart: "Legutóbb megnézted" (recently viewed) | needs browser-side history; a cookie and consent question, Balázs's |

## What the test Medusa answers for the delivery box (measured 2026-11-16, read-only store API, no address on the cart)

Two throw-away test carts were created for this (`cart_01M7JE94KJ158JWA2WDYTZTA68`, technical; `cart_01M7JE95M5QQ86EF48R3E7724F`, live animal);
nothing was ordered.

| Cart | `GET /store/shipping-options` | `GET /store/shipping-class` |
| --- | --- | --- |
| a technical item | "Bolti átvétel" 0 (flat); "GLS házhozszállítás", "GLS csomagpont", "Foxpost csomagpont" with a CALCULATED price: no amount without an address | `NORMAL` |
| a live animal | only "Bolti átvétel" | `PICKUP_ONLY`, with the triggering line's id in `shipping_class_source` |

So the cart page can show the shop pick-up (0 Ft) and name the carriers, but **cannot show a carrier price before the address step**: only "az ár a cím megadása után látszik".

## Next pieces, in this order

1. The ÁTVÉTEL and FIZETÉS boxes as INFORMATION (not radio buttons: the choice stays in the checkout, where the address exists): pick-up 0 Ft, the carriers with "price after the address", the Foxpost locker marked when a large item is in the cart; the payment methods from `GET /store/payment-options` (bank card through Stripe, cash on delivery with its fee). Decision still open: Balázs or acrobot to confirm that an informational box is what the design's radio buttons should become.
2. Everything else in "Not built" waits for its data or decision.

Not measured here: the page in a browser (the test shop's basic-auth credentials are not readable by the fleet agent that wrote this).
