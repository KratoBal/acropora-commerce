# P2: search (4)

Scope: P2, the fourth item: search, in three states. The handoff (`262:3`) marks as CANONICAL:
- **`152:3`** the quick search layer (desktop);
- **`152:88`** Search / Results / Desktop;
- **`253:57`** Search / No results / Desktop;
- **`254:3`, `254:50`, `254:107`** the mobile frames.

Stage only. Built in small PRs:
- **4a**: the results page (this document, first section);
- **4b**: the no-results page (`253:57`);
- **4c**: mobile (`254:*`).

## Starting point

Search already works on `/store?q=`:
- the backend endpoint `/store/termek-kereses` folds Hungarian accents on both sides and returns only product ids;
- it returns at most 200, newest first (`ORDER BY created_at DESC`), and says when it cut the list (`csonkolt`);
- the store page fetched the products through the shared paginated list, under the title "Keresés: …".

## 4a: the results page (`152:88`)

When there is a query, the store page now renders `KeresesLap` (`modules/store/templates/kereses/kereses-lap.tsx`). Without a query, the "Minden termék" page is unchanged. The shared paginated list no longer takes a query.

| Element | Figma | Built |
|---|---|---|
| Eyebrow and title (`152:108`) | "KERESÉS" heritage 500/12, 1.8 px; "Találatok" 300/46, −1 px | same; 34 px below `small` |
| Search field (`152:111`) | 1328 × 64, slate border, heritage magnifier, 18 px | same; a GET form to `/store`, pre-filled with the query |
| Count line (`152:115`) | "Ezt kerested? Radion · 14 találat" | "N találat erre: „…”" (no spelling suggestion, see below) |
| Cut-off line | none | from #379: one sentence when the endpoint cut the list, with the number from the response |
| Category pills (`152:119`) | 40 px, 12 px padding; active heritage, 500/14 white; others white with a line border | same. The pills are the results' **root categories** with counts; "Összes" first. Hidden when the results have only one root. |
| Filter column (`152:131`) | 240, white, border, 16 px padding: Szűrés, Típus, Márka, Készlet, Ár | 240, white, border, 16 px padding: Szűrés and **Márka** only (the category page's `MarkaLista`, moved into its own file and shared) |
| Group heading (`152:189`) | "Technikai termékek" 300/28, "9 találat" on the right | the selected root's name, or "Minden találat"; the count on the right, next to the existing sort control |
| Cards (`152:192`) | three columns | the category page's `CommerceTermekKartya`, three columns from `medium` |
| Paging | none on the frame | "18 / N találat" and "További találatok", as on the category page |

**Where the counts come from:** Medusa gives no facet counts. The page fetches the result ids' categories and collections (100 per request, at most two requests for the 200 ids) and counts from those:
- a product counts each root once;
- the brand list counts within the selected root, independent of the selected brands;
- the filters keep the search order; an id we could not classify drops out of a filtered view.

**Stage roots:** the shop's technical root is called "Termékek". The frame's "Technika" pill is that root here, under its real name.

**Empty sets:** the zero-result decision still goes through `keresesSzuro`. An empty id set never reaches the product query, because Medusa could ignore it and return the whole catalogue. With zero results the no-results page (4b) stands; with filters that leave nothing, the results page says so and keeps the filters to undo.

### #375 and #379, absorbed

- **#379** (the cut-off line): the sentence is here, in the page header, with the same text and the number from the response. "legújabb" is true: the endpoint orders by `created_at DESC`.
- **#375** (the accent folding's header comment): included, and re-measured on 2026-09-29 through the stage store API (published products, not the whole database):
  - 1492 products, 1095 with Hungarian accents;
  - 2 with another Latin letter, both "Ø" as a diameter sign;
  - `subtitle` empty everywhere.

  The re-measurement is written next to the original numbers in the comment.

### Left out (no data or no feature)

| Frame element | Why |
|---|---|
| The quick search layer (`152:3`) | "Fedezd fel" (featured products) and "Népszerű most" (popular searches) need curated data that does not exist. Only "Gyors ugrás" could be built, and a half-empty layer is worse than the working field. The header's GET form stays. |
| "Ezt kerested? Radion" | no spelling suggestion |
| "Legjobb találat" card (`152:175`) | no relevance score; the first result is the newest, not the best, so we do not call it that |
| Típus filter (Termék / Tudástár / Korall) | no knowledge base in the shop |
| Készlet and Ár filters | not in 4a. Stock is not a filterable field in the store API, and a price filter needs the region price on every result. |
| Tudástár group (`152:245`) | no knowledge base |
| Összehasonlítás, favourite (`152:195`) | no feature |
| `⌘K` hint in the field | no keyboard shortcut |

## Measured

Measured on 2026-09-29 locally with `next dev` against the stage backend:
- **1440 px, `q=led`:**
  - title 46 / 300; field 1328 × 64;
  - the list was cut off, so the cut-off sentence shows with 200;
  - pills "Összes · Termékek · 134 · Halak · 57 · Gerinctelenek · 7";
  - filter column 240; 18 cards; "18 / 200 találat" and the next-page link.
- **Filters, by clicking:**
  - "Termékek": 134 results;
  - plus the first brand: 14;
  - a new search from the field ("lehabzo", no accent): 65 results, filters cleared.
- **Zero results:** the query "zzzzqqqqxxxx" gives no product query (the page itself is 4b).
- **390 px:** no horizontal scroll. The mobile frames are 4c.
- **`/store` without a query:** unchanged ("Minden termék").

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/kereses-4a-1440-figma-balra.png`.

## 4b: no results (`253:57`)

When the search endpoint returns zero results, the store page renders `NincsTalalatLap` (`modules/store/templates/kereses/nincs-talalat-lap.tsx`) instead of the results page. A results page emptied by filters is not this state: there the filters can be undone, so it stays on the results page with one sentence.

| Element | Figma | Built |
|---|---|---|
| Eyebrow and title (`253:73`, `253:74`) | "KERESÉS" 600/10.5, 1.2 px; "Nincs találat" 600/38 | same; the title is 30 px below `small` |
| Search field (`253:75`) | 1328 × 54, white, line border, 15 px | same, pre-filled with the query |
| Empty-state box (`253:78`) | white, border, 28 px padding, 300 high | same, with its height from the content (238 px) instead of a fixed 300 |
| "Nem találtunk ilyet" and the advice (`253:79`, `253:80`) | 600/26; the advice sentence in slate | same text. The sentence is measured true: the endpoint searches name, description and SKU, and on 2026-09-29 "Triton" (a brand) gave 76, "Amphiprion" (a scientific name) 13, and a SKU 1. |
| Search tips (`253:81`) | ReefLED, Acropora, Bohóchal, KH teszt, MP40 | the same five words, as search links. Measured on stage on 2026-09-29: 1, 69, 17, 58 and 4 results. The constant's header says to remove a word that ever returns zero. |
| "Segítség a kereséshez" (`253:92`) | 280 × 44, heritage border | same; it goes to the Hamarosan page (`szakerto`), like the header's expert button |
| "Népszerű kategóriák" (`253:94`) | four curated cards: WYSIWYG korallok, Tengeri halak, Világítás, Víztesztek, with a curated subtitle | **"Kategóriák"**, see below |

**The categories:**
- The cards are the header menu's items that have a page, in the menu's order: Korallok, Halak, Gerinctelenek, Vízkezelés. Technika, Tudástár, Szolgáltatások and Akváriumaim go to Hamarosan, so they get no card.
- The subtitle is the item's product count for the whole subtree. For the roots it comes from the header's existing counts; for Vízkezelés (a subcategory) it takes one `limit: 1` request. If the count fails, the card shows no number rather than zero.
- The title is "Kategóriák", not "Népszerű kategóriák": there is no popularity data behind "népszerű".
- The frame's subtitles ("Egyedi példányok", "Tartási adatokkal") are copy we have no source for.

**Measured** locally against stage on 2026-09-29:
- **1440 px, `q=xyzzypump123`:**
  - title 38 / 600; field 1328 × 54; box 1328 wide;
  - the five tips; the help button 280 × 44;
  - four cards 110 high: Korallok 8, Halak 125, Gerinctelenek 28, Vízkezelés 128.
- **Links:** the ReefLED tip, the Vízkezelés card and the help button each answer 200.
- **390 px:** no horizontal scroll (mobile is 4c).
- **`q=led` with filters that leave nothing:** stays on the results page.

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/kereses-4b-1440-figma-balra.png`.

## 4c: mobile (`254:50`, `254:107`)

Below `small` (1024 px), on both search pages. The quick search layer's mobile frame (`254:3`) is left out, like `152:3`.

**Results (`254:50`):**

| Element | Figma | Built |
|---|---|---|
| Eyebrow | none | hidden below `small` |
| Title (`254:59`) | "Találatok" 600/26 | same; 300/46 from `small` |
| Search field (`254:60`) | 354 × 48, white, line border, 14 px, 17 px magnifier | same |
| Count line (`254:63`) | 12.5 px | same, and the cut-off sentence too |
| Pills (`254:64`) | 28 high, 9 px padding, 500/10.5, "Technika 9" without the dot | same; the dot shows only from `small` |
| Filter row (`254:73`) | "Szűrők 2" and "Ajánlott sorrend", 173 × 42 each | "Szűrők N" (N = the active root and brands; no number when none) opens a native `<details>` panel over the grid with the same content as the desktop column. Next to it is the existing sort control (our options, 42 high). |
| Group heading (`254:83`) | 600/18 | same, with the count on the right |
| Grid (`254:84`) | two columns, 170 px cards, 14 px gap | two columns, 14 px gap. The Commerce card gets a `tomor` (compact) switch that applies only below `small`: a 100 px image, a 13/600 name, a 15/700 price, an 11.2 px stock line and a 36 px button. |

- **The card switch** is on only for search. The category page keeps its one-column mobile card. Measured the same before and after at 390 and 1440 px: 358 × 452 and 337 × 472.
- **The desktop search card** is unchanged: 340 × 472.
- **Deviation:** the compact card keeps the stock line and the "Kosárba" / "Részletek" button. The frame's card (`254:87`) has neither, but they are the card's function.

**No results (`254:107`):**

| Element | Figma | Built |
|---|---|---|
| Title and field (`254:116`, `254:117`) | 600/26; the field 48 high, 14 px | same; no eyebrow |
| Box (`254:120`) | 14 px padding, left-aligned; the title 600/18; the advice 12.5 px; tips 27 high, 500/11.5 | same. All five tips show, wrapping; the frame shows three. |
| "Segítség a kereséshez" | not in the mobile frame | hidden below `small` |
| Categories (`254:130`) | a list: "KATEGÓRIA" 600/9.5 heritage, the name 600/13.5, "Megnyitás" 11.8 | the same list; the third line is the product count ("8 termék") instead of "Megnyitás" |

**Measured** locally against stage at 390 px on 2026-09-29:
- **`q=led`:**
  - title 26 / 600; field 358 × 48; pills 28 high, "Termékek 134";
  - the filter button 175 × 42; the desktop column hidden;
  - cards 172 × 268 in two columns;
  - no horizontal scroll.
- **The filter panel:** opens 358 wide with 14 links. Choosing a brand gives `?q=led&marka=…` and the button reads "Szűrők 1".
- **`q=xyzzypump123`:**
  - title 26; box 358 × 136; help button hidden;
  - the first category row 69 high: "KATEGÓRIA / Korallok / 8 termék".

Figma and ours, alternating (results, then no results): fleet share `agents/murena/p2-kepek/kereses-4c-390-figma-balra.png`.
