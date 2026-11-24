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

*(2026-11-18, kártya e0e2378b: a mátrix azóta a `shipping_payment_rule` táblában él, az Adminból állítható; a `SHIPPING_ROLE_PAYMENTS` konstans megszűnt. A sorok döntőit a `SHIPPING_PAYMENT_RULE_SEED` őrzi, a tábla kezdő állapotaként.)*

## D-2026-11-19-01: A hűségpont főkönyve a Medusa saját moduljában él

**Döntés:** Balázs 2026-11-18 21:30 UTC: a hűségpont kell, és a vevőnél kézzel is jóírható (kártya
`dfb79916`). A szállításra is beváltható (2026-10-06; a kupon nem). Az irányt acrobot 2026-11-19
00:33-kor jóváhagyta: a `loyalty` modul a Medusában, fő-könyvvel; az OS a modul admin útjain írja a
kézi jóírást.

**Mi ez:** a `loyalty_entry` tábla, soronként egy pontmozgás (`accrual`, `redemption`,
`adjustment`, `reversal`), előjeles egész ponttal. **Nincs egyenleg-oszlop:** az egyenleg a vevő
sorainak összege, tehát nem csúszhat el attól, ami megmagyarázza. Sor nem módosul; egy téves
jóírást ellenkező előjelű második sor javít. A `reference` egyedi, amíg ki van töltve: az újraküldött
mozgás egyszer tárolódik.

**Miért nem az OS-ben:** a beváltás a pénztáron, a kosár tranzakciójában kell (egyenleg-ellenőrzés,
foglalás), és az OS→Medusa irány már létezik. A fordított (Medusa→OS) hívás új, kívülről hívható OS
végpont lenne, ami a biztonsági irány miatt most nem épül.

**Miért nem promóció:** a promóció `order`/`items` célja csak a tételekre megy, a `shipping_methods`
célt a `refuse-shipping-discount.ts` őrző tiltja (a kedvezmény nem vonható a szállításból). A pont
viszont a szállítást is fedezi. A Medusa 2.22.4-ben erre a kosár- és rendelés-szintű *credit line*
való (az adó után vonódik le a végösszegből, tételhez nem kötött); a beváltás a következő PR-ok dolga.

**Ebben a PR-ban (1/n):** a modul, a migráció, az egyenleg olvasása (`GET /store/customers/me/loyalty`
a vevőnek, `GET /admin/loyalty/:customer_id` az OS-nek) és a kézi jóírás/levonás
(`POST /admin/loyalty/adjustments`). Kosár, beváltás és gyűjtés **nincs**. A vevő nézete nem hordoz
indokot és végrehajtót (egy kézi jóírás indoka belső jegyzet).

**Ami nyitott, és ezt nem találtuk ki:** (A) a gyűjtési arány és a pont értéke; (B) az ÁFA-kezelés:
a pont-levonás árcsökkentés (a számla alapja csökken) vagy fizetési eszköz (a teljes összegről szól
a számla, a pont fizeti). Az arány **beállítás lesz** (`commerce-settings`), nem kódkonstans, amikor
a gyűjtés elkészül; addig semmi nem olvassa. Öröklött szabály: meghiúsult utánvétes rendelésnél a
jóírt pont visszavonandó (`D-2026-08-23-25`, 6. pont): ez a `reversal` fajta dolga lesz.

**Ismert határ:** a levonás-ellenőrzés és a sor beszúrása egy tranzakcióban van, de a vevőt nem
zárolja: két egyszerre érkező levonás együtt a nulla alá vihet. Kézi levonást ember ad, ritkán; a
negatív egyenleg látszik. Sorzárral zárható, **nincs lemérve**.

## D-2026-11-19-02: A hűségpont beváltása a pénztáron (2/n): a mai UNAS-szabályok, beállításként

**Döntés:** acrobot 2026-11-19 09:49 (Balázs 2026-08-22-i UNAS-képernyőképe,
`docs/husegpont-mai-szabalyok-unas.md`, és az egy eltérés: Balázs 2026-11-18 21:30 UTC, kártya `790da0cd`):
a pont a **szállításra is** beváltható. A szabályok **beállítások, nem kód**, ezekkel az alapértékekkel:

