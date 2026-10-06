# Figma ↔ kód térkép

Ez a dokumentum az Acropora Commerce storefront Figma-terveit köti a tényleges implementációhoz.

- **Figma = vizuális / UX source of truth**
- **GitHub = implementációs source of truth**
- Figma file: [Acropora design](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE)
- OS / Mobile / Partner counterpart: [KratoBal/acropora-os · docs/FIGMA-MAP.md](https://github.com/KratoBal/acropora-os/blob/main/docs/FIGMA-MAP.md)
- Kapcsolódó Figma token dokumentum: [P1A-FIGMA-TOKENS.md](./P1A-FIGMA-TOKENS.md)

## Útvonal-alapok

A táblákban szereplő hivatkozások az alábbi base pathokhoz képest értendők.

| App | Route base | Component base |
|---|---|---|
| `apps/storefront` | `apps/storefront/src/app/` | `apps/storefront/src/modules/` |

Ezért a route-minták a route groupokat is explicit tartalmazzák, például:

```text
[countryCode]/(main)/products/**
[countryCode]/(checkout)/checkout/**
```

Jelölések:

- `nincs`: a design vagy az implementáció még nem létezik; ne találjunk ki hozzá útvonalat.
- `—`: nincs külön stabil route- vagy component-area mapping.
- `**`: a könyvtár alatti teljes route-terület.
- Több hivatkozás egy cellában `<br>` jellel van elválasztva; a validator mindet külön ellenőrzi.

## Karbantartási szabály

Ha egy PR egy itt feltérképezett UI-területet módosít, ugyanabban a PR-ben frissítse az érintett sor **Utoljára egyeztetve** mezőjét dátummal és azzal a commit SHA-val, amely ellen a Figma ↔ kód megfelelést ellenőrizték.

Szándékos design-eltérést a **Megjegyzés** mezőben kell dokumentálni. Kézzel karbantartott `implemented / partial / approved` státuszokat nem használunk.

## Storefront

| Figma Page / Section | Node | App | Route pattern | Component area | Utoljára egyeztetve | Megjegyzés |
|---|---|---|---|---|---|---|
| Home & Discovery | [4:63](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=4-63) | `apps/storefront` | `[countryCode]/(main)/page.tsx` | `home/`<br>`kezdolap/` | 2026-10-06 · 14ea991 | A Figma Page a homepage és discovery irányokat fogja össze. |
| Categories | [92:28](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=92-28) | `apps/storefront` | `[countryCode]/(main)/categories/**` | `categories/` | 2026-10-06 · 14ea991 | WYSIWYG coral, fish/livestock, equipment, lighting, invertebrates desktop + mobile. |
| Product Detail | [87:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=87-2) | `apps/storefront` | `[countryCode]/(main)/products/**` | `products/` | 2026-10-06 · 14ea991 | Fish, lighting, WYSIWYG coral és invertebrate PDP-k. |
| Compare | [153:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=153-2) | `apps/storefront` | `nincs` | `nincs` | 2026-10-06 · 14ea991 | Design létezik, dedikált route/module jelenleg nincs azonosítva. |
| Cart | [201:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=201-2) | `apps/storefront` | `[countryCode]/(main)/cart/**` | `cart/` | 2026-10-06 · 14ea991 | A Checkout Figma Page része. |
| Checkout | [201:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=201-2) | `apps/storefront` | `[countryCode]/(checkout)/checkout/**` | `checkout/` | 2026-10-06 · 14ea991 | Details, payment és checkout flow. |
| Shipping & Fulfillment | [486:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=486-2) | `apps/storefront` | `[countryCode]/(checkout)/checkout/**` | `shipping/`<br>`checkout/` | 2026-10-06 · 14ea991 | Csak customer-facing FOXPOST/GLS pickup és shipping UX. Internal fulfillment az OS tulajdona. |
| Account & Auth | [249:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=249-2) | `apps/storefront` | `[countryCode]/(main)/account/**` | `account/` | 2026-10-06 · 14ea991 | Orders, order detail, profile, billing, addresses, settings és login. |
| Edge States | [258:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=258-2) | `apps/storefront` | `[countryCode]/(main)/error.tsx`<br>`[countryCode]/(main)/not-found.tsx`<br>`[countryCode]/(checkout)/not-found.tsx`<br>`global-error.tsx`<br>`not-found.tsx` | `common/`<br>`skeletons/` | 2026-10-06 · 14ea991 | A tranzakciós email-design ownership nem itt, hanem az OS-ben van. |
| Order confirmation | nincs | `apps/storefront` | `[countryCode]/(main)/order/**` | `order/` | 2026-10-06 · 14ea991 | Confirmed + transfer flow; jelenleg nincs külön aktuális Figma screen mapping. |
| Pay existing order | nincs | `apps/storefront` | `[countryCode]/(main)/rendeles-fizetese/**` | `rendeles-fizetese/` | 2026-10-06 · 14ea991 | — |
| Store listing | nincs | `apps/storefront` | `[countryCode]/(main)/store/**` | `store/` | 2026-10-06 · 14ea991 | Kód létezik, nincs külön aktuális Figma mapping. |
| Collections | nincs | `apps/storefront` | `[countryCode]/(main)/collections/**` | `collections/` | 2026-10-06 · 14ea991 | — |
| Legal documents | nincs | `apps/storefront` | `[countryCode]/(main)/jogi/**` | `jogi/` | 2026-10-06 · 14ea991 | — |
| Coming soon | nincs | `apps/storefront` | `[countryCode]/(main)/hamarosan/**` | `—` | 2026-10-06 · 14ea991 | — |
| Verify account | nincs | `apps/storefront` | `[countryCode]/(main)/verify-account/**` | `account/` | 2026-10-06 · 14ea991 | — |
| Storefront layout | nincs | `apps/storefront` | `[countryCode]/(main)/layout.tsx`<br>`[countryCode]/(checkout)/layout.tsx`<br>`layout.tsx` | `layout/`<br>`common/` | 2026-10-06 · 14ea991 | Közös header/footer/layout elemek. |
| Design tokens preview | nincs | `apps/storefront` | `tokenek/**` | `common/` | 2026-10-06 · 14ea991 | Fejlesztői token preview; Figma token dokumentáció: `docs/P1A-FIGMA-TOKENS.md`. |

## Commerce Design System / shared UI

A Figma Commerce komponensekhez jelenleg nincs külön, stabil, egy-fájl-per-komponens code ownership úgy, mint az OS `packages/ui` esetén. Emiatt itt nem találunk ki mesterséges component-file mappinget.

A közös storefront UI elsődleges területei:

| Figma Page / Section | Node | App | Route pattern | Component area | Utoljára egyeztetve | Megjegyzés |
|---|---|---|---|---|---|---|
| Commerce Components | [13:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=13-2) | `apps/storefront` | `—` | `common/`<br>`layout/` | 2026-10-06 · 14ea991 | A konkrét komponens-fájl mapping csak stabilizálódás után kerüljön ide. |
| Loading / skeleton states | [258:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=258-2) | `apps/storefront` | `—` | `skeletons/` | 2026-10-06 · 14ea991 | Edge-state és loading építőelemek. |

## Tranzakciós emailek ownershipja

A **célállapotban** a webshop levélsablonjainak design- és template-ownere az OS:

```text
acropora-os
→ Settings
→ beallitasok/levelsablonok
```

A Commerce az OS mail renderert akkor használja, ha:

```text
ACROPORA_WEBSHOP_MAIL_RENDERER=os
```

aktív.

Amíg a kapcsoló nincs OS-re állítva, Commerce oldalon átmeneti fallback mail implementáció is él. Ennek egyik belépési pontja:

```text
apps/backend/src/subscribers/order-placed-mail.ts
```

Ez technikai fallback, nem Commerce design ownership. A Figma tranzakciós email frame-eket az OS / Settings területhez kell rendezni.

## Ellenőrzés

A mapping lokális ellenőrzése:

```bash
node scripts/figma-map-check.mjs
```

A validator a dokumentált route- és component-hivatkozások létezését ellenőrzi. Figma API-t nem használ.
