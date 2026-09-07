# Codex feladat: kapcsolódó termékek csoportosítása

## A repó és az ág

- repó: `KratoBal/acropora-commerce` (privát)
- alkalmazás: `apps/storefront` (Next.js, a Medusa `dtc-starter` alapján)
- csomagkezelő: **pnpm**, nem npm. A gyökérben `pnpm-workspace.yaml` áll.
- új ág a friss `main` fejéről, a neve kezdődjön ezzel: `feat/storefront-`

## Mit kell megcsinálni

A terméklap alján ma egy vegyes lista áll: kiegészítő tartozékok és
alternatíva-termékek összekeverve. A vevő nem tudja megkülönböztetni, mi
tartozik a termékhez, és mi helyettesíti azt - ez elszalasztott
értékesítés.

Bontsd két külön szakaszra:

1. **"Ami még kellhet hozzá"** - kiegészítő/tartozék termékek
2. **"Hasonló termékek"** - alternatíva/helyettesítő termékek

## Öt kikötés

1. **Ha az egyik csoport ÜRES, ne jelenjen meg az a címsor.** Ha mindkettő
   üres, a teljes szakasz (mindkét cím) tűnjön el a lapról. Ugyanaz az elv,
   mint egy magányos fülnél: egy üres címsor rosszabb, mint ha nincs ott.

2. **A besorolás forrása ADAT, nem a te döntésed.** A régi (UNAS)
   rendszerben ez a két kapcsolat két KÜLÖN mezőn állt a termékadatban
   (kiegészítő kontra hasonló/alternatíva - két különálló lista, nem egy
   közös, kategória- vagy névhasonlóság alapján számolt lista). **Ha a mai
   Medusa-oldali adatmodellben (backend séma, storefront lekérdezés) NINCS
   ilyen kétfelé bontott kapcsolat elérhető** - vagyis csak egy egységes
   "kapcsolódó termékek" listát találsz -, **ezt NE találd ki** (pl.
   kategória-egyezés vagy terméknév-hasonlóság alapján saját logikával
   szétválogatva). Ehelyett nevezd meg konkrétan a válaszban, hogy ez a
   megkülönböztetés a mai adatban nem érhető el, és melyik fájlban/sémában
   nézted meg.

3. **Egy termék csak EGY csoportban jelenjen meg.** Ha az adat technikailag
   mindkét listában szerepelteti ugyanazt a terméket, az a "Ami még
   kellhet hozzá" (kiegészítő) csoportban jelenjen meg, ne duplán.

4. **A csoporton belüli sorrend a bemeneti adat sorrendje legyen.** Ne
   rendezd újra ár, népszerűség vagy ábécé szerint - amilyen sorrendben a
   kapcsolódó termékek listája érkezik, olyan sorrendben jelenjenek meg.

5. **A nem elérhető (rejtett, törölt, nem publikált) kapcsolódó tételeket
   szűrd ki csendben.** Ha egy kapcsolódó termékre mutató hivatkozás olyan
   termékre vezetne, ami ma nem vásárolható/nem publikus, az a tétel ne
   jelenjen meg egyik csoportban sem - ne hibaüzenetet adjon, ne törött
   linket.

## Amit a válaszban kérünk

- a megváltoztatott fájlok listája
- és egy mondat arról, **mit nem tudtál eldönteni**, ha volt ilyen

Ha valami hiányzik ahhoz, hogy elkezdd (hozzáférés, adat, döntés), azt
nevezd meg konkrétan, ne általánosságban.
