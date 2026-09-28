# P1a: Figma Foundations tokens and the two-mode theme

Scope: PD-000 preflight, point 7. Balázs started it on 2026-09-28, 18:24:39 UTC. Nothing on an existing page changes. Header and navigation are P1b. The old Medusa grey classes are not touched.

## Where the values come from

The Figma file is `ji64fTFss0jqm5Uifd0zhE`, frame `9:2` "Foundations / Acropora v0.1", file `lastModified` 2026-09-28T12:09:35Z. It was read over the REST API, because `file_variables:read` is not granted. The extracted values are committed as a fixture: `apps/storefront/src/styles/__fixtures__/figma-foundations.json`.

| Group | Figma source | Count |
|---|---|---|
| Colour primitives | swatch fills `9:35`–`9:74` | 14 |
| Modes | Mode Card fills, strokes and text fills: `9:10` Reef, `9:17` Commerce | 2 × 7 |
| Text styles | samples `9:79`–`9:107`, plus the `4:55` style node (Wordmark) | 11 |
| Spacing | bars `9:111`–`9:139` | 10 |
| Radius | samples `9:144`–`9:156` | 5 |
| Effect | the `4:56` style node (Shadow/Subtle) | 1 |

Two of the eleven styles are not placed anywhere in the file: `Wordmark/Placeholder` and `Shadow/Subtle`. No node references them; they exist only as style nodes. Their values come from those nodes:
- Wordmark: Belleza 400, 32/36, letter spacing 1.2;
- Shadow/Subtle: `0 2px 8px rgba(0,0,0,0.06)`.

## What was built

- `src/styles/acropora-tokens.css`: `--acr-*` variables.
  - Primitives, fonts, spacing, radius and shadow sit on `:root`.
  - The mode tokens (`--acr-mode-*`) sit on the existing `data-vilag` switch:
    - Commerce on `:root` and `[data-vilag="vilagos"]`;
    - Reef on `[data-vilag="sotet"]`.
  - It is loaded from the root layout. It only **defines** variables, and no existing rule reads them.
- `tailwind-acropora.js`: the Tailwind theme built from the same fixture. Every key is `acr`-prefixed, so no existing class is overridden. It sits outside `src` because `tailwind.config.js` loads it with `require`, and the `src` lint forbids that.
- `src/lib/util/acropora-mod.ts`: the mode rule. Korallok (every coral), Halak, Gerinctelenek and WYSIWYG are Reef, everything else is Commerce (see the coral decision below). `vilagModhoz` maps the mode onto `data-vilag`.
- `src/app/tokenek/page.tsx`: the token sample page.
  - It renders only with `ACROPORA_TOKEN_MINTALAP=1`; otherwise it returns a real 404.
  - It loads Hanken Grotesk and Belleza on this page only.
  - Every compared element carries its Figma node id in `data-figma`.

## Comparison with the Foundations frame

Measured locally with `next dev` on 2026-09-28. Width 1440, font loading awaited, animations off.

- **Geometry:** all 51 `data-figma` elements (colour swatches, mode cards, spacing bars, radius samples, text blocks, the north-star panel) match the Figma node's position and size to **0.0 px**. For text nodes only position and height are compared: in Figma a text box hugs its text, in the browser it fills the line.
- **Pixels:** 2.36 % of the pixels differ on the common height (3396 px). The difference image shows it on glyph edges and on the anti-aliased edges of the rounded samples only. Colour fills and borders match.

**Documented deviations:**
1. **Text rasterisation.** Figma and Chromium render and kern Hanken Grotesk and Newsreader differently. Word edges shift by fractions of a pixel. The geometry is unaffected.
2. **Sample row labels at 14 px line height, not 14.333.** Figma rounds the 11 px label box to 14 px (`9:79`, h = 14). The fractional value shifted the page by 0.33 px per row, 3.3 px in total. It now matches.
3. **Radius "full"** is `9999px`. The Figma sample shows 36 px on a 72 px square, which is the same shape.
4. **Editorial mode is not part of P1a.** Its card on the sample page is built from primitives, so the page stays comparable; it has no mode tokens.
5. **Wordmark and shadow** are shown below the frame, because they are not on it. The comparison stops at the frame height.

## Existing pages: unchanged, measured

Two pages were chosen:
- `/hu`, light;
- `/hu/products/tubastrea-faulkneri-orange-napkorall`, dark (a coral product page).

They were shot on the stage storefront before the change, at `cccbe67`, twice each. Two identical runs differed by **0** pixels on both, so any pixel after the change is a real change. The after-shots are taken on stage once this merges.

## The coral decision (taken 2026-09-28)

P1a's first rule made a non-WYSIWYG coral Commerce (light), which would have changed the existing coral product pages. Balázs decided on 2026-09-28 at 18:52 UTC: **every coral stays dark (Reef), regardless of WYSIWYG**, as do fish and invertebrates.

`modKategoriaUtvonalhoz` follows that now. Its Reef roots are Korallok, Halak and Gerinctelenek, the same three the product page's `vilag-valto.ts` treats as dark, and a test keeps the two lists equal.

It is still not wired into any page; wiring is P2/P3.

After #390 was deployed to stage (`ee11258`), the two pages shot before were shot again. `/hu` and the coral product page differ from their before-shots by **0 pixels**, and `/tokenek` returns 404 on stage.
