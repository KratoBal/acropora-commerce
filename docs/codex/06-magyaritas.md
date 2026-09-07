# 06 -- A maradek angol feliratok magyarra

## Miert ez a feladat

A kirakat a Medusa `dtc-starter` sablonjabol indult, es a sablon szovegei ANGOLUL
allnak a kodban. A termeklapot es a kategoria-oldalt mar atirtuk, de a tobbi oldal
(fiok, rendeles-visszaigazolas, hibaoldalak, fejlec, lablec) valtozatlanul angol.

Merve a futo boltban (2026-09-07), a fejlecben es a lablecben latszo peldak:
`Account`, `Categories`, `Menu`, `Select`, `From`. A kodban tovabbi tobb tucat all,
tobbek kozt `Page not found`, `Go to frontpage`, `Your shopping bag is empty.`,
`Order Summary`, `Log out`.

Ez nem stilus-kerdes: a bolt magyar vevonek keszul, es egy angol gomb a fizetesi
folyamatban bizalmi kerdes, nem kenyelmi.

## Amit at kell irni

MINDEN allando (nem adatbol jovo) angol felirat ezekben a mappakban:

```
apps/storefront/src/modules/account/**
apps/storefront/src/modules/order/**
apps/storefront/src/modules/checkout/**
apps/storefront/src/modules/layout/**
apps/storefront/src/app/**/not-found.tsx
apps/storefront/src/app/**/error.tsx
```

## Amit NEM szabad bantani, es ez fontos

Ezeken a helyeken MOST IS dolgozik ket masik fejleszto, es egy egyidejű atiras
utkozest okozna:

```
apps/storefront/src/modules/products/**      <- a termeklap vaza epul
apps/storefront/src/modules/cart/**          <- a kosar atveteli sava epul
```

Ha ezekben latsz angol feliratot, NE ird at: gyujtsd ossze a vegen egy listaba, es
azt add at. Az a lista onmagaban is ertek.

Tovabba NE nyulj:

- a `data-testid` ertekekhez -- azokra tesztek hivatkoznak, es a nevuk azonosito,
  nem felirat
- semmihez, ami az API-bol jon (termeknev, kategorianev, leiras): az adat, nem szoveg
- a `console` es a hibanaplo uzeneteihez: azokat fejleszto olvassa

## A forditas hangneme

Magazodas, tomor, koznyelvi. Nem "Az On kosara", hanem "A kosarad". A bolt
kozvetlenul beszel a vevovel.

Nehany, hogy a stilus egysegesen induljon:

| angol | magyar |
| --- | --- |
| Account | Fiok |
| Log out | Kijelentkezes |
| Order Summary | A rendeles osszegzese |
| Subtotal | Reszosszeg |
| Shipping | Szallitas |
| Taxes | Ado |
| Total | Osszesen |
| Your shopping bag is empty. | A kosarad ures. |
| Page not found | Nincs ilyen oldal |
| Go to frontpage | Vissza a fooldalra |
| Continue shopping | Vasarlas folytatasa |

A tobbit a fenti elvek szerint dontsd el. Ha egy szonal ket jo magyar valtozat van,
valaszd a rovidebbet, es HASZNALD VEGIG UGYANAZT -- egy boltban ne legyen "Kosar" es
"Kosarad" felvaltva.

## Amit a munka vegen at kell adnod

1. A PR, a szokott modon.
2. A LISTA azokrol az angol feliratokrol, amiket a tiltott mappakban talaltal es
   szandekosan NEM irtal at. Fajl es sor szerint.
3. Es kulon: ha talalsz olyan angol szoveget, amirol NEM tudod eldonteni, hogy
   felirat-e vagy azonosito, azt SE ird at -- tedd a listara, egy mondattal, hogy
   miert bizonytalan.

A harmadik pont a legfontosabb: egy rosszul atirt azonosito nemán tor el egy tesztet
vagy egy hivatkozast, mig egy meghagyott angol felirat csak csunya. A ket hiba ara nem
egyforma, tehat ha bizonytalan vagy, HAGYD MEG.

## Ellenorzes

- `pnpm --filter @dtc/storefront exec tsc -p tsconfig.json` -- nulla hiba
  (a tipus-kapu 2026-09-07 ota a CI-ben is fut, tehat ez nem opcionalis)
- a tesztek zoldek, ES a LEFUTOTT FAJLOK szama sem csokkent az elozohoz kepest
- egyetlen `data-testid` sem valtozott: `git diff` a PR-en, es keress ra
