# P2: what was left out, in one place

This collects the "left out" and "deviation" lists of the three P2 documents in one place, so they can be read together when P3 is planned:
- `P2-CATEGORY.md`: the category page and the lighting variant;
- `P2-PDP.md`: the technical product page;
- `P2-SEARCH.md`: search, in three states.

Nothing here is new; each row points back to its source. The rows are grouped by **what is missing**, because that decides what would unlock them: product data, curated content, a feature, a store API limit, or a decision.

Catalogue measured on stage on 2026-09-29: 1492 products, 219 categories, 65 collections (all brand names).

## 1. Product data that does not exist

These need a field that no product or category has today. On stage the product metadata holds only `unas_*` fields.

| Frame element | Node | Page | What is missing | Source |
|---|---|---|---|---|
| Technical line on the card ("SPS / LPS · 95 W") | `117:213` | category | spec values | CATEGORY, left out |
| Technical line on the mobile search card ("95 W · SPS / LPS") | `254:90` | search, mobile | spec values | SEARCH, 4c |
| "name · 160 W" in the summary bar | `193:202` | PDP | spec values (we show "name · SKU") | PDP, 3b |
| Spec rows | `196:54` | PDP, mobile | structured specs | PDP, 3c |
| Tabs: Spektrum & PAR, Értékelések, Letöltések | `193:109`–`193:116` | PDP | spectrum, reviews, downloads | PDP, left out |
| Akváriumméret, Felhasználás filters | `117:75` | category | no such field, tag, type or metadata | CATEGORY, left out |
| Akvárium hossza, Korallállomány filters | `162:84` | lighting | no such data | CATEGORY, lighting |
| Eyebrow and intro text ("TECHNIKA · TERVEZHETŐ RENDSZER") | `117:44` | category | category descriptions: 0 of 219 have one | CATEGORY, left out |
| Video thumbnail | `193:83` | PDP | no product has a video | PDP, 3a-2 |
| Csomagajánlat, "Csomaggal −8%" | `193:150`, `196:69` | PDP | bundle data | PDP, left out and 3c |
| "Szállítás 1–2 munkanap" | `192:57` | PDP | nothing behind the claim | PDP, left out |
| "Méret" variant picker | `193:136` | PDP | built, but no stage product has more than one variant (0 of 1492) | PDP, left out |
| "Teljes lista →" | `193:184` | PDP | an accessory list has no list page | PDP, 3b |

## 2. Curated content (someone has to choose it)

These are editorial choices in the frame. They could be built as data once someone owns the list.

| Frame element | Node | Page | Why not built | Source |
|---|---|---|---|---|
| "AJÁNLOTT", "ÚJ" badges | `117:213` | category | no data or rule behind them | CATEGORY, left out |
| "Ajánlott sorrend" | `117:55` | category, search | no curated order; the default is "Legújabbak" | CATEGORY, left out; SEARCH, 4c |
| Quick search layer: "Fedezd fel", "Népszerű most" | `152:3`, `254:3` | search | featured products and popular searches need curated data. Left out by acrobot's decision; the header's GET form stays. | SEARCH, 4a |
| "Népszerű kategóriák" and their cards and subtitles ("Egyedi példányok", "Tartási adatokkal") | `253:94`, `254:130` | search, no results | no popularity data and no source for the copy. Built as "Kategóriák" from the header menu, with product counts. | SEARCH, 4b |
| Search tips | `253:81` | search, no results | **built**: the frame's five words each find products on stage (measured 2026-09-29). The constant says to remove a word that ever returns zero. | SEARCH, 4b |

## 3. Features that do not exist

