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