| Beállítás | Környezeti változó | Alap |
|---|---|---|
| beváltás bekapcsolva | `LOYALTY_REDEMPTION_ENABLED` | **ki** (a teszt kirakaton bekapcsolva megy) |
| 1 pont értéke forintban | `LOYALTY_POINT_VALUE_HUF` | 1 |
| a rendelés legalább (Ft, a hitelek előtti végösszeg, szállítással) | `LOYALTY_MIN_ORDER_HUF` | 30 000 |
| legalább ennyi pont egyszerre | `LOYALTY_MIN_POINTS` | 100 |
| a végösszeg hány százaléka fizethető pontból | `LOYALTY_MAX_PERCENT` | 100 |

**2026-11-24-től az admin is állítja** (Balázs: „minden szám és kapcsoló adminból állítható, a kép értékei az
alapértékek", kártya `dfb79916`): mindegyiknek van commerce-beállítás kulcsa (`loyalty_redemption_enabled` 0/1,
`loyalty_point_value_huf`, `loyalty_min_order_huf` (0 = nincs alsó határ), `loyalty_min_points`,
`loyalty_max_percent`), és mezőnként **a tárolt sor nyer a környezeti változó fölött, az az alapérték fölött**. Egy
sor, ami a határán kívül esik, nem dob (a pénztár nem állhat meg rajta): kimarad, és a környezet, majd az alapérték
válaszol. Az OS a `GET /admin/loyalty-settings` végpontot olvassa (az értékek és a forrásuk: `row`, `env`,
`default`), és a `POST /admin/commerce-settings` kulcsra ír.

Hibás, nulla, negatív vagy tört érték **a környezeti változóban** az **alapértéket** adja, soha nem találgatást; csak a pontos `true`
kapcsolja be a beváltást. A gyűjtés (3 százalék, akciós tétel után nincs, jóváírás a rendelés „lezárva"
státuszakor), a regisztrációért és a hírlevélért járó pont **nincs ebben a PR-ban**.

