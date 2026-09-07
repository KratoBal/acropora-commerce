# Codex feladat: mennyiségi léptető a terméklapon

## A repó és az ág

- repó: `KratoBal/acropora-commerce` (privát)
- alkalmazás: `apps/storefront` (Next.js, a Medusa `dtc-starter` alapján)
- csomagkezelő: **pnpm**, nem npm. A gyökérben `pnpm-workspace.yaml` áll.
- új ág a friss `main` fejéről, a neve kezdődjön ezzel: `feat/04-`

## Mit kell megcsinálni

A terméklapon ma nem lehet egynél több darabot a kosárba tenni egy lépésben. Aki
három zsák sót akar, háromszor kattint, vagy a kosárban javít. Adj a kosárba tevő
gomb mellé mennyiségi léptetőt.

## Öt kikötés

1. **Az élő állat lapján NE jelenjen meg.** A boltban van olyan termék, amiből
   egyetlen konkrét példány létezik. Ezeknél a mennyiség fogalma értelmetlen, és a
   lap már ma is jelvényt mutat helyette. A megkülönböztetés a terméklap
   komponensében már megvan (a készlet-állapot doboz kap egy logikai értéket arról,
   hogy egyedi példányról van szó); ugyanazt az értéket használd, ne vezess be
   másikat, és ne a termék nevéből vagy kategóriájából következtess.

2. **A felső határ a készlet, ha a bolt kezeli a készletet.** Ha a termék készletet
   vezet és nem rendelhető előre, a léptető ne engedjen a raktáron lévő
   darabszámnál többet. Ha a bolt nem vezet készletet vagy engedi az előrendelést,
   nincs felső határ.

3. **Az alsó határ 1, és nem lehet üresen hagyni.** Kézi beírásnál a nem szám, a
   nulla, a negatív és a törtszám mind 1 legyen. Ne dobj hibaüzenetet érte.

4. **A kosárba tevés a beállított mennyiséget vigye, egyetlen kéréssel**, ne
   ugyanazt a hívást ismételje meg annyiszor, amennyit a vevő beállított.

5. **Billentyűzettel is működjön.** A mező fókuszálható, a két gomb elérhető, és a
   fókusz látszik.

## Amit a válaszban kérünk

- a megváltoztatott fájlok listája
- és egy mondat arról, **mit nem tudtál eldönteni**, ha volt ilyen

Ha valami hiányzik ahhoz, hogy elkezdd (hozzáférés, adat, döntés), azt nevezd meg
konkrétan, ne általánosságban.
