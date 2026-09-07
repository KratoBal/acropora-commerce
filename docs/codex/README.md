# Feladatok a külső fejlesztőnek (Codex)

Ez a mappa a feladatlista. Minden fájl egy önálló feladat, sorszámozva.

## A menet

1. Nézd meg, mely fájlok állnak itt, és melyiken nincs még nyitott pull request.
2. Vedd a legkisebb sorszámút, amin még nem dolgozik senki.
3. Új ág a friss `main` fejéről. Az ág neve kezdődjön a feladat sorszámával, például
   `feat/01-termeklap-fulek`.
4. Amikor kész, nyiss pull requestet, és a leírásában hivatkozz erre a fájlra.

## Amit minden feladatra tudni kell

- A csomagkezelő **pnpm**, nem npm. A gyökérben `pnpm-workspace.yaml` áll.
- A kirakat az `apps/storefront` mappában van (Next.js, a Medusa `dtc-starter` alapján).
- A bolt maga az `apps/backend` (Medusa 2.19).
- A `main` ág a mérce. Mielőtt ágat vágsz, húzd le a friss fejét.
- A pull requestre lefut a `verify` ellenőrzés. Zöld nélkül nem olvasztjuk be.

## Amit a válaszban mindig kérünk

- a megváltoztatott fájlok listája,
- és egy mondat arról, **mit nem tudtál eldönteni**, ha volt ilyen.

Ha valami hiányzik ahhoz, hogy elkezdd (hozzáférés, adat, döntés), nevezd meg
konkrétan, ne általánosságban. Egy megnevezett akadályt egy nap alatt elhárítunk,
egy általánosat nem tudunk.

## Amihez ne nyúlj

- A `main` ágra közvetlenül ne írj.
- Más nyitott ágakat ne alapozz újra, és ne írj felül semmit erőltetett feltöltéssel.
- Az éles boltba (shop.acropora.hu) semmilyen körülmények között ne írj.
