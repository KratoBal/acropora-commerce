# P2: the Commerce category page

Scope: P2, without the homepage (Balázs, 2026-09-29 06:42 UTC: "A kezdőlapot még ne, a többi jöhet"). This is the first of four P2 PRs:

1. the Commerce category page (this document);
2. the lighting variant;
3. the technical PDP (1b);
4. search, with three states.

Stage only.

## Figma source

The handoff (`262:3`, section 2) marks **`117:30` Equipment Category / Desktop** as CANONICAL. Its sections:

| Section | Node | Built |
|---|---|---|
| Breadcrumb | `117:42` | yes |
| Intro | `117:44` | title only (see "Left out") |
| Quick categories + sort | `117:55` | yes |
| Filters | `117:75` | search and Kategória (see "Left out") |
| Results | `117:196` | yes, with the card below |
| Compare helper | `117:352` | no |
| Load more | `117:359` | yes |

There is no canonical mobile frame for this page; the responsive rules below are ours.

The frame's header (`117:31`, 88 px) is older than the canonical header. The header stays as built in P1b (`215:41`).

## Which pages

Only the **technical (Commerce) categories** get the new page: the Termékek branch and the other light roots. The coral, fish and invertebrate category pages are P3 and stay on the old template. `categoryPageKind` decides, the same function as before.

## What was built

- **Breadcrumb** (`117:42`): uppercase, 14 px, the ancestors as links.
- **Title** (`117:44`): Hanken 300, 58 px, −1 px tracking. The category description is shown if one exists; none does today.
- **Quick categories and sort** (`117:55`), on the `mist` band, 86 px:
  - "Összes" (the current page) in navy, then the child categories as white buttons;
  - the product count, and the sort select.
  - The sort options and labels are the shop's existing ones (Legújabbak, Ár szerint növekvő, Ár szerint csökkenő). Changing the sort goes back to page 1.
- **Filters** (`117:75`), 250 px:
  - "Szűrés", and "Törlés" when a sort or option filter is set;
  - the search box;
  - the Kategória list: every child with its product count, as a link to the child page.
  - A child's count is one count request per child. The shop files a product under its ancestors too, so the direct count is the whole branch.
  - Empty children (count 0) appear neither here nor in the quick bar; on stage that is "biOrb" and "Használt termékek OUTLET áron". A child whose count request failed stays, without a number.
- **Card** (`117:213`):
  - the sale badge "-N%" when the price is a sale price, with the old price struck through (the handoff's rule);
  - image 242 px;
  - brand;
  - name, 700/18;
  - price, 700/24;
  - stock line;
  - the "Kosárba" button.
- **Brand** is the product's Medusa collection. On stage the 65 collections are brand names; 502 of 1492 products have one. Without a collection the brand line is left out, not guessed.
- **Stock line**, by the product page's rule:
  - "Raktáron – N db" only where `scarcityCountOf` gives a count;
  - "Rendelhető" when purchasable without a count;
  - "Nincs raktáron" otherwise.
  - The green dot is the frame's own colour (`#2ea85e`); the Foundations palette has no green.
- **Load more** (`117:359`):
  - Page 1 shows the frame's form, "18 / 1278 termék". Later pages show their range, e.g. "37–40 / 40 termék", because the button opens the next page; it does not append.
  - The link keeps the sort and the option filters.
  - Page size 18, as in the frame.

## Left out, and why

The catalogue was measured on stage on 2026-09-29: 1492 products, 219 categories and 65 collections.

| Frame element | Why it is not built |
|---|---|
| Eyebrow "TECHNIKA · TERVEZHETŐ RENDSZER" and the intro text | no category has a description (0 of 219) |
| "Nem tudod, mi illik a rendszeredhez? / Rendszerem beállítása" | no feature behind it |
| Márka filter | the data exists (collections), but counting brands means reading the whole category; separate small PR with its own measurement |
| Akváriumméret, Felhasználás filters | no such field, tag, type or metadata |
| Készlet filter | until the stock-take, zero stock does not mean sold out, so "Azonnal vihető" would be wrong |
| Card: technical line ("SPS / LPS · 95 W") | metadata holds only `unas_*` fields |
| Card: "AJÁNLOTT", "ÚJ" | no data or rule behind them |
| Card: favourite (♡), compare (⇄); the compare helper | no feature behind them |
| "Ajánlott sorrend" | no curated order exists; the default is "Legújabbak" |
| Active filter chips (`117:197`) | there are no multi-value filters yet to show |

## Deviations

1. **The "Kosárba" button opens the product page**, as the old card's did. Adding to the cart from the list is a separate feature. For a product that is not purchasable, the button says "Részletek" instead of promising a cart.
2. **The filter search box sends to the shop search** (`/store?q=`). Searching inside the category comes with the search PR.
3. **The quick bar scrolls horizontally.** The frame shows 5 children; Termékek has 21 non-empty ones.
4. **Mobile (below `small`)** hides the Kategória section of the filters. The same links are in the scrolling quick bar, and the 21-row list would push the products down.
5. **Grid:** 1 column, 2 from `xsmall` (512 px), 3 from `medium` (1280 px).

## Measured

Measured on 2026-09-29 locally with `next dev` against the stage backend, on `/hu/categories/termékek`, at 1440 px:

| | Figma `117:30` | Ours |
|---|---|---|
| Breadcrumb height | 58 | 58 |
| Quick bar height | 86 | 86 |
| "Összes" button | 93 × 42 | 96 × 42 |
| Filter column width | 250 | 250 |
| Card width | 336.67 | 337 |
| Card image | 242 high | 242 high |
| "Load more" button | 320 × 54 | 320 × 54 |
| Title | 58 px, 300 | 58 px, 300 |

The sort box is 194 px wide instead of 173, because "Ár szerint csökkenő" is longer than "Ajánlott sorrend".

No horizontal page scroll at 390, 1024, 1280 or 1440 px.

A pixel diff is not meaningful for this page: the frame's content is a sample catalogue. The body is compared side by side instead (Figma above, ours below) in the fleet share, `agents/murena/p2-kepek/`.
