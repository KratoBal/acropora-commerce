# P1b: header, navigation and search entry from Figma

Scope: PD-000 preflight, the P1 row after P1a. Balázs approved it on 2026-09-29, 04:37 UTC. The work is the header, the navigation and the search entry, built on the P1a tokens and the `data-vilag` mode. It does not redraw page bodies (P2, P3), does not change backgrounds, and does not add a mega menu beyond what the Figma header frames show.

## Figma sources

Figma file `ji64fTFss0jqm5Uifd0zhE`, `lastModified` 2026-09-28T12:09:35Z.

**The canonical frames for the header are the WYSIWYG coral PDP frames.** Balázs named them on 2026-09-29 at 05:23 UTC ("és a fejléc is benne van ezekben"), and added "a menü is minden elemével":

| Viewport | Frame | Header part |
|---|---|---|
| Desktop | `215:41` WYSIWYG Coral PDP / Desktop — 2a Hybrid | three bands: `217:41` utility 36 px, `217:46` header 76 px, `217:62` search 70 px |
| Mobile | `220:3` WYSIWYG Coral PDP / Mobile — 2a | `220:4` mobile header 56 px |

The handoff (`262:3`, section 2) has no separate header row: the header is part of every screen frame. Every desktop Reef CANONICAL frame has the same three bands and the same header band, element for element: `108:55`, `87:3`, `92:29`, `239:19`, `239:359` and `215:41`. Only the highlighted item differs. The frame `29:145` is on the handoff's IGNORE list.

