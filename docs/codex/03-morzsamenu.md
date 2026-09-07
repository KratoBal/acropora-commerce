# Codex feladat: morzsamenü a terméklapon

## A repó és az ág

- repó: `KratoBal/acropora-commerce` (privát)
- alkalmazás: `apps/storefront` (Next.js, a Medusa `dtc-starter` alapján)
- csomagkezelő: **pnpm**, nem npm. A gyökérben `pnpm-workspace.yaml` áll.
- új ág a friss `main` fejéről, a neve kezdődjön ezzel: `feat/storefront-`

## Mit kell megcsinálni

A terméklapon ma nincs morzsamenü (breadcrumb). A vevő nem látja, melyik
kategóriából érkezett, és nem tud egyetlen kattintással egy szinttel
feljebb lépni a kategória-fában.

Adj hozzá egy morzsamenüt a terméklap tetejéhez, ami a kategória-fa
gyökerétől a termékig vezető utat mutatja, minden köztes szint saját
kategória-oldalára mutató hivatkozással.

## Öt kikötés

1. **A forrás a termék ELSŐDLEGES (base) kategóriája.** Egy termék több
   kategóriában is szerepelhet (elsődleges/base és másodlagos/alternatív
   besorolás egyaránt előfordul a mai adatban) - a morzsamenü KIZÁRÓLAG az
   elsődleges kategória útvonalát mutassa, a másodlagos besorolásokat
   figyelmen kívül hagyva.

2. **Az első elem mindig "Főoldal"**, utána a kategória-fa minden szintje
   sorban, a legfelső (gyökér) kategóriától a termék saját, legmélyebb
   kategóriájáig, végül a termék saját neve.

3. **Minden elem kattintható link a saját oldalára, KIVÉVE az utolsót** (a
   termék saját neve) - az sima szöveg, nem link, mert az az aktuális
   oldal.

4. **A kategórianeveket TRIMELVE (vezető és záró szóköz nélkül)
   jelenítsd meg.** A forrásadatban előfordul, hogy egy kategórianév záró
   szóközzel áll - ez a morzsamenüben ne látszódjon (se extra szóközként,
   se törésként).

5. **Mély útvonalakra is fel kell készülni.** A kategória-fában előfordul
   4 szintes elágazás is (pl. `Termékek > Világítástechnika > LED
   világítások > Aqua Illumination`), ami a "Főoldal" és a terméknév
   elemekkel együtt akár 6 elemet is jelenthet egy sorban. Ez ne törje meg
   csúnyán a sort keskeny (mobil) nézetben - vízszintes görgetés vagy a
   középső elemek csonkítása ("...") elfogadott megoldás, a cél az, hogy
   az első (Főoldal) és az utolsó (jelenlegi oldal) elem mindig látható
   maradjon.

## Amit a válaszban kérünk

- a megváltoztatott fájlok listája
- és egy mondat arról, **mit nem tudtál eldönteni**, ha volt ilyen

Ha valami hiányzik ahhoz, hogy elkezdd (hozzáférés, adat, döntés), azt
nevezd meg konkrétan, ne általánosságban.
