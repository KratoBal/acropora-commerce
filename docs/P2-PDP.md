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
