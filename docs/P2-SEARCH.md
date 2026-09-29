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

**Empty sets:** the zero-result decision still goes through `keresesSzuro`. An empty id set never reaches the product query, because Medusa could ignore it and return the whole catalogue. With zero results the sentence names the query; with filters that leave nothing, it says so.

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
- **Zero results:** the query "zzzzqqqqxxxx" gives the sentence and no product query.
- **390 px:** no horizontal scroll. The mobile frames are 4c.
- **`/store` without a query:** unchanged ("Minden termék").

Figma on the left, ours on the right: fleet share `agents/murena/p2-kepek/kereses-4a-1440-figma-balra.png`.
