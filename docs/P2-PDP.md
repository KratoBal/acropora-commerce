# P2: the technical product page (1b)

Scope: P2, the third item: the technical (Commerce) product page. The handoff (`262:3`, section 2) marks as CANONICAL:
- **`192:57` Lighting PDP / Desktop — 1b Hybrid**;
- **`196:3` Lighting PDP / Mobile — 1b**.

Stage only. The page is built in three small PRs:
- **3a-1**: colours, font, the heading line and the price (this document, first section);
- **3a-2**: the 16:10 image with a separate thumbnail row;
- **3a-3**: the tab bar;

then 3b ("Ami még kellhet hozzá" and the bottom summary bar) and 3c (mobile).

## Starting point

The product page frame (`LapVaz`) already follows an earlier 1b design: a 856 px left column, a 452 px purchase rail, and the same sections as `192:57`:
- heading, photo, sizing helper, tabs;
- price, availability, variant picker, quantity, bundle, "Kérdezd minket";
- accessories, similar products, sticky bar.

It paints itself from the old `--terv-*` tokens (Space Grotesk, the old warm palette). The dark (2a) world uses the same frame and is P3, so it must not change here.

## 3a-1: colours, font, heading, price

- **Colours and font:** a `[data-vilag="vilagos"]` block in `acropora-tokens.css` points the old `--terv-*` tokens at the Foundations primitives and the Hanken font. It overrides exactly the tokens the dark block in `globals.css` overrides; a spec keeps the two sets equal.
  - background: shell;
  - cards: white;
  - border: line;
  - text: ink / slate;
  - "Kosárba": heritage;
  - eyebrow: navy.

  It affects only the product page frame on the light side; every other old page keeps the `:root` values.
- **Heading (`193:66`):** one line above the title, **"MÁRKA · LEVÉLKATEGÓRIA"** (`193:68`), 600/11, 1.4 px tracking, navy.
  - The brand is the product's Medusa collection; the product page now fetches `*collection`.
  - Without a collection, only the category shows.
  - The earlier design's two lines are gone (the SKU, and the whole category chain). The SKU stays on the purchase card ("Bruttó ár · Cikkszám …") and in the eyebrow's `data-cikkszam`.
  - The dark page keeps its category chain, unchanged.
- **Price (`193:125`):** 700 / 36 px, −0.5 px tracking, on the light page only. It uses a `termeklap-ar` hook on `ProductPrice` and a rule in `globals.css`.

## 3a-2: image and thumbnails

On desktop (from `lg`, 1024 px), light page only:

| Element | Figma | Built | Measured |
|---|---|---|---|
| Box around the photo | none (`193:74`) | the photo section's box loses its border and padding | 856 px wide, 0 border, 0 padding |
| Main image | own 1 px border, 856 × 535 | `.termeklap-nagykep`, 1 px line border | 856 × 535, 1 px |
| Thumbnails | 126 × 82, gap 10 (`193:78`–`193:82`) | `.termeklap-belyegsor` with six 126 px columns, `.termeklap-belyeg` at 126:82 | 126 × 83 (the extra pixel is the 2 px active border around the image) |
| Active thumbnail | navy 2 px (`193:78`) | `--termeklap-belyeg-aktiv`, set to navy in the light block; without it the old `--terv-kiemel` stays | navy |

- On mobile the thumbnails stay square; the mobile frame (`196:3`) is 3c.
- The dark (2a) page is unchanged: its photo box keeps the 1 px border and 16 px padding (measured on the coral product page).
- The video thumbnail (`193:83`) is not built: no product has a video.

## 3a-3: the tab bar

`192:57` shows a tab bar above the description (`193:104`): "Leírás" first and active, then Műszaki adatok, Spektrum & PAR, Értékelések and Letöltések. The earlier design put the data tab first, and hid the bar when there was only one tab.

On the light page (the caller passes `valtozat="1b"` when the product is not livestock):
- **Order:** "Leírás" first and active; "Műszaki adatok" (the tables pulled out of the description) second, when there are any.
- **Bar:** shown even with a single tab, 42 px high.
- **Tabs:** 15 px, active 600 in ink with a 2 px underline, inactive 500 in slate, 28 px apart; content 18 px below.
- **Box:** the tabs section has no box on the light page (`vilagosbanKeretNelkul`).
- **Dark page:** keeps the earlier order, the single-tab form and its box (P3).

Measured locally on `radion-xr15-g6-pro-95w`: the bar is 42 px, "Leírás" is 15 px / 600 / 2 px underline, and the section has 0 border and 0 padding. The coral product page is unchanged (1 px border, 16 px padding, no bar).

The other tabs (Spektrum & PAR, Értékelések, Letöltések) have no data; see the table below. The description's content is the old shop's HTML and is not reformatted here.

## 3b: "Ami még kellhet hozzá" and the bottom summary bar

