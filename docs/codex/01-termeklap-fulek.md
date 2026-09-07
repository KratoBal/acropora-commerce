# Codex feladat: a terméklap fülekre bontása

## A repó és az ág

- repó: `KratoBal/acropora-commerce` (privát)
- alkalmazás: `apps/storefront` (Next.js, a Medusa `dtc-starter` alapján)
- csomagkezelő: **pnpm**, nem npm. A gyökérben `pnpm-workspace.yaml` áll.
- új ág a friss `main` fejéről, a neve kezdődjön ezzel: `feat/storefront-`

## Mit kell megcsinálni

A terméklapon ma a teljes leírás egyetlen tömbben áll. Bontsd fülekre.

A fülek, ebben a sorrendben, és csak az jelenjen meg, amelyikhez van tartalom:

1. **Leírás** (a termék leírás mezője, a táblázatok nélkül)
2. **Műszaki adatok** (a leírásban álló HTML táblázatok)

**Két fül van, nem három.** Egy korábbi változat harmadikként vízparamétereket kért.
Az kimarad, mert olyan mező ma nem létezik: a vízparaméterek a leírás szövegében állnak,
nem külön adatként, tehát nincs mire kötni. Amikor a mező elkészül, külön feladat lesz
belőle. Ne találgass metaadat kulcsot, és ne készíts elő üres harmadik fület.

## Négy kikötés

1. **Ha csak egy fülhöz van tartalom, ne jelenjen meg fül-sáv.** Egy magányos fül,
   amire rá lehet kattintani és nem történik semmi, rosszabb, mint ha nincs fül.

2. **Ne írj HTML-tisztítást.** A leírás nyers HTML formában áll a tárolóban, és a
   tisztítás külön munka, ami már folyamatban van (`sanitize-html`). A te feladatod
   a fülek szerkezete, nem a tartalom megjelenítése. Vedd úgy, hogy a leírás egy
   már megtisztított sztringként érkezik.

3. **Az első fül legyen kiválasztva betöltéskor**, és a fülváltás ne mozgassa el a
   lap görgetési pozícióját.

4. **Billentyűzettel is működjön.** A fülek fókuszálhatók, és a fókusz látszik.

## Amit a válaszban kérünk

- a megváltoztatott fájlok listája
- és egy mondat arról, **mit nem tudtál eldönteni**, ha volt ilyen

Ha valami hiányzik ahhoz, hogy elkezdd (hozzáférés, adat, döntés), azt nevezd meg
konkrétan, ne általánosságban.
