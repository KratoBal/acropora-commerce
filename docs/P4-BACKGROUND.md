# P4: the checkout background

Balázs allowed the P4 **background** on 2026-09-29 15:32 UTC: several shipping groups in one cart (live animals collected in person, equipment by courier), SimplePay, and the pickup-point picker. Scope is the test storefront and the stage backend only. Redrawing the cart and checkout screens is **not** part of it; that waits for his separate word, and so does P3.

The plan splits it into four PRs:

| PR | What | Waits on |
|---|---|---|
| P4-1 | pickup-point search, and the chosen point sent with the shipping method | nothing |
| P4-2 | several shipping groups in one order | the free-shipping threshold with two groups (Balázs) |
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
