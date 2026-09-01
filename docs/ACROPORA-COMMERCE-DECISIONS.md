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

**Az architektúra elve, nautilus javaslatából átvéve:** _egy szabály, egy ellenőr, több
beszúró_. Az üzleti szabály egy közös domain építőben áll, és a későbbi beszúró pontok
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

---

## D-2026-08-23-23: Az aktív kosárban lévő utánvét-díj nem árazódik át

**Döntés (Balázs, 2026-08-23 16:16, Discord, az Eldöntendő dolgok szálban), szó szerint:** a
konzervatív döntést fogadjuk el, az aktív kosár utánvét-díja **nem árazódik át** a beállítás
változásakor.

**Mit jelent a gyakorlatban:** ha egy kosárban már ott a díj 450 forinttal, és az üzemeltető
átállítja a beállítást 550 forintra, az a kosár **marad 450 forinton**. Az új összeg a következő
kosárnál lép életbe.

**Az indok, ami a döntést hordozza (nautilus mérése és javaslata):** az átárazás elvenné a
vásárló alól a végösszeget, és **törölné a kosár fizetési munkamenetét**. Vagyis egy rutin
adminisztrátori árváltoztatás visszadobná az összes élő kosarat a fizetési lépésre, olyan
emberek alatt, akik éppen fizetni készültek.

**Ez a döntés eredetileg implementációs választásnak indult**, és azért került fel, mert üzleti
következménye van. Nautilus a konzervatívat választotta, megindokolta, és kimondta, hogy nem az
ő döntése. Ezzel a megerősítéssel **követelmény lett, nem választás**: ha valaha valaki
átárazást akar bevezetni, az egy új döntés, nem egy javítás.

**Kapcsolódó, ugyanebben a körben megerősítve:** a folyamat-definíció import-idejű tesztje
marad. Egy olyan hiba, ami a típusellenőrzésen és a fordításon is átmegy, de induláskor
elhasal, csak így jelenik meg a folyamatos integrációban.

---

## D-2026-08-23-24: Az utánvét fizetési szolgáltató modellje külön tervezés, nem a gyári alapértelmezetten

**Döntés (Balázs, 2026-08-23 16:43, Discord, az Eldöntendő dolgok szálban), szó szerint:** a
következő körben **külön tervezzük meg** az utánvét fizetési szolgáltató modelljét, és **nem
kötjük a `pp_system_default` szolgáltatóhoz**.

**A döntés kontextusa, és ezt Balázs mérte, nem mi:** a stage audit igazolta, hogy az utánvét
díjának futásidejű bekötése helyes, **de nincs élő utánvét szolgáltató-hozzárendelés**. Ez
független megerősítése annak, amit a PR 10 leírása is kimondott: minden út szerkezetileg helyes
és teszttel fedett, de az első valódi utánvétes kosár lesz az első végrehajtás.

**Mit zár ki ez a döntés:** azt a kényelmes utat, hogy a gyári alapértelmezett szolgáltatót
nevezzük ki utánvétnek, csak hogy a szerep kitöltődjön. Az gyorsan működne, és utólag nagyon
nehéz lenne visszabontani, mert a rendelések már azzal a szolgáltató-azonosítóval jönnének létre.

**A következő kör jellege ebből következik:** a fizetési szolgáltató bekötése **külön tervezési
munka**, nem a mostani folytatása.

**Ami a PR 10 beolvasztásával lezárult:** a domain és a folyamat kész, a szabály egy helyen áll,
a három beszúrási pont viselkedése szándékosan különbözik (a végpont ad és töröl, a kosár-frissítő
hook csak töröl és sosem dob, a lezárási kapu csak ellenőriz).

---

## D-2026-08-23-25: Az utánvét hat üzleti szabálya

**Döntés (Balázs, 2026-08-23 17:21, a PR12 feladatleírásában), a PR11 architektúra-dokumentum
hat nyitott kérdésére válaszul. Szó szerint:**

1. **Az utánvétes rendelés akkor tekinthető fizetettnek, amikor a pénz ténylegesen beérkezett
   hozzánk.** Nem a rendelés létrejöttekor.
2. **Az utánvétes rendelés azonnal teljesíthető.** A raktár nem vár a pénzre.
3. **Sikertelen kézbesítésnél nem töröljük a rendelést**, hanem sikertelenül lezárt
   rendelésként kezeljük.
4. **Visszaküldés esetén az utánvét díját is visszaadjuk.**
5. **A pénz beérkezésének elismerése külön jogosultsághoz kötött**, nem általános
   adminisztrátori művelet.
6. **Meghiúsult utánvétes rendelésnél a hűségpont nem marad meg**; ha jóváírás történt, vissza
   kell vonni.

**Miért egy bejegyzés hat helyett:** együtt érkeztek, egy architektúra-dokumentum hat nyitott
kérdésére, és együtt is olvasandók. Az első dönti el a szolgáltató egyetlen metódusának
viselkedését, a többi ebből következik vagy erre épül.

**Amit az első és a második együtt jelent, és ez a lényeg:** a teljesítés és a fizetés
**szétválik**. A raktár dolgozhat, miközben a pénz még nem érkezett meg. Ehhez nem kell azt
hazudni, hogy a rendelés ki van fizetve: a Medusa `pending_authorization` állapota pontosan ezt
az esetet ismeri, és nem hoz létre fizetés-rekordot.

**A harmadik új fogalmat vezet be:** a sikertelenül lezárt rendelés. Ez nem törlés és nem
visszatérítés, mert **pénzmozgás nem történt**. Ez az Acropora OS oldalán is megjelenik majd,
tehát murena területét is érinti.

**A hatodik részben megválaszol egy korábban nyitott tételt:** a `D-2026-08-22-08` alatt a
hűségpont refund-viselkedése kimérendőként állt. A meghiúsult utánvétes kézbesítésre most van
szabály. **Ami továbbra sem eldöntött:** a részleges visszatérítés általános esete.

## D-2026-09-01-01: A nehézáru szállítás utánvéttel is fizethető

**Döntés (Balázs, 2026-09-01 20:40, Discord, szó szerint):** _„Legyen utánvét"_.

**Amire vonatkozik:** a `GLS_HEAVY` szerepkör, ami **két** szállítási módot fed le, a
nehézáru házhozszállítást és a nehézáru csomagpontot. A válasz mindkettőre áll.

**Ami nem változik:** a bolti átvétel utánvét nélkül marad (nincs mit kézbesíteni), a
sima GLS házhozszállításnál és csomagpontnál pedig eddig is volt.

**Amiért ez a bejegyzés a döntésnél többet rögzít.** A `GLS_HEAVY` sor eddig csak online
kártyát engedett, és **sehol nem állt, hogy ez szándékos-e**. Nem az volt: kimondatlan
állapot, ami élt és hatott a vevőre, miközben senki nem tudta megmondani, ki döntött így.
Egy hiányzó adatot megkérdezünk, és addig nem történik semmi; egy kimondatlan döntés
viszont közben működik. A kettőt csak az különbözteti meg, hogy le van-e írva.

**Ezért a `SHIPPING_ROLE_PAYMENTS` minden sora mostantól megnevezi a döntőjét**, és ahol
nincs döntés, ott ez is ki van írva: a `FOXPOST` sor az eredeti építésből maradt, és
Balázst **soha nem kérdeztük meg róla**. Nem döntésként szerepel, hanem megerősítetlenként.