| Frame element | Node | Page | Source |
|---|---|---|---|
| Favourite (♡), compare (⇄), the compare helper | `117:213`, `117:352`, `193:70`, `152:195` | category, PDP, search | CATEGORY, PDP, SEARCH |
| "Nem tudod, mi illik a rendszeredhez? / Rendszerem beállítása" | `117:44` | category | CATEGORY, left out |
| Méretezés-segéd (sizing helper) | `193:85`, `196:35` | PDP | PDP, left out and 3c; hidden in production |
| Tudástár: the Típus filter and the Tudástár results group | `152:131`, `152:245` | search | SEARCH, 4a; there is no knowledge base in the shop |
| "Ezt kerested?" (spelling suggestion) | `152:115`, `254:63` | search | SEARCH, 4a |
| "Legjobb találat" | `152:175`, `254:78` | search | SEARCH, 4a; no relevance score, and the first result is the newest, not the best |
| `⌘K` hint | `152:111` | search | SEARCH, 4a |
| "Segítség a kereséshez", "Kérdezz a szakértőnktől" | `253:92`, header | search, header | built, but they go to the Hamarosan page: there is no expert page yet |

## 4. Store API limits

| Frame element | Page | Limit | Source |
|---|---|---|---|
| Ár filter | category, lighting, search | the Medusa store API cannot filter by price band. Price sorting already reads every page. | CATEGORY, lighting; SEARCH, 4a |
| Facet counts (Márka, root pills) | category, search | the store API has no facet counts. **Built** by reading the collections and categories of every product in the list: 100 per request, at most 30 pages on the category page and two requests on search. | CATEGORY, Márka; SEARCH, 4a |
| Search result list | search | the endpoint returns at most 200 ids, newest first. The page says so when it cuts. | SEARCH, 4a |

## 5. Decisions (not data, not code)

| Question | Who | Where it blocks | Source |
|---|---|---|---|
| "Legalacsonyabb ár az elmúlt 30 napban" (the Omnibus rule for sale prices) | Balázs, before the shop goes live | PDP | PDP, left out |
| Készlet / Elérhetőség filter, "Azonnal vihető" | until the stock-take, zero stock does not mean sold out. On search there is a second reason: stock is not a filterable field in the store API. | category, lighting, search | CATEGORY, left out; SEARCH, 4a |
| The homepage | Balázs ("A kezdőlapot még ne") | P2 scope | CATEGORY, scope |

## 6. Built differently from the frame, on purpose

Kept here so that P3 does not "fix" them back by accident.

- **Kosárba only where it is safe** (acrobot, 2026-09-29 09:02):
  - For single-variant, purchasable products it really adds the minimum order quantity to the cart.
  - Everywhere else it is "Részletek". This is the category and search card. (CATEGORY, deviation 1)
- **The compact mobile search card** keeps the stock line and the button; the frame's card has neither. (SEARCH, 4c)
- **The PDP mobile quantity control and in-page "Kosárba" stay:** the minimum-order and step rules live there. (PDP, 3c)
- **"Hasonló termékek"** is not on the frame, but it has data. It uses the "Ami még kellhet hozzá" form. (PDP, 3b)
- **The PDP heading** shows "brand · category" on desktop and "brand · SKU" on mobile. The SKU line and the full category chain of the earlier design are gone. (PDP, 3a-1, 3c)
- **Quick bar:** it scrolls horizontally (21 children on Termékek, the frame shows 5). A category without children shows its siblings. (CATEGORY, deviation 3, lighting)
- **Load more** opens the next page and shows its range ("37–40 / 40 termék"); it does not append. (CATEGORY; SEARCH, 4a)
- **Sort:** it uses the shop's existing options; the frame's "Ajánlott sorrend" does not exist. (CATEGORY; SEARCH, 4c)
- **The frame's "Technika" pill** on search is the stage root "Termékek", under its real name. (SEARCH, 4a)
- **Mobile layout of the category page** is ours; there is no canonical mobile frame. It uses one column and hides the Kategória filter section. (CATEGORY, deviations 4 and 5)

## What would unlock the most

Counted from the tables above. These are counts, not a priority; the priority is Balázs's decision.

- **Structured technical specs** (wattage, coverage, coral type) unlock the most frame elements across pages: the card's technical line, the mobile search card, the summary bar, the PDP spec rows and the spec tab. They are also the base for the Akváriumméret and Felhasználás filters.
- **The stock-take** turns the Készlet filter from misleading into buildable.
- **Category descriptions** (0 of 219 today) unlock the category intro and eyebrow.
- **A curated list** (featured products, popular searches) unlocks the quick search layer.
