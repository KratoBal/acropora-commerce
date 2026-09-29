# P4: found ahead of time, to be handled with the checkout

P4 (cart, details, payment, success) has not started. These findings came up during P5 and belong to P4. They are written down here so they are not found again from scratch.

## The order confirmation page promises an email that is never sent

Measured on stage on 2026-09-29, after the first storefront order (`order_01M3PMCXWK4B0CW80EJA11AMZE`). The confirmation page says:

> A rendelés visszaigazolását elküldtük ide: …

The backend has no notification module (`medusa-config.ts` lists none), so no email is sent. The sentence is false today. With the P4 success page, either the sentence changes or the email provider is decided (the same decision blocks the P5 password reset, see `P5-LEFT-OUT.md`).

## Store checkout needs every product in a shipping profile

Measured on stage on 2026-09-29 by acrobot through the admin API: all 1502 stage products had no shipping profile. The only profile is Default (`sp_01M0JZ32YDMM09RJR7Y15KW18F`), and all four shipping options sit on it.
- **Effect:** completing a cart fails with "The cart items require shipping profiles that are not satisfied by the current shipping methods".
- **Workaround for the test order:** one product (Aquavital Perlonvatta 100g) was linked to Default by hand.
- **Real fix:** the catalogue projection must set the profile. That is the frozen catalogue-migration area and goes to Balázs.

## GLS pickup points

"GLS csomagpont" and "GLS nehézáru csomagpont" exist only as shipping option names (`shipping-option-roles.ts`). There is no GLS point directory and no check of a chosen point. Building one needs the official GLS ParcelShop documentation; nothing is written from memory.

