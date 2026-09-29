# P1b: header, navigation and search entry from Figma

Scope: PD-000 preflight, the P1 row after P1a. Balázs approved it on 2026-09-29, 04:37 UTC. The work is the header, the navigation and the search entry, built on the P1a tokens and the `data-vilag` mode. It does not redraw page bodies (P2), does not change backgrounds, and does not add a mega menu beyond what the Figma header frames show.

## Figma sources

Figma file `ji64fTFss0jqm5Uifd0zhE`, `lastModified` 2026-09-28T12:09:35Z. The header frames of the canonical screens:

| Mode | Frame | Size | Notes |
|---|---|---|---|
| Commerce, desktop | `253:58` (Search / No Results), `201:7` (Cart 3a) | 1440×76 / 74 | "ACROPORA" Hanken 700 22, 8 nav items, Keresés · Fiók · Kosár |
| Commerce, desktop | `117:31` (Equipment), `192:61` (Lighting 1b) | 1440×88 / 74 | the same, but with a Belleza "acropora" wordmark |
| Reef, desktop | `234:23` (Fish), `217:46`, `239:25` | 1440×76 | orange square + "ACROPORA" Hanken 700 20 / 2.1, a 370 px search slot (`234:36`) |
| Commerce, mobile | `196:4` | 390×56 | two-bar menu icon, 22 px square, "ACROPORA" 16 / 1.6, the cart count only |
| Reef, mobile | `226:123` | 390×56 | the same, dark |

The frames do not agree with each other on the brand treatment or the height. The build follows the majority, which is the Reef desktop geometry for both modes (see deviations 1 and 2).

## What was built

- **Mode.** The header carries `data-fejlec`. `acropora-tokens.css` switches its `--acr-mode-*` tokens to Reef when the page is dark. Two markers can do that:
  - `body:has([data-vilag="sotet"])`: the product page sets this, exactly as before;
  - `body:has([data-acr-mod="reef"])`: new. The category page sets it from the P1a/#391 rule (`categoryPageMode`). It is **not** `data-vilag`, because `globals.css` would then turn the whole category page dark, and category bodies stay as they are until P2.
- **Colours.** Everything comes from `acr` tokens: background, border, text, heading, and `heritage` for the square, the help label and the focus ring.
- **Navigation from data.** The desktop menu and the mobile menu both list the non-empty root categories from `listNonEmptyRootCategories`, in the loader's order. The hard-coded four names (`HEADER_MENU_ITEMS`) are gone. The root the category path is under is shown at weight 600 in the heading colour, as in Figma (`234:29`).
- **Search entry.** The existing search (GET `/store?q=`) sits in the Figma slot: 370 px wide, underlined, no magnifier (`234:36`).
- **Right side.** "Fiók" (to `/account`) and "Kosár N": 13 px, weight 600, heading colour. On mobile only the count shows, at weight 500.
- **Mobile.** Below `small` (1024 px) the header is 56 px with no trust bar. It has the two-bar icon, and behind it a panel with the search, the root categories (from data) and "Fiók".
- **Heights.** `--fejlec-magassag` is 76 px (Figma), was 79. Below `small` it is 56 px, and `--fejlec-bizalmi-magassag` is 0. The sticky panels on the product page read the same variables, so they follow.
- **Font.** Hanken Grotesk is loaded globally (`--acr-font-hanken`) because the header is on every page. Only `--acr-font-sans` reads it.

## Comparison with Figma

Measured on 2026-09-29, locally, against the stage backend, fonts awaited:

| Our header | Figma frame | Size | Differing pixels |
|---|---|---|---|
| `/hu`, desktop | `253:58` Commerce | 1440×76 both | 7.25 % |
| `/hu/categories/halak`, desktop | `234:23` Reef | 1440×76 both | 5.93 % |
| `/hu`, 390 px | `196:4` Commerce | 390×56 both | 3.87 % |
| `/hu/categories/halak`, 390 px | `226:123` Reef | 390×56 both | 3.76 % |

The pixel difference comes from content and the deviations below, not from geometry. The images are in the fleet share `agents/murena/p1b-kepek/`: side by side, each with its difference image.

Mode checked on three pages:
- coral product page: Reef;
- `/hu/categories/termékek`: Commerce, with "Termékek" highlighted;
- `/hu/categories/halak`: Reef, with "Halak" highlighted.

## Deviations, and why

1. **Brand in Commerce.** We use the orange square plus "ACROPORA", as in all Reef frames, both mobile frames and one Commerce frame (`201:7` / `253:58` use "ACROPORA" without the square). Two Commerce frames use a Belleza wordmark instead (`117:31`, `192:61`). One mark in both modes keeps the header one component.
2. **Side padding and height in Commerce.** 44 px and 76 px as in Reef; the Commerce frames use 56 px and 74–88 px. The header's inner width stays 1352 px, which is 44 px on a 1440 screen.
3. **Nav items.** Figma shows eight: Korallok, Halak, Gerinctelenek, Technika, Vízkezelés, Tudástár, Szolgáltatások, Akváriumaim. The build shows the **catalogue's root categories**; on stage today that is Termékek, Gerinctelenek, Halak, Korallok.
   - "Technika" and "Vízkezelés" are not roots in the catalogue.
   - Tudástár, Szolgáltatások and Akváriumaim have no pages yet.
   - Links to missing pages were not added.
4. **Search.** In the Commerce frames the entry is a "Keresés" text; we keep the working search field in the Reef slot for both modes. The quick-search overlay is P2.
5. **Trust bar.** The Figma header frames have none; the existing bar (live-arrival guarantee, rating, expert help) stays on desktop, in the mode colours, and is hidden on mobile. Removing it is a content decision.
6. **The category drop-down panel** keeps its existing look and follows the page's world (`--terv-*`), not the header mode. Figma draws no panel; its restyle belongs to a mega-menu decision.