**Mi ez:** a pont a kosáron *credit line* (`reference = loyalty_points`, `reference_id` a vevő,
`metadata.points`), az ajándékkártyáéval azonos mechanikával (nautilus #818): fizetési eszköz-szerű, a
szállítást és az utánvét díjat is fedezi, a fizetési gyűjtemény frissül, a nulla Ft-os végösszeg útja már
megvan. Az **ÁFA (B kérdés) nyitott**: ez az olvasat „a teljes összegről szól a számla, a pont fizeti". Ha
árcsökkentés kell (a számla alapja csökken), azt a könyvelővel az OS-számla oldalán kell eldönteni, és a
credit line helyett más út kell.

**Folyamat:** `POST/DELETE/GET /store/carts/:id/loyalty-points` (belépett vevő, saját kosár; a kosár más vevőjé
úgy válaszol, mint a hiányzó): a pont a főkönyvhöz **nem nyúl**, csak a credit line készül; a főkönyvbe a
`complete-cart` ellenőrző horog veszi be, **utolsóként**, `redemption` sorral (`reference = redeem:<kosár>`), és
visszavonja, ha a befejezés elhasal (kompenzáció: a sor törlődik, a kulcs felszabadul). A kosár frissítése
plafonozza a hitelt (egész pontra lefelé, a minimum alatt lekerül). A rendelés lemondása egy `reversal` sorral
visszaadja a pontot (`reference = reverse:<kosár>`, egyszer). **A visszatérített rendelés pontja tehát
visszajár**: ez eltérés a mai UNAS-tól (ott bent marad), és Balázs dönti (acrobot jelzi).

**Kizárások:** ajándékkártya és pont egy kosárban nem lehet (két hitel egymás plafonját is bonyolítaná; a
nautilus-féle ajándékkártya-végpont is elutasítja a pontot hordozó kosarat); vegyes (két rendelésre bomló)
kosárnál nincs beváltás, mint az ajándékkártyánál.

**Zárolás:** minden mozgás a vevő kulcsán `pg_advisory_xact_lock`-ot vesz (nincs egyenleg-sor, amit zárolni
lehetne): a kosárból jövő levonások nem vihetnek együtt a nulla alá. A kézi levonás (`addEntryChecked`) még
nem zárol: a fenti „ismert határ" arra áll.

**NINCS LEMÉRVE valódi Postgresen:** a zár, a `softDelete`, a tranzakció-kezelés (helyi Postgres nincs). A
szabályok egy memóriabeli főkönyvön vannak mérve; a stage-en HTTP-vel mérendő: pont jóírása, beváltás,
rendelés, lemondás, hibás befejezés utáni visszaadás.

## D-2026-11-24-01: A hűségpont gyűjtése: a lezárt rendelés után, a mai bolt szabályával, mind állítható

Balázs 2026-11-24 (kártya `dfb79916`; a mai UNAS pontgyűjtési beállítás képe, emlék 2935): 1 pont = 1 Ft, a pont a
**bruttó ár 3 százaléka**, **akciós áron vett tételre nem jár**, a jóváírás a „Megrendelés lezárva" állapotnál történik;
minden szám és kapcsoló adminból állítható.

- **Beállítások** (commerce-beállítás kulcsok; sor, vagy az alapérték, környezeti forrás nincs): `loyalty_accrual_enabled`
  (0/1, **alapból 0, KI**), `loyalty_accrual_percent` (0 és 100 között, alap 3), `loyalty_accrual_on_sale_items` (0/1, alap 0).
  A forintérték ponthoz a beváltás `loyalty_point_value_huf` beállítása. Egy hibás tárolt kapcsolósor és egy sikertelen
  beállítás-olvasás is **KI**-t jelent (a pénznél a biztonságos irány), a számnál a hibás sor az alapértéket adja; a
  `GET /admin/loyalty-settings` az `accrual` mezőben mutatja az értékeket és a forrásukat.
- **Az alap:** a tételek bruttó `total`-ja (az adó benne, a tétel saját kedvezménye kint), csak az olyan tételekre, amelyek nem
  akciós áron lettek megvéve (a tételen a Medusa `compare_at_unit_price`-a a vásárláskori akciót jelzi, tehát egy későbbi
  árváltozás nem mozgatja a már leadott rendelést), megszorozva azzal a résszel, amit pénzből fizettek (a pontból vagy
  ajándékkártyából fizetett rész után nincs pont). Lefelé kerekítve, egész pont.
- **A jóváírás helye:** az állapotváltó munkafolyamat (`transition-order-business-status`) a váltás UTÁN, ha az új állapot
  `closed`. Minden út (admin, futár, fizetési út) ezen megy át. A hibája nem bukja a váltást: naplóba kerül a rendelés, a
  vevő és a pont, kézzel pótolható (az OS kézi jóírásával). Egyszer jár rendelésenként: a főkönyv kulcsa `accrue:<rendelés>`.
- **Nincs pont:** vendég rendelésre, kikapcsolt gyűjtésnél, és ha az összeg egy pont alá kerekedik. **A vendég rendelésnek
  IS van `customer_id`-ja** (mérve a teszt Medusán 2026-11-24: egy csak e-mailt kapott kosár kapott vevőt; barracuda, #882): a
  Medusa az e-mailhez `has_account = false` vevőt keres vagy hoz létre. Ezért a jóváírás a vevő rekordját kéri le, és csak
  `has_account = true` vevőnek ír jóvá (hiányzó jelző: nincs jóváírás); aki később ugyanazzal az e-maillel regisztrál, más (`true`)
  vevő lesz, a vendégként gyűjtött pont tehát nem járna neki sem.
- **Közelítés, kimondva:** a pénzből fizetett rész aránya a TELJES rendelésre számol (a szállítással együtt), az alap viszont csak a
  tételeké; ha a pont a szállítást fizette, a tételek arányos része kap kevesebb pontot.
- **Nyitott, nem döntöttem el:** a lezárt rendelés utólagos visszavonása (lemondás, visszáru) a pontot nem veszi vissza;
  a regisztráció és a hírlevél 500-500 pontja külön tétel; az ÁFA-kezelés (árengedmény vagy fizetési mód) Balázs döntése.
