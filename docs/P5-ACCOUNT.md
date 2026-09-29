# P5: sign-in, registration and the account

Scope: P5 (Balázs, 2026-09-29 11:14 UTC: "Jojjon a P5"). It covers:
- sign-in, registration, password reset;
- orders, order details;
- profile, addresses, billing, settings.

Stage only. The homepage still waits ("A kezdolap meg varjon").

The handoff (`262:3`) marks a CANONICAL desktop and mobile frame for every screen:
- **Auth:** `256:3` / `256:36` / `256:75`; mobile `256:103` / `256:124` / `256:151`.
- **Orders:** `249:3` / `249:96`; mobile `249:204` / `249:252`.
- **Account:** `257:3` / `257:51` / `257:102` / `257:159`; mobile `257:212` / `257:242` / `257:269` / `257:304`.

The prerequisite, the seventh order status (Visszaigazolva), is in #409. What was left out, and why: `P5-LEFT-OUT.md`.

## 1. Sign-in and registration (`256:3`, `256:36`; mobile `256:103`, `256:124`)

The flow is the existing one: the `/account` page with the `@login` slot, the email/password provider, and the email-verification detour. What changed is the look, the registration fields, the ÁSZF record and the error text.

| Element | Figma | Built |
|---|---|---|
| Page | the auth area on the shell background; desktop: a white 500 px card with a border, 36/40 px padding, 14 px gaps | same. On mobile there is no card (the frame has none). Signed out, the page is no longer wrapped in the account frame (side menu, "Kérdésed van?" band). |
| Eyebrow, title, text (`256:19`–`256:21`) | "FIÓK" 600/10.5 heritage; the title 600/30 (mobile 26); the text 13.5 (mobile 13) in a 40 px box | same; no eyebrow on mobile |
| Fields (`256:22`) | label 12.5 slate; input 48 (mobile 46) high, shell background, line border, 14 px | same |
| Button (`256:33`) | heritage, 50 (mobile 48) high, 600/14.5 | same |
| Bottom line (`256:35`) | "Nincs még fiókod? Regisztráció", all slate | same; the action word is underlined because it is a button |
| Registration fields (`256:55`–`256:67`) | Név, E-mail, Jelszó, Jelszó újra | **Vezetéknév and Keresztnév instead of one Név field** (see below), then E-mail, Jelszó, Jelszó újra |
| ÁSZF checkbox (`256:71`) | "☐ Elfogadom az ÁSZF-et és az adatkezelési tájékoztatót." | a real, required checkbox. "ÁSZF-et" and "adatkezelési tájékoztatót" link to the footer's addresses. |

