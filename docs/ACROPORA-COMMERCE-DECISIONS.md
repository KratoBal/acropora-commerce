# Acropora commerce decisions

This file is the commerce home of the dated decision log: the decisions that bind
code in this repository. Each entry names who made the decision and when, because
a decision draws its authority from its author and its date, not from its wording.

Entries are reproduced verbatim, in the Hungarian in which they were recorded, from
the fleet's own `docs/ACROPORA-COMMERCE-DECISIONS.md`. That file holds the COMPLETE
series, including entries internal to the fleet that do not bind this repository.
This is why the identifiers here are not contiguous: the gaps are not lost entries,
they are entries that belong elsewhere. An identifier means the same decision in
both files. Where the two files disagree, the identifier is the anchor, and the
disagreement is a defect to be fixed rather than a difference to be interpreted.

Entries are not rewritten retroactively. A decision that ceases to hold is
invalidated by a new entry that names the invalidated one.

---

## D-2026-08-23-18: Az ingyenes szállítás küszöbe BRUTTÓ

**Döntés (Balázs, 2026-08-23 14:38):** az 50 000 forintos küszöb **bruttó** áruértékre
vonatkozik, tehát adóval növelt összegre.

Ez a kérdés 2026-08-22 09:14 óta állt nyitva, és a mai formájában így hangzott: a küszöb az
`unit_price` szorozva mennyiséggel értékkel hasonlít, tehát a válasz azon múlik, hogy a régió
árai adóval értendők vagy nélküle. **A válasz: adóval.**

---

## D-2026-08-23-19: A nehézáru jelölés TERMÉKENKÉNTI, az összeadódás nincs kezelve

**Döntés (Balázs, 2026-08-23 14:38), szó szerint:** a 20 kilós határ a **terméknél van
jelölve**; ha több termékből jön össze a 20 kiló feletti súly, azt **jelenleg nem kezeljük**.

**Ez tudatosan vállalt hiány, nem elnézés.** Azért kell leírni, mert később pontosan úgy fog
felszínre kerülni, hogy valaki megkérdezi: miért ment normál szállítással egy rendelés, ami
összesen huszonöt kiló volt. A válasz akkor is ez a döntés lesz.

**Ami ebből következik a kódra:** a besorolás a tétel saját jelöléséből dolgozik, nem a kosár
összsúlyából. A kosár-szintű összeadás **nem** hiányzó funkció, hanem ki nem választott
viselkedés, és ha valaha kell, az külön döntés.

---

## D-2026-08-23-20: Az utánvét díja nem szállítási díj, és saját domain építője van

**Döntés (Balázs, 2026-08-23 14:52, feladatleírásban):** a helyes modell **termékek plusz
szállítás plusz utánvét kezelési díj**. Nem elfogadható: szállítási kiigazítás, negatív
kiigazítás, rejtett szállítási felár, beégetett összeg, és a kliens által küldött összeg.

**Az architektúra elve, nautilus javaslatából átvéve:** *egy szabály, egy ellenőr, több
beszúró*. Az üzleti szabály egy közös domain építőben áll, és a későbbi beszúró pontok
(pénztár, piszkozat-rendelés, saját rendelés-létrehozás) **nem duplikálhatják**.

**Az építő tiszta domain kód:** nincs benne HTTP, Medusa folyamat, fizetési logika és
rendelés-létrehozás.

---

## D-2026-08-23-21: A díj-jelölés központi szerződés

**Döntés (Balázs, 2026-08-23 14:52):** a jelölés központi konstans, nem szétszórt szöveg:

```json
{ "acropora_line_item_kind": "fee", "fee_type": "cash_on_delivery" }
```

Erre kell tudnia támaszkodni a `goods_total` kizárásnak, a számlázásnak, a visszatérítésnek és
a riportolásnak. **Duplikáció-védelem:** ha már létezik `fee_type = cash_on_delivery`, ne
lehessen még egyet létrehozni.

---

## D-2026-08-23-22: Adóval értendő áruérték invariáns

**Döntés (Balázs, 2026-08-23 14:52), a 2026-08-23 délutáni mérés nyomán:** az áruérték
számítása **csak akkor helyes, ha az alapul szolgáló árak adóval értendő fogyasztói árak**.

**A rendszer nem támaszkodhat kimondatlan feltevésre.** Az árazási tartományban:

- az adóval értendőség **legyen ismert**, ne feltételezett
- nettó és bruttó érték **keverése tilos**
- ha egy tétel adózási státusza nem ismert vagy nem kompatibilis: **explicit hiba**, nincs
  tartalék érték, és nincs csendes továbbhaladás

**Az elv, ami ezt hordozza, és amit Balázs ugyanígy mondott ki a fuvardíjaknál:** a rossz ár
veszélyesebb, mint az explicit hiba.

**Kiterjesztett szabály, ami minden jövőbeli munkára áll:** minden új árazási bemenetnél
**előre** definiálni kell az adó-szemantikát.

**Ami a döntést kiváltotta:** az áruérték ma két mezőből számol (egységár és mennyiség), és
sehol nem nézi az adóval értendőséget; a típusban nincs is ilyen mező. A repóban egyetlen
helyen szerepel adóval értendőség, a saját szolgáltatónkban, tehát arra a számra, amit **mi
állítunk elő**. Arra, amivel **összehasonlítunk**, eddig csak feltevés volt.
