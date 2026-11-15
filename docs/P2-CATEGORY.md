# P2: the Commerce category page

> **Status, 2026-11-15.** This document was written for the technical (Commerce) categories on 2026-09-29. Since then the
> same page also draws the live-animal branch (coral, fish, invertebrate; 2026-11-01), carries the husbandry filter (V2.2 S5,
> 2026-11-10) and is the frame of the other list pages. The sections "The live-animal variant", "The husbandry filter" and
> "Measured on the test storefront" below describe that; the sections written in September are kept as they were, except
> "Which pages", which no longer held.

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

**Every category page** takes this template, technical and live-animal alike. `categoryPageKind` (`category-page-data.ts`) decides
between `technical` and `livestock` from the three livestock roots (Korallok, Halak, Gerinctelenek) of the product page's world
(`ELO_ALLAT_GYOKEREK`); `kind` changes the card, adds the pickup note and enables the husbandry filter (see below). The September
plan kept the live-animal branch on the old template as "P3"; it moved over on 2026-11-01 (#623) and the old template, its token set
and its 12-item pager are gone.

The same list frame (`ListaLap`, `commerce/lista-lap.tsx`) also renders the all-products list (`/store`), the brand page (a Medusa
collection) and the curated selection page, so a change to the frame reaches all of them; the category page only supplies its data.

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

## The live-animal variant (`kind = "livestock"`)

The same frame, with three differences:

- **The card** is `EloAllatKartya`, not the technical card. The badge on the photo says "Sold" (a unique piece that is gone), "1 pc · Unique piece" or "{n} left" at exactly two pieces; the subtitle is the Latin name in italics, not a brand line; there is no quick add to cart, because a live animal is bought on its page, where the pickup promise is. The button is "Details", or "Find a similar one" for a sold piece. A sold piece stays on the list, dimmed, with the price struck through.
- **The pickup note** ("ÉLŐ ÁLLAT / Személyes átvétel") sits under the title.
- **On a phone** the list is two columns with a compact card (one column of square cards is about 5000 px for eight animals). A list that mixes both worlds (all products) keeps one column and the technical sizes (`tomor = false`).

The header's mode (`data-acr-mod`, from the path of names) is read by the header only; the body does not depend on it.

Texts are keys in the i18n dictionary (`hu`, `en`); the page's language is its path segment's (`hu`, `en-hu`).

## The husbandry filter (V2.2 S5)

Card d2fc06e7, merged 2026-11-10 and 2026-11-11 (#730, #736, #740, #743). Only the live-animal branch has it; the technical page does not read it.

- **Facts:** the product's `metadata.husbandry`, a JSON string the OS projects (only live animals, only verified blocks). The filter reads three of its facts: difficulty, "kept with corals" and the minimum tank. The Store API cannot filter on a metadata key, so the shop counts the matches next to the database (`GET /store/husbandry-filter?category_id=...`) and returns the matching product ids and the facet counts. The page hands the ids to `/store/products` as its `id` filter, next to brand, option and sort.
- **In the filter column:** up to three sections, "Tartási nehézség", "Korallos akváriumban tartható" and "Minimális medence" (three bands: 0-100, 101-300, 301- litres, a proposal that is not yet a decision). A section appears only when the category has an animal it fits; the number is the facet count.
- **In the address:** `?nehezseg=KONNYU&korallos=1&medence=101-300`, so a selection can be shared and is rendered on the server. Brand, sort and paging keep it.
- **Nothing is dropped silently:** an animal whose block lacks the fact ("ellenőrzés alatt") is not in the filtered list, but its number is shown above the list with a link to the list without the filter. If the shop does not answer, or the category is too large for the answer (`complete: false`), there is no husbandry section and an active filter is replaced by one sentence. More than 300 matching ids (`AZONOSITO_HATAR`; the address length is limited) and the filter does not apply, and one sentence says so.
- **No data, no section:** with no animal that carries the facts, the filter column shows none of the three sections. That is the intended behaviour, not a failure.
- **On a phone** the filter box is collapsed behind a button (it works without JavaScript: a checkbox label); it opens by itself when a brand or husbandry value is active. The Kategória section is hidden on a phone, as before.

The product page's "Tartási adatok" block is a separate piece (`husbandry*` keys, product page) and is not described here.

## Measured on the test storefront (2026-11-15)

Four pages at 1440 and 390 px, read-only (`agents/murena/meres/kategoria-lap-meres`, run with the test shop's basic-auth credentials):

| Page | HTTP | Cards on page 1 | Notes |
|---|---|---|---|
| Halak | 200 | 18 of 126 | quick bar with child categories, "További termékek betöltése" |
| Korallok | 200 | 8 of 8 | one child ("WYSIWYG") in the quick bar, no paging |
| Gerinctelenek | 200 | 18 | "További termékek betöltése" |
| Koralltápok (technical) | 200 | 18 | the technical card |

One H1 on every page. No husbandry word (difficulty, tank) appeared on any page, because of the data below.

The husbandry filter's data on the test Medusa, the same day: `GET /store/husbandry-filter` answers `complete: true` with zero in every band for Halak, Korallok and Gerinctelenek. 12 of the 161 live animals carry a `husbandry` block (8 fish, 4 corals, 0 invertebrates); those blocks hold feeding, light, flow and similar facts, and none holds difficulty, "kept with corals" or a minimum tank. So the filter is built and answers, but shows nothing until those three facts reach the products. They are in a draft that waits for the owner's decisions; the numbers above are the state of that day.

The measurement script reports the requests the browser aborted (`requestfailed`); on all four pages these were the page's own address and the header's cart and account links. They come from the router's prefetch being cancelled when the page settles, not from the category page; the script does not record the failure text, so this reading is an inference, not a measurement.

## Left out, and why

The catalogue was measured on stage on 2026-09-29: 1492 products, 219 categories and 65 collections. The table is the September state for the technical page; the last row is added on 2026-11-15.

| Frame element | Why it is not built |
|---|---|
| Eyebrow "TECHNIKA · TERVEZHETŐ RENDSZER" and the intro text | no category has a description (0 of 219) |
| "Nem tudod, mi illik a rendszeredhez? / Rendszerem beállítása" | no feature behind it |
| Akváriumméret, Felhasználás filters | no such field, tag, type or metadata |
| Készlet filter | until the stock-take, zero stock does not mean sold out, so "Azonnal vihető" would be wrong |
| Card: technical line ("SPS / LPS · 95 W") | metadata holds only `unas_*` fields |
| Card: "AJÁNLOTT", "ÚJ" | no data or rule behind them |
| Card: favourite (♡), compare (⇄); the compare helper | no feature behind them |
| Live-animal card: a husbandry summary (difficulty, tank) | the card shows no facts from `metadata.husbandry` yet; the data for difficulty and tank is not on the products (see the measurement above) |
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
