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
  - the "Kosárba" button (see deviation 1).
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

## The lighting variant (`162:84`)

The handoff also marks **`162:84` Lighting Category / Desktop — Hybrid** as CANONICAL. It is the same template.

The one difference that can be built from data is the quick bar. On a subcategory the frame shows the **sibling** categories, with the current one highlighted and no "Összes" (`162:117`). Without this, a category with no children of its own would show only "Összes", a dead end.

- A category with children shows "Összes" and its children, as before.
- A category without children shows its siblings: one `parent_category_id` request, the current one highlighted (`aria-current`), and empty siblings left out. The current one stays even when it is empty, because the visitor has just arrived there.
- If the sibling request fails, the bar falls back to "Összes".
- The filter column has no Kategória section on such a page; the frame has none either.

The frame's other filters have no data behind them, or cannot be served by the store API:
- Akvárium hossza, Korallállomány and Elérhetőség have no such data;
- Ár cannot be served: the Medusa store API cannot filter by price band, and even price sorting reads every page today.

The Márka filter is described in the next section.

## The Márka filter (`117:108`)

A brand is the product's Medusa collection; on stage all 65 collections are brand names.

- **Counts:** the Medusa store API has no facet counts, so the page reads the collection of **every** product in the category, with a narrow field list (`id,collection.id,collection.title`) and 100 per page. The pages after the first are fetched in parallel and go through the product list's cache.
  - Measured on 2026-09-29 on the Termékek branch (1278 products, 13 pages): 1.98 s one after the other, from the container.
  - In `next dev`, a cached page loaded in 0.46 s.
  - At most 30 pages (3000 products) are read, as a guard.
- **List:** brands with their product counts, most first. Products without a brand give no row. The first 8 are shown; the rest open in a native `<details>` ("További N márka") that works without JavaScript. On Termékek there are 47 brands.
- **Filter:** the selection is in the URL (`?marka=<collection id>`, may repeat), so it can be shared and is rendered on the server.
  - The product list is queried with `collection_id`.
  - Sort, option filters and page links keep the selection.
  - Changing a brand goes back to page 1.
- **Active filters** (`117:197`): each selected brand as a navy chip ("Fauna Marin ×"); clicking it removes that brand. "Törlés" clears everything.
- **Counts are per category, not cross-filtered:** a brand's number does not change when another brand is selected. The Kategória links lead to another category and do not carry the brand, because the brands there are different.
- If reading the brands fails, the page still renders, without the Márka section.

Checked live against the stage backend: selecting Fauna Marin on Termékek gives 109 products, every card on the page shows Fauna Marin, the chip appears, and the next-page link keeps the brand.

## Left out, and why

The catalogue was measured on stage on 2026-09-29: 1492 products, 219 categories and 65 collections.

| Frame element | Why it is not built |
|---|---|
| Eyebrow "TECHNIKA · TERVEZHETŐ RENDSZER" and the intro text | no category has a description (0 of 219) |
| "Nem tudod, mi illik a rendszeredhez? / Rendszerem beállítása" | no feature behind it |
| Akváriumméret, Felhasználás filters | no such field, tag, type or metadata |
| Készlet filter | until the stock-take, zero stock does not mean sold out, so "Azonnal vihető" would be wrong |
| Card: technical line ("SPS / LPS · 95 W") | metadata holds only `unas_*` fields |
| Card: "AJÁNLOTT", "ÚJ" | no data or rule behind them |
| Card: favourite (♡), compare (⇄); the compare helper | no feature behind them |
| "Ajánlott sorrend" | no curated order exists; the default is "Legújabbak" |

## Deviations

1. **"Kosárba" really adds to the cart only where that is safe** (acrobot's decision, 2026-09-29 09:02). For a single-variant, purchasable product the button calls the product page's own cart action (`addToCart`). The quantity is the product's minimum order quantity, which is where the product page's counter starts. The button reports "Kosárba került" or "Nem sikerült, próbáld újra". In every other case the button is "Részletek" and opens the product page:
   - more than one variant;
   - not purchasable;
   - the order maximum, or the managed stock without backorder, is below the minimum.
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