- **Two name fields:** the Medusa customer stores first and last name separately, and invoices need them separately. Splitting one field at a space would be a guess.
- **Phone:** it moved to the profile, as the frame shows it there (`257:3`).
- **Server-side checks** (`regisztracioHiba`): the checkbox, and that the two passwords are equal. The browser's `required` does not stop a direct POST.
- **The ÁSZF record** (acrobot's decision, 2026-09-29 13:26). Registration writes a timestamp and the ÁSZF version into the customer's metadata:

      metadata.aszf_elfogadas = {
        idopont:    "<ISO time of submit>",
        verzio:     "unas-shop-2026-09-29",
        dokumentum: "<the ÁSZF address>"
      }

  It is written when the customer is created. With email verification that happens later, so the record travels in the pending-customer cookie. A customer who already existed gets no new record.
- **The version is our own label**, not the page's date. The new storefront has no ÁSZF of its own yet: the link goes to today's shop, whose page loads its text by script, and the downloaded HTML carries no date (measured 2026-09-29). When the ÁSZF text changes, or the storefront gets its own ÁSZF page (required before go-live, see the footer's list), raise `ASZF_VERZIO` and change the address. Old records keep the old version.
- **Errors in Hungarian** (`authHibaSzoveg`). Until now the server's raw English error reached the customer; measured against stage, a wrong password showed "Error: Invalid email or password". Now:
  - a wrong email or password gives "Hibás e-mail-cím vagy jelszó.";
  - an existing account sends the customer to sign in;
  - anything else gets a general sentence, and the raw text is not shown.
- **Error colour:** the Foundations palette has none, so the message is ink 500 with `role="alert"`. The error state's own look is P6.
- **Left out** (listed in `P5-LEFT-OUT.md`):
  - "Emlékezz rám";
  - "Elfelejtett jelszó";
  - the frame's own mobile header (`256:104`): the P1b header stays.

Measured locally against the stage backend on 2026-09-29:
- **1440 px:** card 500 wide, white, 1 px border; title 30/600; input 418 × 48; button 50 high.
- **390 px:** no card; title 26; input 358 × 46; button 48; no horizontal scroll.
- **A wrong password** shows "Hibás e-mail-cím vagy jelszó.".
- **Not done live:** a registration. It would create a customer on stage. The metadata path is covered by `customer-regisztracio.spec.ts`, with the SDK mocked.
- **Font:** the local dev server cannot download Hanken Grotesk and uses the fallback (the category page does the same); stage loads the real font.

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/p5-auth-1440-figma-balra.png` and `p5-auth-390-figma-balra.png`.

## 2. The account frame and the profile (`257:3`; mobile `257:212`)

**The frame** (`AccountLayout`), for a signed-in customer:

| Element | Figma | Built |
|---|---|---|
| Head (`257:17`) | "FIÓKOM" 600/10.5 heritage, the page title 600/34; 30 px top padding | same; the title comes from the route (`fiokCim`). Mobile: no eyebrow, title 600/25 (`257:218`). |
| Menu (`257:21`) | 244 px column, 46 px rows 2 px apart; active: mist background with a 3 px heritage bar on the LEFT only, 600 ink (`257:22`); others: shell background, no border (stroke weight 0), 400 slate | same |
| Mobile menu (`257:219`) | a row of 28 px tabs, 500/10.5; active: mist and heritage | same, scrolling horizontally |
| Content (`257:34`) | 28 px from the menu | same |

- **Only existing pages get a menu item:** Profil, Rendeléseim, Címek.
  - Számlázási adatok and Beállítások are added by their own PRs (P5 items 5 and 6). A menu item that leads to a missing page is worse than none.
  - Hűségpontok has no data.
  - A test checks that every item has a page.
- **Kijelentkezés** is not on the frame but is an account function. It sits under the menu as text, and at the end of the mobile tab row.
- **The mobile tabs include Rendeléseim.** The frame's tab row (`257:219`) leaves it out, which would leave the orders unreachable from the account on mobile.
- **The old "Kérdésed van?" band is gone:** it is not on the frame, and it led to a customer-service page that does not exist.
- **The account's start page** (`/account`, the existing overview) is titled "Áttekintés". Its place is decided with the orders (item 4): the orders frame (`249:3`) starts its menu with "Áttekintés".

**The profile** (`257:35`): a white card with a border and 20 px padding (on mobile no card, as `257:228`), and one "Mentés" button (`saveProfile`).

| Frame | Built | Why |
|---|---|---|
| one "Név" field | Vezetéknév and Keresztnév | as at registration: the Medusa customer and invoices keep them apart |
| E-mail, editable | E-mail, **read-only**, with the sentence "Az e-mail-cím itt nem módosítható." | the store API's customer update does not take the email (`StoreUpdateCustomer` omits it) |
| Telefonszám | same; an emptied field **clears** the number (`null`) | `undefined` would keep the old number |

- **The billing address** leaves the profile. Its own page, Számlázási adatok, is item 5. Until then it is not editable in the account; checkout still asks for it.
- **Removed**, replaced by the new menu and the profile form: the old account menu and the per-field editors (name, email, phone, and a password editor that was never wired up). The billing editor and its `account-info` wrapper stay until item 5.

Measured locally against stage on 2026-09-29, signed in as the stage test account (`teszt+p5@acropora.hu`, "Teszt P5"; see below):
- **1440 px:** title 34; menu 244 wide, active row 46 high on mist; card 842 wide with a 1 px border; button 180 × 44.
- **390 px:** title 25; tabs Profil / Rendeléseim / Címek; no card; button 358 × 46; no horizontal scroll.
- **Saving:** a phone number saved and read back; emptied, saved and read back empty (cleared).

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/p5-profil-1440-figma-balra.png`, `p5-profil-390-figma-balra.png`.

**The stage test account** (acrobot, 2026-09-29): `teszt+p5@acropora.hu`, "Teszt P5", created through the stage storefront once it ran #411. Read back through the store API, the customer carries `metadata.aszf_elfogadas`, with the version, the submit time and the document address. The account stays for the later P5 items. Its password is kept outside the repo.


## 3. Addresses (`257:51`; mobile `257:242`)

| Element | Figma | Built |
|---|---|---|
| Top row (`257:83`) | "Mentett szállítási címek" 600/20; "Új cím" 120 × 44 heritage on the right | same. Mobile: no heading; "Új cím" full width under the list (`257:267`). |
| Card (`257:87`) | white, border, 18 px padding, 8 px gaps, as wide as its content; the name 600/15 with "ALAPÉRTELMEZETT" 600/9.5 heritage beside it; one address line 13 px slate; "Szerkesztés" heritage, "Törlés" slate | same |
| Mobile card (`257:258`) | 12 px padding, 6 px gaps, as wide as its content; name, address, then the badge, then "Szerkesztés · Törlés" in heritage | same |

- **The card's name** is the Medusa address's own name (`address_name`, "Otthon"). Without one, the recipient's name (last first); without that, "Cím".
- **The line** is "1111 Budapest, Minta utca 12." (postal code and city, then the street lines).
- **The default address** (`is_default_shipping`) comes first and carries the badge.
- **Two new fields** in the add and edit dialogs, because the card needs them and Medusa has the fields:
  - "A cím neve" (an emptied name clears it: `null`);
  - an "Alapértelmezett szállítási cím" checkbox. A hidden `alapertelmezett_mezo` input tells the save that the checkbox was on the form, since an unchecked box sends nothing. A customer's first address is ticked by default.
- **The billing address editor** calls the same save actions without these fields. The actions read them only when the form has them, so that caller keeps its own flags.
- **Errors** from saving an address are Hungarian (`authHibaSzoveg`), not the raw server text.
- **Left out** (no frame): the add/edit dialog has no CANONICAL frame. It stays the existing dialog, with the two new fields added; its look is not redesigned (`P5-LEFT-OUT.md`).

Measured locally against stage on 2026-09-29, signed in as the stage test account, after adding "Otthon" (default) and "Munkahely" through the dialog:

| | Figma | Ours |
|---|---|---|
| "Otthon" card, desktop | 214 × 107 | 215 × 107 |
| "Munkahely" card, desktop | 201 × 107 | 204 × 107 |
| "Új cím", desktop | 120 × 44 | 120 × 44 |
| cards, mobile | 189 × 105, 177 × 87 | 197 × 105, 184 × 87 |
| "Új cím", mobile | y 375, 326 wide | y 375, 358 wide (the page's 16 px gutter) |

No horizontal scroll at 390 px. The two addresses stay on the test account.

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/p5-cimek-1440-figma-balra.png`, `p5-cimek-390-figma-balra.png`.

## 4a. Orders (`249:3`; mobile `249:204`)

The order details page (`249:96`) is its own PR (4b).

| Element | Figma | Built |
|---|---|---|
| Head (`249:17`) | "Rendeléseim" 600/38, and a sentence under it | the account head (600/34, as on `257:3`), with the **mobile frame's** sentence on both: "Aktuális és korábbi rendeléseid egy helyen." (`249:215`) |
| Open order card (`249:38`) | white, border, 20 px padding: number 600/18, status pill (mist, heritage border and text, 600/10.5, 26 high), total 700/20 on the right; "date · payment" 12.5 slate; "Rendelés részletei" 150 × 42 heritage | same |
| Mobile open card (`249:217`) | 14 px padding: number 600/15 with a 24 px pill; short date; total 700/20 on its own line; full-width "Rendelés részletei" 44 high | same |
| "Korábbi rendelések" (`249:70`) | 600/22 (mobile 18), then compact cards (`249:71`): number 600/15, a green-bordered pill, total 700/16; "date · … · megtekintés" | same; the meta line is "date · N tétel · megtekintés" |
| Mobile past order (`249:236`) | 62 high, the whole card a link: number 600/13.5 over the status 11.5 slate, total 500/13.5 on the right | same |

- **The status** is the order's business status from the store route (#410): `GET /store/customers/me/order-business-statuses`. The response shape was measured from its code, not from a message. The label is the shop's Hungarian name (for example "Visszaigazolva").
  - **Open:** everything except the two closed statuses. They sit on top with a heritage pill.
  - **"Megrendelés lezárva":** a green-bordered pill. The green is the frame's own colour; Foundations has none.
  - **"Sikertelenül lezárt rendelés":** a neutral pill (line border, slate). The frame has no such example.
  - **An order without a business status** counts as open and shows no pill. An unknown state is not buried.
  - **If the status route fails,** the page still shows the orders, without pills.
- **Payment:** the meta line shows Medusa's payment status in Hungarian (for example "kifizetve"). The frame's payment method ("SimplePay") is P4.
- **Dates:** Budapest dates: "2026. szeptember 28." on desktop, "2026. 09. 28." on mobile.
- **The order number** is Medusa's display id ("#12"). The frame's "ACR-2026-…" form does not exist.
- **The account start page** (`/account`) now goes to the orders when signed in. The orders frame starts its menu with "Áttekintés" in the orders' place, and the old overview had no frame. The redirect happens inside the streamed page (the response is 200 and the client moves on), so it needs no separate route. Signed out, `/account` still shows sign-in. The old overview, its order list and card are removed.
- **"Rendelés átvétele"** (claiming a guest order, the existing `TransferRequestForm`) is not on the frame. It stays under the list, because it is an account function.
- **Left out:**
  - the fulfillment groups (`249:46`: Foxpost, GLS, pickup, each with its own status) are P4 background;
  - the "Számla" button (`249:68`) has no invoice data;
  - the frame shows no paging; the page reads the last 50 orders.

Measured locally against stage on 2026-09-29, signed in as the test account, which has no orders:
- sign-in lands on `/account/orders`; `/account` moves there too;
- the head shows "Rendeléseim" and the sentence; the menu marks Rendeléseim;
- the empty state reads "Még nincs rendelésed." with a "Vásárlás" link;
- no horizontal scroll at 1440 or 390.

The cards themselves are covered by component tests. A live image of them needs an order on the test account.

## 4b. Order details (`249:96`; mobile `249:252`)

**Its own frame.** The details page has no account menu and no shared head (`249:96` spans the page). `FiokKeret` drops both on `/account/orders/details/…`, and the page draws its own head.

| Element | Figma | Built |
|---|---|---|
| Head (`249:110`) | "RENDELÉSEM" 600/10.5; the number 600/36 (mobile 24) with the status pill; "date · payment method · total · payment status" 14 px | same |
| Mobile payment box (`249:262`) | mist, "Fizetés sikeres" 600/16, "SimplePay · total" | same box: the payment status ("Fizetésre vár") and "method · total" |
| Teljesítés (`249:119`) | white card, 23 px title; per fulfillment group a mist block: group label, pill, method 600/15, items, address or tracking | one block, "SZÁLLÍTÁS": the business status pill, the shipping method, the items, "Szállítási cím: …". Mobile: label, method, status text. |
| Tételek (`249:145`) | rows: name 600/14, "N db" 12.5 slate, price 500/14, line separators | same; the cash-on-delivery fee line is not a product and is not listed here |
| Összesítés (`249:172`) | Termékek, the per-group shipping rows, "Fizetett összeg", "Fizetés" | Termékek, the fee under its own name, the shipping method, then **"Végösszeg"**, or "Fizetett összeg" only when the payment is captured, then "Fizetés" (method · status) |
| Számlázás (`249:193`) | company, address, tax number, "Számla letöltése" | company (or the name), the address line, the tax number when the billing address carries one (`metadata.tax_id`, P5 item 5); no invoice button |
| "Kérdésed van a rendelésről?" (`249:200`) | mist box; mobile: a heritage button (`249:303`) | the same, as `mailto:` the shop address with the order number in the subject. The frame's "we see all three fulfillment groups" is left out. |

- **The status pill** is upper case with 0.5 px letter spacing: the frame's text style (`textCase: UPPER`) on every pill. The list page (4a) had missed it, because my Figma dump printed the characters but not the text case. Fixed here for both pages.
- **Deviation:** a "‹ Rendeléseim" link above the head. The desktop frame has no way back, and without the menu this page would otherwise be a dead end. The mobile frame's own header has a back arrow; the P1b header stays.
- **Deviation:** the items list shows on mobile too. The mobile frame (`249:252`) leaves it out, but it is the order's content.
- **Left out** (`P5-LEFT-OUT.md`):
  - the fulfillment groups (P4);
  - parcel tracking ("A feladás után itt jelenik meg a csomagkövetés");
  - "Számla letöltése".
- **Removed:** the old account order details template and its now unused order summary component.

Measured locally against stage on 2026-09-29, signed in as the test account, on its real order (`order_01M3PMCXWK4B0CW80EJA11AMZE`, #1):
- **1440 px:** no menu; main column 888 and side 412 (Figma 872 / 404). The summary reads "Termékek 1000 Ft · Utánvét kezelési díj 450 Ft · GLS házhozszállítás 3500 Ft · Végösszeg 4950 Ft · Fizetés Utánvét · fizetésre vár".
- **390 px:** the payment box, then Teljesítés, Tételek, Összesítés, Számlázás, the question button; no horizontal scroll.
- **The order has no pill:** it was placed before #415. A new test order after #415's deploy proves the status separately.
- **The 4a list, live with the same order:** the open card "#1 · 2026. 09. 29. · fizetésre vár · 4950 Ft · Rendelés részletei".

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/p5-rendeles-reszlet-1440-figma-balra.png`, `…-reszlet-390-…`, `…-lista-1440-…`, `…-lista-390-…`.