The first P1b build (#392) was measured against `234:23` (the header band of `108:55`), `253:58`, `196:4` and `226:123`. It took the header band alone and missed the search band (see deviation 4).

## What was built

- **Three bands on desktop**, each full width with its own bottom border, content 1352 px wide (44 px sides at 1440):
  - **Trust bar** (`217:41`), 36 px. The layout follows the frame; the texts are ours (deviation 5).
  - **Header band** (`217:46`), 76 px: the square, "ACROPORA", the menu, the empty 370 px spacer (`217:59` "nav-spacer"), "Fiók" and "Kosár N".
  - **Search band** (`217:62`), 70 px:
    - a 46 px field filling the row, with border, magnifier and 14 px text;
    - the field background: `white` in Commerce (`201:21`), `deep` in Reef (`217:63`), set as `--fejlec-mezo-hatter` next to the mode switch;
    - beside it a 220 px "Kérdezz a szakértőnktől" button with a heritage border. It goes to the Hamarosan page.
- **Mobile** (`220:3`) has only the 56 px header band. It holds the two-line icon (1.5 px lines), the 22 px square, "ACROPORA" (16 px, 1.5 px tracking) and the cart count. An empty cart's "0" is in the mode's text colour, a non-empty count in the heading colour. The panel behind the icon has the search, the eight menu items and "Fiók".
- **Heights.**
  - Desktop: `--fejlec-bizalmi-magassag` 36 px, `--fejlec-magassag` 76 px and `--fejlec-kereso-magassag` 70 px. `--fejlec-teljes-magassag` is their sum, 182 px.
  - Below `small` (1024 px): 0, 56 and 0 px.
  - The whole header is sticky. The product page's sticky panel and the category drop-down panel read `--fejlec-teljes-magassag`.
- **Mode.** The header carries `data-fejlec`. `acropora-tokens.css` switches its `--acr-mode-*` tokens to Reef when the page is dark. Two markers do that:
  - `body:has([data-vilag="sotet"])`: set by the product page;
  - `body:has([data-acr-mod="reef"])`: set by the category page from `categoryPageMode`.
- **Font.** Hanken Grotesk is loaded globally (`--acr-font-hanken`), because the header is on every page.

### The menu

The list and the order come from the frame (`217:51`–`217:58`), and they replace the 2026-09-09 order of four. They sit in `FEJLEC_MENU_TERV` (`src/lib/util/fejlec-menu-pontok.ts`). `fejlecMenuPontok` resolves each item against the loaded, non-empty catalogue roots, ignoring accents and case. acrobot decided the targets on 2026-09-29 at 07:24 and 07:27:

| Item | Target on stage today | Rule |
|---|---|---|
| Korallok, Halak, Gerinctelenek | the root's drop-down, as before | the catalogue root exists |
| Technika | Hamarosan | no such root; if one appears, the item opens it |
| Vízkezelés | `/categories/vízkezelés---termékek` | not a root, but a child of Termékek with its own page |
| Tudástár, Szolgáltatások, Akváriumaim | Hamarosan | no pages yet |

A root that is not in the frame is not in the header menu. On stage that means Termékek, "Shop 'n the Shop" and Édesvízi akvarisztika.

**The Hamarosan page** is `/[countryCode]/hamarosan/[tema]`. It knows exactly the menu topics plus `szakerto`; anything else is a real 404. It is `noindex`. It exists so that no item is a dead link (acrobot's decision).

## Comparison with Figma

Measured on 2026-09-29 locally with `next dev` against the stage backend. Fonts were awaited. The page was the coral product page `tubastrea-faulkneri-orange-napkorall` in Reef mode.

| Our header | Figma | Size | Differing pixels |
|---|---|---|---|
| desktop, three bands | `215:41`, top 182 px | 1440×182 | 6.96 % |
| mobile | `220:3`, top 56 px | 390×56 | 3.40 % |

Geometry: 36 / 76 / 70 px, the field 1120×46 at y = 123.5, the button 220×46. This matches the frame exactly. The pixel difference is in the texts, listed below. The menu also renders about 11 px wider in Chromium than in Figma (648 against 637), the same text rasterisation as in P1a.

The product page's sticky panel was measured at 1440 px. From 125 px of scroll its top is at 182, the header's bottom, so the header covers nothing while the panel sticks. Further down, the panel leaves with its container, as before. At 1024 px the panel is as tall as its grid cell (596 px), so it has no room to stick and scrolls with the page. That comes from the grid, not from the header height.

No horizontal page scroll at 390, 1024, 1280 or 1440 px. The images are in the fleet share `agents/murena/p1b-kepek/`: `korall-1440-*.png` and `korall-390-*.png`, each Figma above ours, with the difference image.

## Deviations, and why

1. **Brand in Commerce.** We use the orange square plus "ACROPORA" in both modes, as in all Reef frames and both mobile frames. Two Commerce frames use a Belleza wordmark instead (`117:31`, `192:61`). One mark keeps the header one component.
2. **One geometry for both modes.** The Reef frames give 44 px sides and 76/70 px bands. The Commerce frames differ among themselves (56 px sides, 74–88 px headers, a 72 px search band). We follow the canonical frame in both modes, with the mode colours.
3. **Menu: decided by Balázs, no longer a deviation.** Eight items from `215:41`, resolved as in the table above.
4. **Search.**
   - It now sits in its own band, as in every Reef frame. The first P1b build put it in the empty 370 px spacer, which was a misreading.
   - The placeholder keeps our four-word text ("Keresés termékre, fajra, márkára, cikkszámra"). This is acrobot's decision of 2026-09-09, recorded in `nav/index.tsx`. `215:41` says "Keresés termékre, fajra, cikkszámra vagy törzsnévre…".
5. **Trust bar texts.** The height and the layout follow `217:41`. The texts are ours:
   - Left: our "Élő megérkezési garancia · Élőállat-szállítás minden szerdán". The frame's "Élő állat: kizárólag személyes átvétel" is left out: next to ours it reads as a contradiction (acrobot's decision, 2026-09-29).
   - Right: our certificate (Balázs, 2026-09-09) instead of the frame's sample "Árukereső 4,9 / 5 · 312 értékelés". A made-up rating must not appear before a customer.
   - The content of the bar is an open question with Balázs.
6. **Between 1024 and 1280 px** (our responsive rule; Figma draws 1440 only): the header band's gaps are 20 px instead of 28, and the menu's 14 px instead of 18. Otherwise the eight items overflow by 28 px (measured at 1024).
7. **No highlighted item on the product page.** `215:41` shows "Korallok" highlighted on the coral PDP. Our product route carries no category, so the header cannot tell. Category pages and the Hamarosan page do highlight their item.
8. **The category drop-down panel** keeps its existing look and follows the page's world (`--terv-*`), not the header mode. Figma draws no panel; its restyle belongs to a mega-menu decision.
