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
[countryCode]/(main)/termek/**
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
| Home & Discovery | [4:63](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=4-63) | `apps/storefront` | `[countryCode]/(kezdolap)/page.tsx` | `home/`<br>`kezdolap/` | 2026-10-20 · 9acced2 | A Figma Page a homepage és discovery irányokat fogja össze. A kezdőlap 2026-10-20 óta a Claude Design terv szerint épül (`modules/kezdolap`, saját `(kezdolap)` elrendezéssel és fejléccel), nem a Figma-keretből. A márkák blokkja 2026-10-27 óta gördülő logósáv Balázs referenciaképe szerint (`kezdolap/components/markak`), Figma-terve nincs. |
| Categories | [92:28](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=92-28) | `apps/storefront` | `[countryCode]/(main)/categories/**` | `categories/` | 2026-11-01 · 3559a47 | WYSIWYG coral, fish/livestock, equipment, lighting, invertebrates desktop + mobile. 2026-11-01: az élő állat ág (korall, hal, gerinctelen) már nem a régi sablont használja: a közös kategórialapot (117:30) rajzolja élő állatos kártyával és átvétel sorral. Az élő állatos listához nincs Figma-keret, ezért a kártya és a sor a műszaki kártyából és a kezdőlap/terméklap stílusából (világos, `acr-` tokenek, talpas cím) származik. A lapozó ugyanaz a „töltsd be a továbbiakat” hivatkozás, oldalanként 18 termékkel. Az élő állatos kártyán nincs gyors „Kosárba” gomb, „Részletek” áll helyette. A Kosárba gomb alatti rendelési-maximum sor (6994c9a3) terv nélkül készült. FE-1: a sablon `<main>`-je `<div>` (a gyökér layoutban már van `<main>`), a lapozó valódi link; vizuális változás nincs, csak a hover a nem aktuális lapokon. |
| Product Detail | [87:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=87-2) | `apps/storefront` | `[countryCode]/(main)/termek/**` | `products/` | 2026-10-07 · 7fa0683 | Az útvonal 2026-10-08 óta `/hu/termek/{slug}` (SEO P0 PR 7d, G2), a régi `/products/` 301-gyel jön ide; vizuális változás nincs. Fish, lighting, WYSIWYG coral és invertebrate PDP-k. A Kosárba gomb alatti rendelési-maximum sor (6994c9a3) terv nélkül készült. FE-1: a Suspense-tartalék terméknév `<p>` (egy H1 a lapon), a nem aktív fül tartalma rejtve a DOM-ban; vizuális változás nincs. |
| Compare | [153:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=153-2) | `apps/storefront` | `nincs` | `nincs` | 2026-10-06 · 14ea991 | Design létezik, dedikált route/module jelenleg nincs azonosítva. |
| Cart | [201:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=201-2) | `apps/storefront` | `[countryCode]/(main)/cart/**` | `cart/` | 2026-10-07 · 34ad174 | A Checkout Figma Page része. FE-9: a „Kosár” cím H1 (a számolt stílus változatlan, 32/44 px, 600, mérve böngészőben), a kuka-gomb és a mennyiség neve, az üres oszlopfej felolvasó-szövege; vizuális változás nincs. |
| Checkout | [201:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=201-2) | `apps/storefront` | `[countryCode]/(checkout)/checkout/**` | `checkout/` | 2026-11-02 · cdd45d0 | Details, payment és checkout flow. FE-9: a közös `Input` címkéje a mezőhöz kötve (láthatatlan). A pénztár többi akadálymentességi lelete jelentve, átrajzolás nélkül (`a11y-varhato.ts`). 2026-11-02: a cím lépés (szállítási és számlázási cím), a fejléc és az oldalsáv a kosár és a kezdőlap világos stílusában (`acr-` tokenek), minden szöveg szótár-kulcs (`checkoutPage.*`, hu és en); Figma-keret ehhez nincs, a kosár oldal stílusából készült. A szállítás (#627) és a fizetés oldala, az ellenőrzés és az ÁSZF-pipa is ebben a stílusban, szótár-kulcsokkal (`checkoutPayment.*`); a két rendelés sávja a megrendelés gomb közvetlen fölött áll. Az angol ÁSZF-pipa szó szerinti fordítás, jogi jóváhagyásra vár. |
| Shipping & Fulfillment | [486:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=486-2) | `apps/storefront` | `[countryCode]/(checkout)/checkout/**` | `shipping/`<br>`checkout/` | 2026-11-02 · b164a45 | Csak customer-facing FOXPOST/GLS pickup és shipping UX. Internal fulfillment az OS tulajdona. 2026-11-02: a szállítási lépés (módok, megjegyzés, összefoglaló) a pénztár világos stílusában, minden szöveg szótár-kulcs (`checkoutShipping.*`, hu és en); a GLS és Foxpost pontválasztó kerete és szövegei is kulcsok, a szolgáltatók térképes keresője (GLS `<gls-dpm>`, Foxpost iframe) a sajátjuk, a GLS elem nyelve egyelőre `hu`. A szerver-művelet hibája szótár-kulccsal jön vissza. |
| Account & Auth | [249:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=249-2) | `apps/storefront` | `[countryCode]/(main)/account/**` | `account/` | 2026-10-06 · 14ea991 | Orders, order detail, profile, billing, addresses, settings és login. |
| Edge States | [258:2](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=258-2) | `apps/storefront` | `[countryCode]/(main)/error.tsx`<br>`[countryCode]/(main)/not-found.tsx`<br>`[countryCode]/(checkout)/not-found.tsx`<br>`global-error.tsx`<br>`not-found.tsx` | `common/`<br>`skeletons/` | 2026-10-06 · 14ea991 | A tranzakciós email-design ownership nem itt, hanem az OS-ben van. |
| Order confirmation | nincs | `apps/storefront` | `[countryCode]/(main)/order/**` | `order/` | 2026-11-02 · d22899b | Confirmed + transfer flow; jelenleg nincs külön aktuális Figma screen mapping. 2026-11-02: a visszaigazoló oldal (rendelés részletes és minimális) minden szövege szótár-kulcs (`orderConfirmed.*`, hu és en), a lap címe nyelvenként; a nulla szállítás Ingyenes / Free; a mobilon megnyúló GLS-logó javítva. A kapott adat (a pont és a szállítási mód neve) nem fordul. |
| Pay existing order | nincs | `apps/storefront` | `[countryCode]/(main)/rendeles-fizetese/**` | `rendeles-fizetese/` | 2026-10-06 · 14ea991 | — |
| Store listing | nincs | `apps/storefront` | `[countryCode]/(main)/store/**` | `store/`<br>`categories/` | 2026-11-03 · 6f3391d | Kód létezik, nincs külön aktuális Figma mapping. 2026-11-03: a „Minden termék” lista a kategórialap közös keretében áll (`ListaLap`, 117:30 szerint): morzsa, cím, a bolt gyökerei gyors sávként és kategórialistaként (a fejléc számaival), márkaszűrő, oldalanként 18 termék és „További termékek betöltése” hivatkozás; a kártya termékenként az élő állatos vagy a műszaki. A régi oldalsó rendezés és opcióválasztó nincs a képernyőn (a `optionValueIds` címparaméter szűr tovább). A keresési találati oldal külön sablon, ebben a PR-ban nem változik. |
| Search results | [152:88](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=152-88)<br>[253:57](https://www.figma.com/design/ji64fTFss0jqm5Uifd0zhE?node-id=253-57) | `apps/storefront` | `[countryCode]/(main)/store/**` | `store/templates/kereses/` | 2026-11-03 · 9f7deca | A találati lap (152:88) és a nincs-találat lap (253:57), a `docs/P2-SEARCH.md` szerint, világos stílusban; a `/store` lap a `?q=` keresőszóval ezt rajzolja. 2026-11-03: minden szöveg szótár-kulcs (`search.*`, hu és en); a kártya termékenként az élő állatos (tömör, két oszlop) vagy a műszaki (a `vilagaTermeknek` szerint), mert az élő állat nem kap gyors „Kosárba” gombot. A terv, a szűrők és a lapozás nem változott. |
| Brand index (márkalista) | nincs | `apps/storefront` | `[countryCode]/(main)/marka/page.tsx` | `marka/` | 2026-11-03 · 9f7deca | Nincs külön Figma-keret. 2026-11-03: az ábécé-index a listalapok világos stílusában (`acr-` tokenek): morzsa, nagy cím, a `mist` sávon a betű-sáv (ugrás a betű szakaszára) és a márkák darabszáma, betűnként szakaszok, a márka a saját oldalára visz. A szövegek szótár-kulcsok (`brandIndex.*`, hu és en). Logó nincs (a logók gyűjtése áll). |
| Collections | nincs | `apps/storefront` | `[countryCode]/(main)/collections/**`<br>`[countryCode]/(main)/marka/[handle]` | `collections/`<br>`categories/` | 2026-11-03 · d13488a | Nincs külön Figma-keret. 2026-11-03: a márka (gyűjtemény) termékoldala a kategórialap közös keretében áll (`ListaLap`, 117:30 szerint): morzsa („Márkák / a márka”), cím, rendezés, termékenként választott kártya (élő állatos vagy műszaki), oldalanként 18 termék és „További termékek betöltése” hivatkozás. Szűrő-oszlop nincs (egy márkánál nincs mi szerint szűrni); a `optionValueIds` címparaméter láthatatlanul még szűr. A márkalista (`/marka`) külön sablon, nem változik. |
| Selection (válogatás) | nincs | `apps/storefront` | `[countryCode]/(main)/valogatas/**` | `valogatas/`<br>`categories/` | 2026-11-03 · d60adb8 | Nincs külön Figma-keret. 2026-11-03: a válogatás oldala a kategórialap közös keretében áll (`ListaLap`, 117:30 szerint): morzsa, cím, a válogatás saját bevezetője (a sortörésekkel), darabszám, termékenként választott kártya, oldalanként 18 termék és „További termékek betöltése” hivatkozás. Nincs rendezés (a sorrend a válogatásé, a legújabb elöl) és nincs szűrő-oszlop. |
| Legal documents | nincs | `apps/storefront` | `[countryCode]/(main)/jogi/**` | `jogi/` | 2026-10-06 · 14ea991 | — |
| Coming soon | nincs | `apps/storefront` | `[countryCode]/(main)/hamarosan/**` | `—` | 2026-10-06 · 14ea991 | — |
| Verify account | nincs | `apps/storefront` | `[countryCode]/(main)/verify-account/**` | `account/` | 2026-10-06 · 14ea991 | — |
| Storefront layout | nincs | `apps/storefront` | `[countryCode]/(main)/layout.tsx`<br>`[countryCode]/(checkout)/layout.tsx`<br>`layout.tsx` | `layout/`<br>`common/` | 2026-10-06 · 14ea991 | Közös header/footer/layout elemek. |
| Design tokens preview | nincs | `apps/storefront` | `tokenek/**` | `common/` | 2026-10-06 · 14ea991 | Fejlesztői token preview; Figma token dokumentáció: `docs/P1A-FIGMA-TOKENS.md`. |
| Betűk / font assets | nincs | `apps/storefront` | `betuk/**` | `—` | 2026-10-06 · 14ea991 | Az app root alatt élő font- és licencforrások; nincs külön storefront module. |

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
