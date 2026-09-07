# Codex feladat: a kategória oldal, alkategóriákkal és termékekkel

## A repó és az ág

- repó: `KratoBal/acropora-commerce` (privát)
- alkalmazás: `apps/storefront` (Next.js, a Medusa `dtc-starter` alapján)
- csomagkezelő: **pnpm**, nem npm. A gyökérben `pnpm-workspace.yaml` áll.
- új ág a friss `main` fejéről, a neve kezdődjön ezzel: `feat/05-`

## Miért ez a feladat, egy mérésből

A régi boltban egy szülő kategória oldala **csak alkategória csempéket** mutat, termékeket
soha. Ez így nézett ki döntésnek, de nem az: lemértük, hogy a `Termékek|Nyomelemek`
kategóriának **21 saját terméke** van, és a látogató **egyet sem lát** belőlük, csak hét
márka csempét. Vagyis a régi bolt akkor is elrejti a termékeket, amikor van mit mutatni.

Az új kirakat ne ezt másolja.

## Mit kell megcsinálni

Egy kategória oldala **mindkettőt** mutassa, ebben a sorrendben:

1. az alkategóriák sávja
2. alatta a kategória **saját** termékeinek rácsa

## Öt kikötés

1. **Ha a kategóriának nincs saját terméke, a termék rács szekció EGYÁLTALÁN ne jelenjen
   meg.** Ne üres rácsot mutassunk, hanem semmit. Ugyanez fordítva is: ha nincs
   alkategória, az a sáv marad el.

2. **Ha 16-nál több közvetlen alkategória van, az alkategória sáv ne foglalja el a teljes
   magasságot.** Csukd össze, vagy tedd görgethető dobozba, és adj mellé egy „mind a N
   megtekintése" hivatkozást. A cél az, hogy a saját termékek görgetés nélkül is látható
   távolságra kerüljenek. A gyökér kategóriának 76 alkategóriája van, tehát ez nem
   elméleti eset. 16 alatt a teljes csempesor elfér a rács fölött, ott ne csukj össze
   semmit.

3. **A termék rács a kategória SAJÁT termékeit mutassa**, ne a leszármazottakét. A
   leszármazottak a saját oldalukon jelennek meg, oda az alkategória csempe visz.

4. **A kategórianeveket trimelve jelenítsd meg.** A forrásadatban előfordul, hogy egy
   kategórianév záró szóközzel áll, és ez a csempén ne látszódjon.

5. **A lapozó a rács alatt legyen, és csak akkor jelenjen meg, ha van második oldal.**

## Amit a válaszban kérünk

- a megváltoztatott fájlok listája
- és egy mondat arról, **mit nem tudtál eldönteni**, ha volt ilyen

Ha valami hiányzik ahhoz, hogy elkezdd (hozzáférés, adat, döntés), azt nevezd meg
konkrétan, ne általánosságban.

## Egy dolog, amit előre tudnod kell

A terméklap vázát épp most építi át valaki más, a jóváhagyott terv szerint. Ez a feladat
szándékosan a **kategória** oldalt érinti, hogy ne ütközzetek. Ha mégis ugyanahhoz a
fájlhoz kellene nyúlnod, azt írd meg, és ne oldd fel magadtól.
