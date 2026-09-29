# P5: what is left out, and why

The P5 counterpart of `P2-LEFT-OUT.md`, grouped the same way: by what is missing. It is updated with every P5 PR. Measured on 2026-09-29.

## Features that need email

The backend has no notification module: `medusa-config.ts` lists none, so no email can be sent.

| Frame element | Node | Why |
|---|---|---|
| Password reset screen | `256:75`, `256:151` | Medusa's reset route exists, but its token has to reach the customer by email. The screen would promise "küldünk linket" and nothing would be sent. |
| "Elfelejtett jelszó" link on sign-in | `256:32`, `256:120` | it leads to the screen above |
| Settings: notifications ("Rendelési és szállítási értesítések", "Marketing e-mailek") | `257:159` | no emails exist, and no data model stores the choices |

When the email provider is decided, these three come together. The order-status emails (five statuses, Visszaigazolva included) are on kanban card `ef84489d`.

## Features that do not exist

| Frame element | Node | Why |
|---|---|---|
| "Emlékezz rám" | `256:31`, `256:119` | the session length is not adjustable on today's auth cookie |
| "Hűségpontok" (menu item) | `249:3`, `257:3` | no loyalty data |

## Screens without a frame

| Screen | Why |
|---|---|
| The add/edit address dialog | no CANONICAL frame. The existing dialog stays, with the address name and the default checkbox added (P5-ACCOUNT, 3). |

## Orders (4a), measured

| Frame element | Node | Why |
|---|---|---|
| Fulfillment groups on the order card | `249:46`, `249:224` | P4 background (several fulfillment groups per order) |
| "Számla" button | `249:68` | no invoice data |
| "SimplePay" in the meta line | `249:45` | the payment method is P4; the line shows the payment status |
| "ACR-2026-…" order number | `249:40` | Medusa's display id ("#12") |
| The desktop head sentence about groups and live animals | `249:20` | it promises P4 features; the mobile sentence is used |

## Built differently, on purpose

- **Two name fields at registration** (Vezetéknév, Keresztnév) instead of one "Név". The Medusa customer and invoices keep them apart. (P5-ACCOUNT, 1)
- **Auth mobile header:** the frame has its own (back arrow and logo); the P1b header stays. (P5-ACCOUNT, 1)
- **Two name fields on the profile** too, and the **email is read-only**: the store API does not update it. (P5-ACCOUNT, 2)
- **The mobile account tabs include Rendeléseim**, which the frame's tab row leaves out. (P5-ACCOUNT, 2)
- **Kijelentkezés** is added under the menu; the frame has no sign-out. (P5-ACCOUNT, 2)

## Still to be measured with their PRs

These come from the P5 inventory and are confirmed or corrected when their screen is built:
- **Order details (4b):** parcel tracking and invoice download have no data. The fulfillment groups are P4.
- **Billing:** the tax number goes into the billing address's metadata under one documented key, `tax_id`, checked against the Hungarian 8-1-2 form (acrobot, 2026-09-29).
- **Settings, password change:** there is no store route for a signed-in customer; it needs its own backend route.