**"Ami még kellhet hozzá" (`193:181`)** is our accessory list (`unas_accessory_ids`).
- Light page: no box. A top rule and 31 px above; the heading 600/22, 18 px above the grid.
- Four columns, 24 px apart. `RelatedProducts` gets `valtozat="1b"` and draws the frame's card (`KapcsolatKartya`): a 320 × 300 image without border, the name 500/14 and the price 400/14 in slate, 10 px apart.
- The shared `ProductPreview` used by other lists is unchanged.
- "Teljes lista →" (`193:184`) is not built: an accessory list has no list page.

**"Hasonló termékek"** is not on the frame, but it has data (similar products, or the category fallback). On the light page it gets the same form, so the two sections read as one system. This is a deviation from `192:57`.

**The bottom summary bar (`193:202`)**, desktop only, as before:
- the content width (1352), white, a 1 px border all round, 20 px padding;
- the price 700/20;
- the second line is the stock line, by the same rule as the category card (`keszletSor`, moved from the card into `stock-state/availability.ts` and shared):
  - "Raktáron – N db" only where the product page's scarcity rule gives a count;
  - otherwise "Rendelhető" or "Nincs raktáron".
- Previously the bar had no second line, because #342 had filled it from the action labels ("Kosárba" next to "Kosárba").
- The name keeps "name · SKU"; the frame shows "name · 160 W", a spec value we do not have.
- It is 92 px high against the frame's 88: the 50 px button with 20 px padding and the border.

This also fixes a 3a-1 side effect: the 36 px price rule applied to every price on the light page, the summary bar's too. It is now scoped to the purchase card (`#vaz-ar`).

Measured locally on `nyos-nitrate-minus-1000ml` at 1440 px:
- the section: 1 px top rule, 31 px padding, no side border; heading 22 / 600 / 18 px below;
- card 320 px wide, image 320 × 300;
- the bar: 1352 px wide, white, 1 px border, stock line "Rendelhető", price 20 px;
- the card price: 36 px.

The coral product page is unchanged: full-width bar, no border, dark background. Side by side: fleet share `agents/murena/p2-kepek/pdp-3b-1440-figma-felul.png`.

## 3c: mobile (`196:3`)

On the light page, below `lg` (1024 px):

| Element | Figma | Built |
|---|---|---|
| Breadcrumb | none | hidden |
| Eyebrow (`196:15`) | "BRAND · SKU", heritage, 500/10.5, 1.2 px | the eyebrow has a mobile part and a desktop part (`lg:hidden` / `hidden lg:inline`). The desktop keeps "brand · category", navy, 600/11. |
| Price (`196:18`) | 700/28 | 28 px on mobile, 36 px from `lg` |
| Purchase group (`196:17`–`196:28`) | no card; price, picker and stock on the page ground | the shared purchase panel loses its border, padding and background |
| Tabs (`196:41`) | 14 px, 22 px apart | `text-[14px] lg:text-[15px]`, `gap-[22px] lg:gap-7` |
| Sticky bar (`196:67`) | price 600/16, "Kosárba" 126 × 50 | price 16 / 600; the button at least 126 px |

- **Why the panel rule uses `!important`:** the purchase panel's border, padding and background are inline styles (the frame's shared panel, and older guards pin that form). A normal rule would lose to them. The rule's scope is narrow: light page, below `lg`, one marker.
- **Deviations:**
  - The quantity control and the in-page "Kosárba" stay on mobile. The frame has only the sticky bar, but the minimum-order and step rules live in that control.
  - The spec rows (`196:54`) have no structured data.
  - "Csomaggal −8%" in the sticky bar (`196:69`) has no bundle behind it.
  - The sizing helper (`196:35`) is not built.

Measured locally on `nyos-nitrate-minus-1000ml`:
- 390 px: breadcrumb hidden; panel 0 border, 0 padding, transparent; price 28 px; eyebrow "Nyos · 4260246927295" in heritage; sticky price 16 px; button 126 px; tab 14 px; no horizontal scroll.
- 1440 px: unchanged (panel 1 px / 24 px / white, price 36, tab 15).
- The coral product page at 390 px is unchanged.

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/pdp-3c-390-figma-balra.png`.

### Left out (no data or no feature), for the whole 1b page

| Frame element | Why |
|---|---|
| "Összehasonlítás · Kedvencekhez" (`193:70`) | no feature |
| Méretezés-segéd (`193:85`) | no feature; hidden in production, as before |
| Csomagajánlat (`193:150`) | no bundle data; hidden in production, as before |
| "Legalacsonyabb ár az elmúlt 30 napban" | no price history. This is the Omnibus rule for sale prices, and Balázs decides it before the shop goes live. |
| "Szállítás 1–2 munkanap" | no data behind the claim |
| "Méret" variant picker (`193:136`) | kept, but no product on stage has more than one variant (0 of 1492) |
| Tabs other than Leírás (`193:109`–`193:116`) | no structured specs, spectrum, reviews or downloads |

## Measured

Measured on 2026-09-29 locally with `next dev` against the stage backend, at 1440 px, on `radion-xr15-g6-pro-95w`. The eyebrow, title, price and the purchase card colours now follow `192:57`. Side by side: fleet share `agents/murena/p2-kepek/pdp-3a1-1440-figma-felul.png`.
