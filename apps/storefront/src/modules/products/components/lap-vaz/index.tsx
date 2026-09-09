import React from "react"

/**
 * A MUSZAKI TERMEKLAP VAZA -- A DOBOZOK A HELYUKON, TARTALOM NELKUL.
 *
 * === MIERT VAN KULON VAZ-KOMPONENS ===
 *
 * Balazs kerese (2026-09-07, acrobot atadasaban, szo szerint): "ha ugy epul fel
 * ahogy a tervben van de meg nem mukodik a funkcio engem az se zavar! sot!
 * annak orulnek a legjobban".
 *
 * Vagyis a lap ALLJON OSSZE ugy, ahogy a terv mutatja, es ami mogott nincs kesz
 * funkcio, az legyen ott URESEN. Ez FELULIRJA a korabbi szabalyt, hogy ures
 * doboz ne jelenjen meg -- az egy MUKODO boltra szolt, ez vazra.
 *
 * === A SORREND MERESBOL JON, NEM EMLEKEZETBOL ===
 *
 * A tervfajl (`exchange/design-balazs/termeklap-1b-es-2a-2026-09-07.html`) nem
 * statikus HTML: 846 872 bajtbol 844 134 egy `<script>` belsejeben all, es a
 * valodi jelolo 562 karakter. A jelolo escape-elt sztringkent van a kotegben;
 * kibontva 839 528 karakter olvashato HTML, es abbol jon az alabbi sorrend.
 *
 * A tervben HAROM lap all, ket szakaszban: a sotet korall lap (2a), es a
 * "1. KOR" szakasz KET vilagos muszaki lapja (1a es 1b). Ez a vaz a ket
 * vilagos lap UNIOJAT koveti -- a reszletes bontas lentebb, a dobozlistanal.
 *
 * (Itt korabban az allt, hogy a tervben HAT lap-valtozat van, harom elo allat
 * es harom muszaki, es hogy a vaz "a legteljesebb muszaki valtozatot" koveti.
 * Mind a ketto hamis, es mind a ketto tullepte a sajat hatokoret: a terv sajat
 * "N. KOR" cimei ketto szakaszt neveznek meg, a geometrian a muszaki savon TUL
 * nulla doboz all, es a lista nem egy valtozate, hanem ketto union. Kontroll: a
 * "KOR" szora negy doboz jon, ketto szakaszba esve, tehat a nulla nem a kereses
 * tulajdonsaga.)
 *
 * === MIERT SLOTOK, ES NEM KESZ TARTALOM ===
 *
 * A vaz azt rogziti, MI HOL ALL. Hogy egy dobozban valodi adat legyen-e (nev,
 * ar, kep a Medusabol) vagy semleges jelzes, az KULON dontes, es a tartalom
 * retegehez tartozik. Igy barmelyik valasz eseten csak a tartalom valtozik, a
 * szerkezet nem.
 *
 * ES AMI KIKOTES: ide NEM KERUL KITALALT ADAT. A tervben minden szam kitalalt
 * (289 900 Ft, PAR 380, 41 ertekeles); egy uresen hagyott doboz becsuletes, egy
 * kitalalt ertekkel feltoltott doboz kesobb tenynek olvasodik.
 */

/**
 * MELYIK OSZLOPBA KERUL EGY DOBOZ.
 *
 * A tervbol merve, fejeless bongeszoben, 1440 pixeles nezetben:
 *
 *     tartalom-oszlop   1352 px, x=100-tol
 *     BAL                856 px  (x=100)
 *     koz                 44 px
 *     JOBB               452 px  (x=1000)
 *
 *     856 + 44 + 452 = 1352, tehat a szamok zarnak.
 *
 * EGY CSAPDA, AMIT KULON MEGNEZTEM: a tervben allnak dobozok x=1520-nal is, ami
 * ELSORE jobb oszlopnak latszik. Nem az: a nezeten KIVUL vannak, tehat egy
 * MASIK lap-valtozathoz tartoznak. Ha azokat vettem volna a jobb oszlopnak, a
 * szamok nem zartak volna.
 */
type Oszlop = "teljes" | "bal" | "jobb"

type VazSzakasz = {
  /** A doboz azonositoja, a tervbeli sorrend szerint. */
  kulcs: string
  /** A cim, ahogy a tervben all. Ures sztring: a doboznak nincs kiirt cime. */
  cim: string
  /** Mit mondunk, amig nincs mogotte tartalom. */
  varakozo: string
  /** Melyik oszlopba kerul az asztali nezetben. */
  oszlop: Oszlop
  /**
   * EGY KOZOS KERETES PANEL AZONOSITOJA, HA A TERV IGY TARTJA OSSZE.
   *
   * A tervben a jobb oszlop NEM annyi keretes doboz, ahany szakaszunk van.
   * Merve a tervlap jelolojen (2026-09-08, pontos tag-parositassal): a jobb
   * oszlopnak HAROM kozvetlen, keretes gyereke van, nem hat:
   *
   *   1. ar + brutto/cikkszam + keszlet + szallitas + atvetel + Kosarba + DOA
   *   2. Kotegajanlat            -- KULON panel
   *   3. Kerdezd a boltot        -- KULON panel
   *
   * Az EGYMAS UTAN allo, azonos `csoport` erteku szakaszok egyetlen keretes
   * panelbe kerulnek. A szakaszok maguk megmaradnak: a horgonyuk
   * (`#vaz-<kulcs>`), az azonositoik es az ures-allapotuk valtozatlan, csak a
   * sajat keretuket nem rajzoljak ki. Ez azert fontos, mert a ragados sav
   * gombja a `#vaz-mennyiseg` horgonyra ugrik.
   */
  csoport?: string
}

/**
 * A TIZENNEGY DOBOZ, A TERVBELI SORRENDBEN.
 *
 * A `varakozo` szoveg SEMLEGES: megmondja, mi jon ide, es nem allit semmit a
 * termekrol. Ez a kulonbseg a "meg nem kesz" es a "kitalalt adat" kozott.
 *
 * === HONNAN JOTT A LISTA, ES MIERT SZAMIT ===
 *
 * A tervfajl (`exchange/design-balazs/termeklap-1b-es-2a-2026-09-07.html`)
 * MUSZAKI lapjaibol -- es ez a mondat 2026-09-08-ig pontatlan volt, ezert all
 * itt reszletesen.
 *
 * A FAJLBAN HAROM LAP ALL EGYMAS ALATT, nem ketto. A terv sajat bal-margos
 * cimkei nevezik meg oket, es a legkulso konteneek sajat szoveges cimet
 * viselnek:
 *
 *   2a   "2. KOR WYSIWYG korall termekoldal -- az 1b szerkezete, sotet feluleten"
 *   1a   "1. KOR Termekoldal -- technikai termek (LED lampa), vilagos irany,
 *         ket valtozat"  (ezen belul az elso lap)
 *   1b   ugyanaz a szakasz, masodik lap
 *
 * ES A LISTA A KET VILAGOS LAP UNIOJA, nem az 1b-e egyedul. Merve, laponkent
 * (a lap-hovatartozas DOM-beli, nem y-koordinata: a ket szakasz-kontener
 * ATFED, a korall magassaga 2400, a muszaki mar 2243-nal indul):
 *
 *   csak 1a-n:   a negy adat-csempe, "Műszaki adatok",
 *                "Nem vagy biztos a méretben?"
 *   csak 1b-n:   "Csomagajánlat", "Kérdezd minket", "Hasonló lámpák",
 *                "Elég lesz ez a lámpa az akváriumodra?"
 *   mindketton:  a termek neve, az ar, a "Kosárba", "Ami még kellhet hozzá"
 *
 * A LISTA IGY MARAD (acrobot dontese, 2026-09-08): Balazs a vazat ebben az
 * alakban latta es hagyta jova, es egy dobozlista-szukites nem kod-pontositas
 * lenne, hanem a jovahagyott allapot megvaltoztatasa. A MONDAT javul, nem a
 * lista.
 *
 * === ES A SOTET (2a) LAP NEM PONTOSAN UGYANEZT A SORT HASZNALJA ===
 *
 * A terv sajat cime szerint a 2a "az 1b szerkezete", de a MAKETTJEN ket doboz
 * nem all ott. Kimeritoen atnezve mind a 141 szoveges elemet, ket fuggetlen
 * retegben (lathato cimek ES a designer sajat monospace cimkei):
 *
 *   "Ami még kellhet hozzá"   a 2a lapon SEHOL      (1a-n es 1b-n szakaszcim)
 *   "Műszaki adatok"          a 2a lapon SEHOL      (1a-n szakaszcim, 1b-n ful)
 *
 * A kontroll ugyanabban a halmazban TALAL (wysiwyg 5, kotegajanlat 1,
 * kerdezd 1), tehat a nulla nem a kereses tulajdonsaga.
 *
 * A meretezes-seged viszont OTT VAN, mas felirattal -- es a felirat a designer
 * sajat cimkeje, nem a mienk:
 *
 *   2a   y=1191  "ELHELYEZÉS-SEGÉD"   a "Hová tedd ezt a példányt?" cim folott
 *   1b   y=5740  "MÉRETEZÉS-SEGÉD"    az "Elég lesz ez a lámpa..." cim folott
 *
 * Ezt azert kell kiirni, mert a tervfajl TOBB valtozatot tartalmaz, es egy
 * "hianyzo doboz" bejelentesnel az elso kerdes az, hogy ugyanabbol a
 * valtozatbol nezzuk-e -- a masodik pedig az, hogy nem MAS FELIRATTAL all-e ott.
 *
 * A meresek es a kiolvasok:
 * `agents/nautilus/measurement/terv-valtozatok/` (OLVASSEL.md, 2a-TELJES-LISTA.md,
 * VILAGOS-LAPOK.md, DESIGNER-JEGYZETEK.md).
 *
 * === A KET OLVASO KET KULONBOZO DOLOGRA VAK, ES EZ NEM "TELJES KONTRA SZURT" ===
 *
 * A tervlapot ketten olvassuk, ket kulonbozo modszerrel, es MINDKETTO vak
 * valamire. Sokaig ugy hivatkoztunk erre, hogy az egyik "a teljes szoveget"
 * latja, a masik "szurve" -- ez HAMIS, es ketszer allt vissza a helyesbites
 * utan is, mert csak uzenetben volt kimondva:
 *
 *   nautilus   elem-szinten olvas -> a CSONKOLAS nem erinti, DE 46 karakter
 *              felett ELDOBJA az elemet (lasd lentebb: ez MAS, mint a vagas)
 *   murena     kontener-CIMKET olvas -> a suly nem erinti,
 *              de 60 KARAKTERNEL kemenyen vag, ES a szelesseg-szuroje
 *              (1300-1400) kizarja a lap-kontenereket -- lasd lentebb
 *
 * JAVITVA 2026-09-08: ez a tabla korabban azt allitotta, hogy nautilus
 * olvasasa SULYT (>=600) es MERETET (>=14px) kuszobol. Ez TUL TAG volt, es a
 * sajat mondatom eppen az ellen a hiba ellen szolt, amit elkovettem vele.
 *
 * A kuszob EGY KIOLVASASE, nem az olvasasi modszere. Merve a nyers anyagon:
 *
 *   terv-cimek/           >=600 suly, >=14px, LEVEL elem, <=46 karakter
 *                         (a sajat OLVASSEL.md-je ki is mondja, es hozzateszi,
 *                          hogy "a hiany NEM bizonyitek")
 *   terv-valtozatok/      SZURES NELKUL, 405 elem. Ebbol 108 all 14px ALATT:
 *   teljes-lapok...json     9px:5  10px:4  11px:48  12px:16  13px:35
 *                         es 500-as sulyu elemek is bennevannak
 *
 * A KULONBSEG NEM AKADEMIKUS: eppen a szuretlen kiolvasas adja azokat a
 * szamokat, amiken az alabbi haromfele bontas all (1b 15px/500). Ha a kuszob
 * altalanos lenne, az a lelet nem is letezhetne -- vagyis a ket allitas
 * ELLENTMONDOTT egymasnak a fo agon, amig ez a bekezdes igy allt.
 *
 * Merve: 252 dobozcimkebol 95 eri el a 60 karakteres hatart (a korall lapon
 * 35). Az en korlatom tehat ALLANDO: minden olvasasomra all.
 *
 * ES VAN EGY MASODIK KORLATOM, AMI NEM CSONKOLAS, HANEM EGY SZAM (nautilus
 * merese, 2026-09-08). Sokaig ugy neveztem meg, hogy "a forrasom nem tudja
 * szetvalasztani az 1a-t es az 1b-t". Ez TUL ERŐS volt, es rossz iranyba visz:
 * azt sugallja, hogy MASIK forras kell.
 *
 * A valodi ok a szelesseg-szurom felso hatara. A kontenerek merve:
 *
 *   az 1a sajat kontenere    1854 szeles    -> KIESIK a szurombol
 *   az 1b sajat kontenere    1854 szeles    -> KIESIK
 *   a kozos, mindkettot tarto  1328 szeles  -> ATMEGY
 *
 * Ezert latom a ket muszaki lapot EGYBEN. Az adat ott van, a szuro vagja el.
 * (Ellenorzes: 2276 + 2651 = 4927, a kozos kontener 4983 magas -- 56 pixel
 * margoval ugyanaz a ketto.)
 *
 * ES A SOTET LAP MASKEPP VISELKEDIK -- EZ A KORLAT NEM ALL MIND A HAROM LAPRA
 * (nautilus vette eszre, hogy a fenti tabla csak kettot nevez meg; a szamokat
 * a sajat futtatasommal igazoltam vissza, nem atvettem).
 *
 * A teljes lanc, harom cimkere:
 *
 *   2a   sajat kontener  1328 x 2140    a folotte allo  1440 x 2243
 *   1a   sajat kontener  1854 x 2276    a folotte allo  1328 x 4983
 *   1b   sajat kontener  1854 x 2651    a folotte allo  1328 x 4983
 *
 * A 2a SAJAT kontenere tehat 1328 szeles, nem 1854 -- vagyis BENNE VAN a
 * szurom ablakaban, es atmegy rajta. A sotet lapnal nem a kozos kontener
 * olvasodik, hanem a lap sajatja.
 *
 * AMI EBBOL KOVETKEZIK, ES AMI NEM. Kovetkezik, hogy a harom lapot a szurom
 * KETFELE latja: a ket vilagosat egyben (a kozos kontenerben), a soteteet
 * onmagaban. NEM kovetkezik, hogy ez res: a sotet lapnal epp ez a kivant
 * bontas. A kulonbseget azert kell kiirni, mert a fenti tabla ket sora
 * konnyen olvasodik ugy, mintha a harmadik is ugyanigy allna.
 *
 * A merohely: `agents/nautilus/measurement/terv-valtozatok/kontener-lanc.cjs`,
 * ujrafuttathato. (Elotte ezek a szamok CSAK egy uzenetben alltak -- egy szam,
 * aminek nincs ujrafuttathato helye, egy ev mulva allitas, nem bizonyitek.)
 *
 * A KULONBSEG NEM SZOSZAPORITAS: "a forrasom nem tudja" azt jelenti, hogy
 * masik forrast kell keresni; "a szurom kizarja" azt, hogy egy szamon mulik.
 * Ket kulonbozo kovetkezo lepes.
 *
 * ES A MARGO-CIMKEK IS OTT VANNAK NALAM, csak nem kontener-cimkekent: LEVEL
 * elemek (JetBrains Mono, 12px, x=56, y=103 / 2346 / 4678). A kontener-cimke
 * retegben a SZULO cimkeje olvasodik, ezert kaptam rajuk nullat.
 *
 * A SZURON NEM VALTOZTATOK: a felso hatar azert all ott, hogy a belso dobozok
 * kimaradjanak, es nautilus kiolvasoja (`measurement/terv-cimek/
 * rez-laponkent.cjs`) ezt a bontast amugy is elvegzi. A korlat MEGNEVEZESE
 * kellett, nem a megszuntetese.
 *
 * ES A HARMADIK KORLAT, AMIT EN NEM NEVEZTEM MEG (nautilus helyesbitese,
 * 2026-09-08, a sajat kiolvasojan merve): a `cimek-kiolvaso.cjs` a 46
 * karakternel hosszabb szoveget nem csonkolja, hanem ELDOBJA
 * (`if (!t || t.length > 46) continue`).
 *
 * A KETTO NEM UGYANAZ, es az ove a rosszabb alak: az EN kimenetemen LATSZIK,
 * hogy vagtam (a cimke ott all, csak rovidebben); az ovenel az elem NYOM
 * NELKUL hianyzik. Egy csonka sor gyanut kelt, egy hianyzo nem.
 *
 * A SAJAT HOZZAJARULASA VISZONT KICSI, es ezt is o mérte szet: a 395 szoveges
 * level-elembol 26 hosszabb 46 karakternel, de ebbol csak KETTO ment volna at
 * egyebkent a suly- es meret-kuszobon. A hossz-korlat vak foltja tehat ket
 * elem, nem huszonhat.
 *
 * ES A HAROM SZAM MEROHELYE, MERT ENELKUL EGY EV MULVA CSAK ALLITAS
 * (nautilus kerese, 2026-09-08 -- ugyanaz a szabaly, amit reggel EN kertem
 * szamon rajta: ha egy szam tartos helyen all, a BEMENETNEK is tartos helyen
 * kell allnia):
 *
 *   agents/nautilus/measurement/terv-cimek/VAK-FOLT.md            a levezetes
 *   agents/nautilus/measurement/terv-cimek/vakfolt-kiolvaso.cjs   a mero
 *   agents/nautilus/measurement/terv-cimek/vakfolt-2026-09-08.json a nyers kimenet
 *
 * MIND A HAROM SZAMOT VISSZAMERTEM a nyers kimenetbol, MURENA (2026-09-08):
 * 395 elem a listaban, ebbol 26 hosszabb 46 karakternel, es azok kozul ketto
 * all >=600 sulyon ES >=14 pixelen -- a ket lap-cimke ("Galleriás ..." es
 * "Adatvezérelt ...", mind a ketto w=600, px=17). Vagyis a harom szam nem
 * atvett allitas, hanem ket fuggetlen olvasas ugyanarrol az anyagrol.
 *
 * Nautilus korlata viszont KIOLVASASONKENT valtozik, es ezert nem lehet egy
 * szoval elintezni. A helyes kerdes nem az, hogy "mit lat nautilus", hanem
 * hogy MELYIK KIOLVASASBOL jon a szam. Egy cim-listabol vett nulla nem
 * ugyanaz, mint a szuretlen kinyeresbol vett nulla.
 *
 * A KOVETKEZMENY, AMI A GYAKORLATBAN SZAMIT: egy SZAKASZ-CIM ellenorzesehez az
 * en oldalam eleg, mert egy szakasz a sajat cimevel KEZDODIK, tehat a vagas
 * utan is ott all az eleje. Egy BEAGYAZOTT elofordulast (egy cimke KOZEPEN
 * allo szoveget) viszont elrejthet -- arra nautilus olvasasa kell, es akkor a
 * SZURETLEN kinyeres, nem a cim-lista.
 *
 * ES AMIERT EZ ITT ALL, NEM EGY UZENETBEN: ez a negy sor mar ketszer elveszett
 * egy kontextus-hataron, es utana MINDKETTEN visszaestunk a "teljes kontra
 * szurt" alakra. Egy uzenetben elhelyezett helyesbites pontosan addig el,
 * ameddig a beszelgetes; az eredeti allitas viszont a fejlecekben all, tehat
 * tulel. Ezert tud egy javitas visszafordulni anelkul, hogy barki visszavonna.
 *
 * === EGY KONKRET ESET, AMI EBBOL MAR ELOJOTT: A VIDEO ===
 *
 * Murena a terv dobozlistajat kiolvasva talalt egy VIDEO elemet a foto es a
 * meretezes-seged kozott, ami ebbol a tizennegybol hianyzik. Helyesen NEM
 * nevezte hibanak, hanem ket magyarazatot adott melle.
 *
 * A valasz egy HARMADIK volt, es meressel dolt el. A tervfajlban a "VIDEÓ"
 * szo haromszor all (ekezettel; ekezet nelkul nullaszor), es MINDHAROM
 * BOLYEGKEP, nem doboz:
 *
 *   a befoglalo racs ketszer `grid-template-columns: repeat(6,1fr)`
 *   mindegyik `aspect-ratio:1`, tobb ugyanilyen testverrel
 *   az egyik szomszedja a "NAPPALI FÉNY" felirat -- szinten bolyegkep
 *
 * Vagyis a video a KEPGALERIA hatos bolyegkep-savjanak eleme. Ha valaha
 * megepul, a galeriaban a helye (az a `fotoResz` sloton at erkezik), NEM egy
 * tizenotodik dobozkent.
 *
 * ES A MERESI TANULSAG: egy doboz-lista kinyerese NEM kulonbozteti meg a
 * bolyegkepet a doboztol -- a kulonbseg csak a BEFOGLALO RACSBOL latszik. Aki
 * legkozelebb "hianyzo dobozt" talal, elobb a racsot nezze meg.
 */
/**
 * MINDEN SZOVEG ITT A VEVONEK SZOL, TEHAT MAGYAR HELYESIRASSAL ALL.
 *
 * Ez a lista 2026-09-07-ig EKEZET NELKUL allt, es ugy is jelent meg az elo
 * lapon -- mind a tizennegy dobozon. Nem allvanyzat volt: Balazs epp azt a
 * lapot nyitotta meg.
 *
 * AZ OK ERDEKESEBB A HIBANAL: mi egesz nap ekezet nelkul irunk EGYMASNAK, mert
 * a csatorna-kapu es a parancssor miatt ez lett a szokas. Az a SAJAT kozegunk
 * szabalya. A kodban allo felirat viszont nem nekunk szol. A szokas atlepett
 * egy hatart, es senki nem vette eszre, mert nekunk termeszetesnek latszott.
 *
 * A HATAR: ami a VEVOHOZ megy, az magyar helyesirassal all. A valtozonevek, a
 * kulcsok es a kommentek maradhatnak ekezet nelkul -- azokat mi olvassuk.
 *
 * Orzo all ra: `lap-vaz.component.spec.tsx`, "a vevonek szant szoveg magyarul".
 */
export const MUSZAKI_LAP_SZAKASZAI: VazSzakasz[] = [
  {
    kulcs: "cimsor",
    cim: "",
    varakozo: "A termék neve és a fejléc-műveletek",
    oszlop: "teljes",
  },
  { kulcs: "foto", cim: "", varakozo: "Termékfotó", oszlop: "bal" },
  {
    kulcs: "meretezes-seged",
    cim: "Méretezés-segéd",
    varakozo: "Ide jön a méretezés-segéd",
    oszlop: "bal",
  },
  {
    kulcs: "fulek",
    cim: "",
    varakozo: "Leírás és műszaki adatok",
    oszlop: "bal",
  },
  {
    kulcs: "muszaki-adatok",
    cim: "Műszaki adatok",
    varakozo: "Ide jönnek a termék műszaki adatai",
    oszlop: "bal",
  },
  {
    kulcs: "ar",
    cim: "",
    varakozo: "Ide jön az ár",
    oszlop: "jobb",
    csoport: "vasarlas",
  },
  {
    kulcs: "elerhetoseg",
    cim: "",
    varakozo: "Készlet, szállítás, bolti átvétel",
    oszlop: "jobb",
    csoport: "vasarlas",
  },
  {
    kulcs: "valaszto",
    cim: "",
    varakozo: "Változat-választó",
    oszlop: "jobb",
    csoport: "vasarlas",
  },
  {
    kulcs: "mennyiseg",
    cim: "",
    varakozo: "Mennyiség és kosárba tétel",
    oszlop: "jobb",
    csoport: "vasarlas",
  },
  {
    kulcs: "csomagajanlat",
    cim: "Csomagajánlat",
    varakozo: "Ide jön a csomagajánlat",
    oszlop: "jobb",
  },
  {
    kulcs: "kerdezd",
    cim: "Kérdezd minket",
    varakozo: "Kapcsolatfelvétel",
    oszlop: "jobb",
  },
  /*
    EZ A KET DOBOZ ADAT HIANYABAN MARAD URES, NEM HIBA MIATT -- ES EZERT ALL ITT.

    A kapcsolat-lanc mind a harom fokan megmerve (acrobot merese, 2026-09-08
    este; a szamok tole valok, nem sajat meresbol):

      UNAS          1310 termek visel hasonlot, 1007 kiegeszitot
      Acropora OS      7 termek, 48 kapcsolat, KIEGESZITO nulla
      teszt bolt       1 termek

    Vagyis az OS-ben ma nincs mit kivinni: a lanc a FORRASNAL szakad, nem itt.
    Amig az import meg nem tortenik, ez a ket doboz akkor is ures marad, ha a
    kirakat oldalan minden helyes -- barmit epitunk ra.

    AMIERT A KODBAN ALL ES NEM CSAK A KARTYAN: aki azt latja, hogy a doboz nem
    jelenik meg, eloszor a kodban fogja keresni az okot. Ez a megjegyzes epp azt
    a kort sporolja meg. A ket kartya: d2dd5557 (az import) es a71496e4 (a
    hianyzo idobelyeg).

    HA EZ A MEGJEGYZES ELAVUL (megjott az adat), TOROLNI KELL: egy megjegyzes,
    ami egy mar megszunt hianyt ir le, ugyanugy felrevezet, mint egy elavult
    korlat -- csak epp senki nem meri ujra.
  */
  {
    kulcs: "kiegeszitok",
    cim: "Ami még kellhet hozzá",
    varakozo: "Ide jönnek a tartozékok",
    oszlop: "teljes",
  },
  {
    kulcs: "hasonlo",
    cim: "Hasonló termékek",
    varakozo: "Ide jönnek a hasonló termékek",
    oszlop: "teljes",
  },
  {
    kulcs: "ragados-sav",
    cim: "",
    varakozo: "A lap alján futó sáv",
    oszlop: "teljes",
  },
]

type VazDobozProps = {
  szakasz: VazSzakasz
  children?: React.ReactNode
  /**
   * A KOZOS PANELEN BELUL A SZAKASZ NEM RAJZOL SAJAT KERETET.
   *
   * Nem torlom a szakaszt es nem vonom ossze a tartalmat: az azonositoja, a
   * horgonya es az ures-allapota valtozatlan marad. Csak a keret, a hatter es a
   * belso margo kerul at a kozos panelre -- kulonben ket keret allna egymasban.
   */
  keretNelkul?: boolean
}

/**
 * EGY DOBOZ. Ha kap tartalmat, azt mutatja; ha nem, a varakozo szoveget.
 *
 * A szaggatott keret SZANDEKOS: megkulonbozteti a meg ures dobozt a kesztol,
 * tehat aki a lapot nezi, latja, mi all mar es mi csak a helyet foglalja. Egy
 * ures doboz, ami kesznek latszik, rosszabb a hianyzonal.
 */
export const VazDoboz = ({
  szakasz,
  children,
  keretNelkul = false,
}: VazDobozProps) => {
  /**
   * A JSX gyerek-atadasnal a `children` akkor is letezhet, ha nincs benne semmi
   * (ures kifejezes, `undefined` a terkepbol). Ezert nem a MEZO meglétét
   * nezzuk, hanem hogy van-e MIT kirajzolni.
   */
  const uresE =
    children === undefined ||
    children === null ||
    children === false ||
    (Array.isArray(children) && children.length === 0)

  return (
    <section
      /**
       * HORGONY-AZONOSITO MINDEN DOBOZON, NEM CSAK AZON, AMIRE MA MUTATUNK.
       *
       * A ragados sav gombja a vasarlo oszlopra ugrik (acrobot dontese,
       * 2026-09-07). Egyetlen dobozra tenni azonositot kivetel lenne, es a
       * kovetkezo horgonynal valaki ujra eldontene, hova. Igy a szabaly egy
       * sor: minden doboz elerheto `#vaz-<kulcs>` alakban.
       */
      id={`vaz-${szakasz.kulcs}`}
      data-vaz-szakasz={szakasz.kulcs}
      data-vaz-ures={uresE ? "igen" : "nem"}
      className={keretNelkul ? "" : "p-4"}
      style={
        keretNelkul
          ? { color: "var(--terv-szoveg)" }
          : {
              border: uresE
                ? "1px dashed var(--terv-keret)"
                : "1px solid var(--terv-keret)",
              /* Ugyanaz a token, mint a kozos panelnel, es ugyanabbol
                 az okbol -- lasd az ottani jegyzetet. Az ures szakasz
                 tovabbra is attetszo marad: ott a szaggatott keret a jel. */
              background: uresE ? "transparent" : "var(--terv-hatter-halvany)",
              color: "var(--terv-szoveg)",
            }
      }
    >
      {szakasz.cim && (
        <h2
          className="mb-2 text-base font-semibold"
          style={{ fontFamily: "var(--terv-betu-fo-lanc)" }}
        >
          {szakasz.cim}
        </h2>
      )}
      {uresE ? (
        <p
          className="text-sm"
          style={{ color: "var(--terv-szoveg-halvany)" }}
          data-testid="vaz-varakozo"
        >
          {szakasz.varakozo}
        </p>
      ) : (
        children
      )}
    </section>
  )
}

/**
 * A KET VILAG. Nem izles es nem latogatoi beallitas: a TERMEK FAJTAJA donti el.
 * A `globals.css` `[data-vilag="sotet"]` blokkja irja felul ugyanazokat a
 * valtozokat, tehat a vaz szerkezete valtozatlan marad -- ugyanaz a doboz,
 * masik ertek-keszlet.
 */
/**
 * AZ ELO ALLAT LAP DOBOZAI -- A TERVBOL MERVE, NEM KITALALVA.
 *
 * A tervfajl HAROM lapot tartalmaz: a sotet korall lapot (2a) es ket vilagos
 * muszaki lapot (1a, 1b). A fenti lista a ket VILAGOS lap unioja; ez itt a
 * korall valtozat ("2. KOR WYSIWYG korall termekoldal, sotet").
 *
 * === MIERT NEM ELEG UGYANAZ A LISTA ===
 *
 * A KORALL es a MUSZAKI VILAG szerkezete azonos, a FELIRATAI nem. (Itt a "ket
 * valtozat" a ket VILAG, nem a terv ket vilagos LAPJA -- a ketto ket sorral
 * feljebb egymas mellett all, es ezert kell kiirni, melyik kettorol van szo.)
 *
 * Egy korall lapon a "Hasonlo lampak" doboz nem uresen allna, hanem TELE
 * lenne -- hamis felirat alatt. Egy ures doboz azt mondja, hogy meg nincs
 * kesz; egy rossz cim azt, hogy lampat nezel.
 *
 * === AMI MERVE VAN, ES AMI NEM ===
 *
 * A tervbol kiolvasva (`exchange/design-balazs/geometria-sorrend-terv.json`,
 * a korall valtozat dobozai):
 *
 *   foto              "SAJAT FOTO -- EZ A PELDANY, 16:10"
 *   meretezes-seged   "ELHELYEZES-SEGED / Hova tedd ezt a peldanyt?"
 *   fulek             Gondozas, Leiras, Vizparameterek, Eloallat-szallitas,
 *                     Ertekelesek
 *   csomagajanlat     "Kotegajanlat"
 *   kerdezd           "Kerdezd a boltot"
 *   hasonlo           "Tovabbi WYSIWYG peldanyok"
 *   kiegeszitok       NINCS ilyen doboz a korall valtozatban -- es a #134 ota
 *                     a sotet listarol is LEKERULT
 *
 * MA EGYETLEN CIMUNK SINCS A TERVEN KIVUL, ES EZ A #134 UTAN IGAZ.
 *
 * Ez a bekezdes 2026-09-08-ig azt mondta, hogy egy cim nem a tervbol valo: a
 * `muszaki-adatok` doboz sotet valtozata, amit "Tartasi parameterek" nevre
 * vezettem le a mert cella-tartalombol -- es hogy "EZ AZ EGY sor cserelendo".
 * A #134 azota levette ezt a dobozt a sotet listarol, a cim-felulirassal
 * egyutt: a szoveg ma mar SEHOL nem all a fajlban, tehat nincs is mit cserelni.
 *
 * A MERES VISZONT MARAD, mert epp az a doboz LEVETELENEK a bizonyiteka: a 2a
 * lapon nincs cimzett parameter-szakasz -- azon a magassagon a fulsor all
 * (top=1387), a parameter-doboz pedig cim nelkul kezdodik, rogton a "Nehezseg"
 * cellaval (top=1423).
 *
 * (Nem torlom a regi mondatot, hanem megnevezem: aki egy PR-leirasban vagy egy
 * uzenetben a "Tartasi parameterek" cimre hivatkozik, itt latja, hogy mikor es
 * mi miatt szunt meg. Egy csendes torles ezt a kort ujra lefuttatna valakivel.)
 *
 * A VILAGOS CIM A TERVBOL VALO, ES EZ EGY JAVITAS.
 *
 * Ez a bekezdes korabban azt allitotta, hogy a doboz a tervben MINDKET
 * valtozatban cim nelkul all, tehat a "Muszaki adatok" cimet is mi tettuk ra.
 * Hamis: az 1a lapon SZAKASZCIM (top=3626, 1352x233, cimmel es alcimmel), az
 * 1b-n FUL, es csak a 2a-n nincs sehol. Ez a harmas bontas ott all fentebb, a
 * laponkenti listaban -- vagyis a cafolat KETSZAZ SORRAL FELJEBB, UGYANEBBEN A
 * FEJLECBEN keletkezett, es a hamis mondat mellette maradt eletben.
 *
 * MIERT CSUSZTAM EL: az 1a lapon HAROM helyen allnak muszaki cellak -- a
 * cimzett szakasz (3626), egy oldalsavi blokk (5667) es a fulsor alatti tabla
 * (5972). Az utobbi ketto CIM NELKUL kezdodik, rogton a "Teljesitmeny 160 W"
 * cellaval, es en ezt a kettot lattam. Harombol kettot mertem, es "mindket
 * valtozatra" mondtam ki: a hatokoromnel TAGABB allitast tettem.
 *
 * A KOD EGY SORA SEM VALTOZIK ettol: a vilagos cim eddig is "Muszaki adatok"
 * volt, csak rossz indokkal allt itt. A tervbeli alcim ("Gyartoi adatlap
 * alapjan. Kerdes eseten hivj minket") nalunk nincs meg -- felirva, nem
 * potolva, mert kitalalni nem szabad.
 */
const ELO_ALLAT_CIMEK: Record<string, { cim?: string; varakozo?: string }> = {
  foto: { varakozo: "Saját fotó: ez a példány" },
  /**
   * LELET, NEM DONTES: EZEN A DOBOZON KET TERVBELI SZOVEG ALL EGYMAS FOLOTT.
   *
   * Merve a 2a lapon, a `measurement/terv-valtozatok/` kiolvasasaval:
   *
   *   y=1191  x=126  11px monospace   "ELHELYEZÉS-SEGÉD"           a doboz NEVE
   *   y=1215  x=126  20px felkover    "Hová tedd ezt a példányt?"  a LATHATO cim
   *
   * A ROVID NEV ALL A CIMBEN, es ez valtozatlan: amig a doboz URES VAZ, a h2
   * nem vevoi felirat, hanem szerkezeti cimke. A vevoi cim akkor jon, amikor a
   * doboz valodi tartalmat kap, es akkor MIND A KET lapcsaladon egyszerre valt.
   * (acrobot dontese, msg_id 14812 es 14817.)
   *
   * === A VARAKOZO SZOVEG VISZONT MEGVALTOZOTT (acrobot 15766, 2026-09-08) ===
   *
   * Korabban a tervbeli LATHATO CIM allt itt ("Hová tedd ezt a példányt?"), es
   * az indok az volt, hogy az MEGSZOLIT, nem ALLIT -- tehat legfeljebb
   * szokatlan, de nem lehet hamis.
   *
   * EZ AZ ERV MEGDOLT, es nem az allitas-oldalrol: a mondat VALODI TARTALOMNAK
   * latszik. Egy vevo megprobalna hasznalni -- rakattintana, keresne a mezot --
   * es nem talalna semmit. A vilagos parja ("Ide jön a méretezés-segéd")
   * ranezesre helykitolto; ez nem az.
   *
   * A repo mashol mar kimondja ugyanezt a szabalyt, a leiras-doboz fejleceben:
   * "egy ures doboz, ami keszneklatszik, ROSSZABB a hianyzonal". Ugyanaz a
   * szabaly, masik dobozon -- csak itt eddig a masik oldalrol neztuk.
   *
   * A tervbeli mondat AKKOR kerul be, amikor a seged MEGEPUL. Addig egy
   * tervbeli mondat a lapon igeret, amit nem tudunk teljesiteni.
   *
   * === ES AMIT A SEGED MEGEPITESEKOR TUDNI KELL: NEM LESZ KOZOS SZOVEG ===
   *
   * A terv KET KULONBOZO mondatot ad a ket vilagra, es a ketto FORDITOTT
   * LOGIKAJU (picasso megfogalmazasa):
   *
   *   2a (korall)  "Add meg az akváriumod méretét és a lámpát" -- a MEGLEVO
   *                lampahoz igazitja a korall helyet
   *   1b (lampa)   "Add meg a méreteket és a korallállományt"  -- a MEGLEVO
   *                korallallomanyhoz igazitja a lampa meretet
   *
   * Vagyis a ket doboz nem ugyanaz a szoveg mas cimkevel. Egy egyseges,
   * semleges mondat mind a ket helyen TARTALMILAG rosszat mondana.
   *
   * Ez a ket koordinata azert marad itt, hogy a kovetkezo kornek ne kelljen
   * ujra kimernie: a lathato cim MEGVAN a tervben, nem kell kitalalni.
   */
  "meretezes-seged": {
    cim: "Elhelyezés-segéd",
    varakozo: "Ide jön az elhelyezés-segéd",
  },
  fulek: {
    varakozo:
      "Gondozás, Leírás, Vízparaméterek, Élőállat-szállítás, Értékelések",
  },
  csomagajanlat: { cim: "Kötegajánlat", varakozo: "Ide jön a kötegajánlat" },
  kerdezd: { cim: "Kérdezd a boltot", varakozo: "Kapcsolatfelvétel" },
  hasonlo: {
    cim: "További WYSIWYG példányok",
    varakozo: "Ide jönnek a további egyedi példányok",
  },
}

/**
 * ES EGY DOBOZ, AMIT A TERV ALAPJAN KI KELLETT VOLNA HAGYNI -- MEGIS BENT MARAD.
 *
 * Merve: a korall valtozatban NINCS "Ami meg kellhet hozza" doboz. Eloszor ki is
 * vettem, es egy MEGLEVO allitas azonnal pirosra valtott:
 *
 *   "a szerkezet mindket vilagban ugyanaz"
 *
 * Az az allitas SZANDEKOS, es a sajat kommentje ki is mondja, mit ved: hogy a
 * ket vilag NEM ket kulon lap, csak ket ertek-keszlet ugyanazon a vazon. Ez
 * szerkezeti dontes, es nem az enyem -- nem irom at azert, hogy az en
 * valtozasom atmenjen.
 *
 * ES A KET BIZONYITEK KOZUL A MASODIK ITT EROSEBB, mert Balazs kikotese pontosan
 * erre az esetre szol: "ami NINCS, ott a doboz alljon a helyen, uresen". Egy
 * uresen allo tartozek-doboz tehat NEM hiba a korall lapon, hanem a kimondott
 * viselkedes. A "Hasonlo lampak" felirat viszont AZ IGEN: az nem ures doboz,
 * hanem rossz allitas -- es a javitas pontosan azt celozza.
 */

/**
 * A LISTA SZARMAZTATVA, NEM MASOLVA.
 *
 * Ha valaki uj dobozt vesz fel a muszaki listaba, az ITT IS megjelenik -- egy
 * masolat eseten csendben kimaradna, es az elteres csak a lapon latszana.
 * A felirat-elteresek egy helyen allnak, fent.
 */
/**
 * === EGY KOR ODA-VISSZA, ES A REKORD KEDVEERT KIIRVA ===
 *
 * A #108-ban ez a ket doboz (`meretezes-seged`, `muszaki-adatok`) LEKERULT a
 * sotet listarol, acrobot dontese alapjan: "ha egy doboznak sem forrasa, sem
 * jelentese nincs azon a vilagon, akkor nem varakozo hely, hanem zaj".
 *
 * Az a dontes az en TALALGATASOMRA epult -- en javasoltam, hogy a ket doboz
 * essen ki --, es a tervbol vett meres CAFOLTA: a korall valtozat MINDKET
 * dobozt tartalmazza, csak MAST kerdez (`ELHELYEZES-SEGED / Hova tedd ezt a
 * peldanyt?`, illetve a nehezseg-fenyigeny-aramlas tabla).
 *
 * Acrobot ezert felulirta a sajat jovahagyasat, es a lista a TERVBOL jon. A ket
 * doboz visszakerult, felirattal egyutt.
 *
 * AMI EBBOL TANULSAG, ES EZERT MARAD ITT: a talalgatasom nem csak pontatlan
 * volt, hanem rossz IRANYBA tevedett -- KEVESEBBET epitett volna, mint amennyi
 * a tervben keszen all. Egy "vegyuk ki, ugysem tudjuk kitolteni" javaslat
 * mindig igy nez ki: ovatosnak latszik, es kozben szegenyebb lapot ad.
 */
/**
 * AMI NEM KERUL A SOTET LISTARA -- ES A KET KERDES SZETVALASZTVA.
 *
 * Nautilus fogalmazta meg a kulonbseget, es ez a resze a tartos:
 *
 *   "MI LEGYEN a dobozban"      -> Balazs szabalya valaszol: ami nincs, ott a
 *                                  doboz uresen all
 *   "MELYIK DOBOZ letezik ezen  -> a TERV a forras
 *    a lapon"
 *
 * A szerkezeti allitas a DRIFT ellen ved, nem a terv ellen. Ezert elhagyhat a
 * sotet lista dobozt, ha a terv sem tartalmazza -- de UJAT nem adhat hozza es
 * SORRENDET nem valtoztathat, es az elhagyottak itt, nevvel allnak.
 *
 * A MERES (a validalt hatarral, ismert pozitiv kontrollal):
 *
 *   a korall savban "Ami meg kellhet hozza"   0 doboz
 *   a muszaki savban ugyanaz                  2 doboz
 *   KONTROLL: a "Tovabbi ... peldanyok" doboz a korall savban MEGVAN (1)
 *
 * A kontroll azert kell, mert a nulla onmagaban a kereses tulajdonsaga is
 * lehetne: ha teljes szelessegu dobozt egyaltalan nem talalnank a korall
 * savban, a nulla semmit nem mondana.
 *
 * (A hatar maga: a korall es a muszaki SAV cimkezett kontenere -- megint a ket
 * VILAG, nem a ket vilagos lap --, es a vagas ott van, ahol
 * a muszaki kontener KEZDODIK -- nem ahol a korall nominalisan vegzodik, mert
 * a ketto atfed.)
 */
/**
 * AMIT A SOTET LISTA ELHAGY -- KET DOBOZ, MIND A KETTO MERESSEL.
 *
 * A tervfajl 2a (korall) lapjan egyik sem all. A meres a
 * `measurement/terv-valtozatok/` anyaga: mind a 141 szoveges elem atnezve,
 * mikozben a kontroll ugyanabban a halmazban TALAL.
 *
 * ITT 2026-09-08-IG "KET FUGGETLEN RETEG" ALLT, ES AZ TOBBET IGERT A MERESNEL.
 * A masodik reteg (a designer sajat monospace cimkei) NEM doboz-leltar: a
 * huszbol csak NEGYET nevez meg, es hianyzik belole a Kotegajanlat meg a
 * Kerdezd a boltot is -- olyan dobozok, amik BIZONYITHATOAN ott allnak.
 * Vagyis abbol a retegbol valo hianyzas semmit nem bizonyit.
 *
 * A KOVETKEZTETES VALTOZATLAN, DE EGY RETEG ALL MOGOTTE, NEM KETTO: a lathato
 * cimek kiolvasasa, ismert pozitiv kontrollal. (nautilus sajat helyesbitese,
 * msg 14967; o kerte, hogy ahol "ket fuggetlen reteg"-kent all, ott javitsuk.)
 *
 * ES AMIERT EZ NEM SZOROSAN VEVE STILUS: a "ket fuggetlen meres egyetert" a
 * legerosebb allitas-fajta, amit tenni tudunk. Ha egy ilyet alaptalanul irunk
 * le, a kovetkezo olvaso NEM fogja ujra megnezni -- epp azert nem, mert
 * ketszeresen alatamasztottnak latszik.
 *
 * ES EGY MERT SZAM A "NEM DOBOZ-LELTAR" ALLITAS ALA, ami a fenti indoklasban
 * nem all (nautilus, 2026-09-08): a 2a lapon 21 monospace cimke van, es a
 * LEGALSO y=1191-nel -- a lap viszont 2140 magas. A lap ALSO FELE (fulsor,
 * parameter-tabla, hasonlo sor, ragados sav) EGYETLEN monospace cimket sem
 * visel.
 *
 * Ez erosebb, mint a "huszbol negyet nevez meg": a reteg nem VALOGAT a dobozok
 * kozott, hanem a lap egy egesz feleig el sem er. Egy reteg, ami a lap felet
 * nem fedi, SZERKEZETILEG nem tud tavolletet igazolni -- nem csak gyengebb
 * bizonyitek.
 *
 *   kiegeszitok      "Ami még kellhet hozzá"  -- 1a-n es 1b-n szakaszcim, 2a-n sehol
 *   muszaki-adatok   "Műszaki adatok"          -- 1a-n szakaszcim, 1b-n ful, 2a-n sehol
 *
 * A "SZAKASZCIM KONTRA FUL" NEM BESOROLAS, HANEM MERT TIPOGRAFIA. Ez teszi a
 * fenti sort mas altal ellenorizhetove (nautilus elem-szintu olvasasa, a
 * SZURETLEN kinyeresbol; murena visszamerte 2026-09-08-an):
 *
 *   1a   22px / 600 suly    ezert szakaszcim
 *   1b   15px / 500 suly    ezert fulsor-elem
 *
 * A MERES NAPJA AZERT ALL ITT, mert ezek a szamok a tervfajl EGY KIOLVASASABOL
 * valok. Ha a tervet ujraexportaljak, a szamok elavulhatnak, es a fejlecben
 * semmi nem mutatna. Egy leirt szam nem allapot, hanem egy pillanat.
 *
 * A kulonbseg a MERETBEN es a SULYBAN all, nem a helyzetben -- egy ful es egy
 * szakaszcim allhat ugyanabban a sav-pozicioban. Aki a harmas bontast
 * visszamerne, ezt a ket szamot keresse, ne a koordinatat.
 *
 * A 2a lapon a tartasi adat NEM tunik el: a FUL-SOR alatt all (Gondozás |
 * Leírás | Vízparaméterek | ...), cim nelkuli adat-tablaban. Vagyis nem
 * tartalmat veszunk el, hanem egy kulon dobozt, ami ugyanazt a helyet jelolne
 * ki masodszor.
 *
 * ES AMIERT MOST SZABAD ELHAGYNI: mind a ketto ma URES vaz. Ha valodi
 * tartalmat vinne, a levetel lathato dolgot vinne el, es akkor mas dontes
 * kellene.
 *
 * Ez terv-kovetes, nem terv-modositas, ezert nem megy a gazda ele. (acrobot
 * dontese, msg_id 14734, megerositve 14812-ben es 14827-ben.)
 */
const ELO_ALLAT_ELHAGYOTT = new Set(["muszaki-adatok", "kiegeszitok"])

export const ELO_ALLAT_LAP_SZAKASZAI: VazSzakasz[] =
  MUSZAKI_LAP_SZAKASZAI.filter(
    (szakasz) => !ELO_ALLAT_ELHAGYOTT.has(szakasz.kulcs),
  ).map((szakasz) => ({
    ...szakasz,
    ...(ELO_ALLAT_CIMEK[szakasz.kulcs] ?? {}),
  }))

/**
 * A WYSIWYG SZO CSAK OTT ALL, AHOL IGAZ -- ES EZ EGY PREDIKATUMON MULIK.
 *
 * A `hasonlo` doboz sotet felirata a tervbol valo: "További WYSIWYG példányok",
 * alatta "Ide jönnek a további egyedi példányok". Mind a ketto azt allitja, hogy
 * EZ a termek is egyedi peldany volt.
 *
 * MERVE (acrobot, 2026-09-08 04:05, a stage Store API-jan, lapozva): a harom
 * elo allat gyoker alatt 161 lap all (Halak 125, Gerinctelenek 28, Korallok 8),
 * es ebbol HAROM egyedi peldany. Vagyis 158 lapon a "tovabbi" szo olyat allit a
 * vevonek, ami nem igaz -- egy Helfrich-tuzgeb lapjan azt sugallja, hogy az is
 * WYSIWYG tetel volt.
 *
 * A HAROM KET EGYMASTOL FUGGETLEN JELBOL JON, es ez tobb, mint egy mezo
 * egyetlen olvasata: a `unique_piece: true` harom termeket ad, a
 * `wysiwyg---korallok` kategoria szinten harmat, es PONTOSAN ugyanazt a harmat.
 *
 * ES A 161 NEM ELIRAS A KORABBI 160 HELYETT. Ez a bekezdes 160-at mondott,
 * murena merese alapjan, es az a szam a REGI vilag-valto predikatumon allt. Az
 * uj predikatum egy termekkel tobbet lat: a leveles kategoria-alak azt az egyet
 * a rossz vilagba sorolta. A ket szam kulonbsege tehat nem meresi szoras, hanem
 * PONTOSAN az a javitas -- a levezetese a `vilag-valto.ts` fejlecben all.
 *
 * ES A TERV MAGA DONTI EL A HATOKORT, a sajat lap-leirasaban (merve a 2a lap
 * tetején, y=56):
 *
 *   2a   "WYSIWYG korall termékoldal – az 1b szerkezete, sötét felületen"
 *   1a   "Galleriás – nagy kép, karcsú vásárlási sáv, mélytenger-kék akcent"
 *   1b   "Adatvezérelt – méretezés-segéd, kötegajánlat, réz akcent"
 *
 * A ket vilagos lapot a designer ELRENDEZES szerint nevezi meg, a 2a-t viszont
 * ESET szerint: az egy WYSIWYG korall termekoldal. A sotet felirat tehat az
 * ESETHEZ tartozik, nem az elo allat aghoz.
 *
 * ES AMI EZT AZ ERVET NEM TAMASZTJA ALA, HOLOTT KEZENFEKVO LENNE: a harom
 * felirat NEM azonos szerkezetu. Merve a nyers kiolvasason (2026-09-08):
 *
 *   2a   y=  56  x=126  15px / 400    <- ez maga a LAP CIME
 *   1a   y=2349  x=111  17px / 600
 *   1b   y=4681  x=111  17px / 600
 *
 * Az 1a es az 1b parhuzamos EGYMASSAL; a 2a mas meret, mas suly, mas pozicio,
 * es ugyanaz az elem, amit a lap cimekent azonositottunk. Vagyis nem harom
 * egyenrangu cimke, amibol az egyik kilog.
 *
 * AZ ERV EZZEL EGYUTT IS ALL, DE MAS ALAPON: a TARTALMUKON, nem a
 * szerkezetukon. Mind a harom megnevezi, MI EZ A LAP, es a 2a valasza egy ESET
 * ("WYSIWYG korall termekoldal"), nem egy elrendezes.
 *
 * Azert all itt kiirva, mert a "harom parhuzamos cimke" alak kezenfekvo es
 * HAMIS -- ha valaki igy hivatkozik ra, a meres nem tamasztja ala, es akkor az
 * egesz ervet gyengenek fogja hinni, holott csak az alatamasztasa volt rossz.
 *
 * NEM UJ LISTA, HANEM EGY PREDIKATUM (acrobot dontese, msg_id 14775): ugyanaz a
 * `unique_piece`, ami ma a jelvenyt is vezerli. Ha nem egyedi peldany, ez az EGY
 * doboz visszaesik a VILAGOS lap sajat feliratara -- ami szinten a tervbol valo,
 * tehat nem talalunk ki semmit.
 */
/**
 * AMELYIK FELIRAT EGYEDI PELDANYT ALLIT, ES EZERT FELTETELHEZ VAN KOTVE.
 *
 * Nem minden elo allat egyedi peldany. Ezek a feliratok KIJELENTIK, hogy a lap
 * egy konkret, megfoghato darabrol szol -- ha nem az, a mondat valotlan, es a
 * vevo azt olvassa, hogy a kepen AZ a peldany all, amit megrendel.
 *
 *   hasonlo   "További WYSIWYG példányok"   (a #151 kotoette fel)
 *   foto      "Saját fotó: ez a példány"    (acrobot dontese, msg 14947)
 *
 * A KETTO UGYANAZ AZ ALLITAS, ket helyen. Nem hataresetek: mind a ketto ALLIT
 * valamit a termekrol.
 *
 * ITT KORABBAN EGY HARMADIK PELDA IS ALLT, ELLENPELDAKENT: a "Hová tedd ezt a
 * példányt?" MEGSZOLIT, nem ALLIT, "es az marad". EZ AZ ERV MEGDOLT (acrobot
 * 15766): a baj nem az volt, hogy allit-e, hanem hogy VALODI TARTALOMNAK
 * latszik. A mondat azota semleges varakozora cserelt, az indok pedig a
 * `meretezes-seged` bejegyzes fejlecebe kerult.
 *
 * Azert nem toroltem nyom nelkul, mert egy ELLENPELDA eltunese eszrevetlen:
 * aki a szabalyt olvassa, nem tudja meg, hogy egyszer volt egy eset, ami
 * kivetelnek latszott, es kiderult, hogy nem az.
 *
 * MIERT SET ES NEM KET `if`: a kovetkezo ilyen felirat egy sor lesz, nem egy uj
 * ag. A ket eset kozott a kulonbseg csak a kulcs, a kezeles azonos -- a vilagos
 * lap ugyanazon kulcsu szakaszanak semleges szovegere esunk vissza.
 */
const EGYEDI_PELDANYT_ALLIT = new Set(["hasonlo", "foto"])

export function szakaszokVilagra(
  vilag: Vilag,
  egyediPeldany = false,
): VazSzakasz[] {
  if (vilag !== "sotet") return MUSZAKI_LAP_SZAKASZAI
  if (egyediPeldany) return ELO_ALLAT_LAP_SZAKASZAI

  return ELO_ALLAT_LAP_SZAKASZAI.map((szakasz) => {
    if (!EGYEDI_PELDANYT_ALLIT.has(szakasz.kulcs)) return szakasz

    const vilagosPar = MUSZAKI_LAP_SZAKASZAI.find(
      (sz) => sz.kulcs === szakasz.kulcs,
    )
    if (!vilagosPar) return szakasz

    return { ...szakasz, cim: vilagosPar.cim, varakozo: vilagosPar.varakozo }
  })
}

export type Vilag = "vilagos" | "sotet"

type LapVazProps = {
  /** Szakasz-kulcs szerint a tartalom. Ami hianyzik, az uresen jelenik meg. */
  tartalom?: Partial<Record<string, React.ReactNode>>
  /** Alapertelmezes a VILAGOS: a katalogus tulnyomo resze muszaki termek. */
  vilag?: Vilag
  /**
   * EGYEDI PELDANY-E. Csak a sotet lap `hasonlo` dobozanak feliratat donti el,
   * es SZANDEKOSAN hamis az alapertelmezese: aki nem adja meg, a semlegesebb
   * feliratot kapja, nem a WYSIWYG-allitast.
   */
  egyediPeldany?: boolean
  /**
   * A MORZSAMENU, A SOTET FELULET TETEJEN.
   *
   * Slot, nem sajat tartalom, ugyanabbol az okbol, mint a foto es a vasarlasi
   * resz: a morzsamenu a termeket ES a kategoria-katalogust olvassa, es azokat
   * a vaz nem tulajdonolja. Ha itt epitene fel, a lapon KET forras mondana meg,
   * hol all a termek -- es a ketto eltevedese nem hibazna, csak mast mutatna.
   */
  morzsa?: React.ReactNode
}

/**
 * A LAP VAZA, KET OSZLOPBAN.
 *
 * A #66-ban ez a megjegyzes allt itt: "a ket oszlopos elrendezes KESOBB JON --
 * az oszlopokba valo besorolas csak akkor donthető el, ha a dobozok tartalma is
 * megvan". A tartalom azota bekerult, tehat AZ A FELTETEL TELJESULT, es ez a
 * bekezdes ezert lett atirva, nem kiegeszitve.
 *
 * AZ ARANYOK MERTEK, NEM BECSULTEK (1440 pixeles nezet, a tervbol):
 *
 *     BAL   856 px   -- foto, meretezes-seged, fulek, muszaki adatok
 *     koz    44 px
 *     JOBB  452 px   -- ar, elerhetoseg, valaszto, mennyiseg, csomagajanlat, kerdezd
 *     teljes szelesseg: cimsor, tartozekok, hasonlo termekek, ragados sav
 *
 * === A TERVBEN KET KULONBOZO RACS ALL, NEM EGY (2026-09-08) ===
 *
 * Ez azert all itt, mert kulonben egy kesobbi olvaso ranez az 1a lapra, HAROM
 * oszlopot lat, es azt hiszi, elrontottuk. A harom tervlap fo termek-racsa,
 * a nyers forrasbol:
 *
 *   2a  sotet, rez        grid-template-columns: minmax(0,1fr) 452px   gap 44
 *   1b  vilagos, rez      grid-template-columns: minmax(0,1fr) 452px   gap 44
 *   1a  vilagos, kek      grid-template-columns: 112px minmax(0,1fr) 400px   gap 32
 *
 * A KET LAP, AMIT EPITUNK, BETUERE UGYANAZT A RACSOT HASZNALJA -- meg a felso
 * margojuk is azonos (`padding:18px 44px 0`). Az 1a ter el: harom oszlop, egy
 * 112 pixeles kepsavval elol, keskenyebb jobb oszlop (400) es kisebb koz (32),
 * plusz 22 pixeles felso margo.
 *
 * MIERT AZ 1b ALAKJA A MIENK, ES NEM VALASZTAS KERDESE: Balazs az 1b-t
 * valasztotta (2026-09-08 13:56), es a 2a ugyanezt a racsot viseli. Vagyis a
 * ketoszlopos alak MIND A KET epulo lapon a terve -- az 1a a harmadik,
 * elvetett valtozat, es a harom oszlopa vele egyutt esett ki.
 *
 * Ugyanez all a rez akcentre: az 1a a kek akcentu valtozat volt. A racs es a
 * szin EGYUTT jart, nem kulon-kulon dontottuk el oket.
 *
 * A JOBB OSZLOP FIX, NEM ARANYOS -- ES EZ MERES, NEM IZLES (2026-09-08).
 *
 * Korabban `856fr 452fr` allt itt, vagyis egy ARANY. A terv mind a ket
 * szakaszban (2a es 1b) ezt keri:
 *
 *     grid-template-columns: minmax(0, 1fr) 452px
 *
 * A kulonbseg egyetlen szelessegen NEM latszik: 1440 pixelen az aranyos osztas
 * 440,953-at ad, ami a 452-hoz kozel all. KET szelessegen derul ki, hogy nem
 * kozeli ertek, hanem MASIK SZABALY: 1100 pixelen 353,859 jon, es az arany
 * mindket szelessegen azonos (1,894). Egy fix sav nem viselkedne igy.
 *
 * A BAL OSZLOP 856-os szama ezzel nem tunt el, csak nem a kodban all: a jobb
 * sav fix, a maradek a bale, es 1440 pixelen (44 pixel kozzel) ez pontosan a
 * tervbeli 856-ot adja vissza.
 *
 * A `minmax(0, 1fr)` es nem a puszta `1fr`: az utobbi `minmax(auto, 1fr)`,
 * vagyis egy szeles tartalom (kep, hosszu szo) SZETFESZITHETI az oszlopot. A
 * terv is a minmax alakot hasznalja.
 *
 * MOBILON EGY OSZLOP, a tervbeli SORRENDBEN. Ez nem dontes, hanem a sorrend
 * kovetkezmenye: a `flex-col` alatt a dobozok abban a sorrendben allnak, ahogy
 * a `MUSZAKI_LAP_SZAKASZAI` felsorolja oket -- es az a terv sorrendje.
 */
/**
 * EGYMAS UTAN ALLO, AZONOS CSOPORTU SZAKASZOK EGY PANELBE.
 *
 * A SORREND SZAMIT, es ezert nem `groupBy`: a tervben a kozos panel EGYBEFUGGO.
 * Ha ket azonos csoportu szakasz koze valaha bekerul egy harmadik, akkor KET
 * panel lesz belole, nem egy osszevont -- ami helyes, mert a lap sorrendjet a
 * `MUSZAKI_LAP_SZAKASZAI` adja, nem ez a fuggveny.
 *
 * Csoport nelkuli szakaszbol mindig egyelemu csoport lesz, tehat a mai
 * viselkedes valtozatlan mindenutt, ahol nincs `csoport` megadva.
 */
/**
 * A SZAKASZOKAT FUTAMOKRA BONTJA: teljes szelessegu futamok es EGY ketoszlopos
 * futam. Ez a jobb panel "felcsuszasanak" a szerkezeti feltetele.
 *
 * === MIERT KELLETT, ES MIT JAVIT ===
 *
 * Korabban EGY lapos racs allt, es minden doboz csak `col-start` erteket
 * kapott. A kibocsatasi sorrendben viszont MINDEN bal szakasz megelozi az
 * OSSZES jobbot -- a CSS automatikus elhelyezes pedig nem toltekezik
 * visszafele. Ezert a jobb oszlop elso doboza a bal oszlop UTOLSO doboza ALA
 * kerult: merve 238 kontra 1243 pixel, harom szelessegen azonosan.
 *
 * === A HAROM FELOLDAS KOZUL EZ A HARMADIK, ES AZ INDOK A KARBANTARTAS ===
 *
 *   a kibocsatasi sorrend atrendezese  -- a legkisebb CSS-valtozas, DE a mobil
 *     nezet sorrendjet is atirja (ott minden egy oszlopban, forras-rendben fut),
 *     tehat egy asztali javitas csendben elmozditana a mobil olvasast
 *   explicit `grid-row` ertekek          -- pontos, de MINDEN uj doboznal karban
 *     kell tartani egy sorszamot; a legdragabb hosszu tavon
 *   ket kulon oszlop-konteneren belul    -- EZ. Uj szakasznal ugyanannyi a
 *     teendo, mint ma (az `oszlop` mezot kell beallitani), es a mobil sorrend
 *     VALTOZATLAN marad: a ket halom egymas ala kerul, ugyanabban a sorrendben,
 *     ahogy ma a lapos racs adja
 *
 * Amit a harmadik ELVESZIT: a ket oszlop sorai nem igazodnak egymashoz. Ez ma
 * nem veszteseg -- a lapos racsban sem igazodtak, epp ez volt a hiba.
 *
 * ES AMIT RAADASUL AD: a jobb halom EGYETLEN elem lett, tehat a tapadas
 * (sticky) ratehető, es magatol ott er veget, ahol a ketoszlopos futam --
 * vagyis a kovetkezo teljes szelessegu modul kezdetenel.
 */
export type VazSzegmens =
  | { tipus: "teljes"; elemek: VazSzakasz[][] }
  | { tipus: "oszlopos"; bal: VazSzakasz[][]; jobb: VazSzakasz[][] }

export const szegmensek = (csoportok: VazSzakasz[][]): VazSzegmens[] => {
  const ki: VazSzegmens[] = []
  for (const csoport of csoportok) {
    const oszlop = csoport[0].oszlop
    const utolso = ki[ki.length - 1]
    if (oszlop === "teljes") {
      if (utolso && utolso.tipus === "teljes") utolso.elemek.push(csoport)
      else ki.push({ tipus: "teljes", elemek: [csoport] })
      continue
    }
    if (!utolso || utolso.tipus !== "oszlopos") {
      ki.push({ tipus: "oszlopos", bal: [], jobb: [] })
    }
    const cel = ki[ki.length - 1] as {
      tipus: "oszlopos"
      bal: VazSzakasz[][]
      jobb: VazSzakasz[][]
    }
    if (oszlop === "bal") cel.bal.push(csoport)
    else cel.jobb.push(csoport)
  }
  return ki
}

export const csoportokba = (szakaszok: VazSzakasz[]): VazSzakasz[][] =>
  szakaszok.reduce<VazSzakasz[][]>((ki, szakasz) => {
    const utolso = ki[ki.length - 1]
    if (
      utolso &&
      szakasz.csoport &&
      utolso[0].csoport === szakasz.csoport &&
      utolso[0].oszlop === szakasz.oszlop
    ) {
      utolso.push(szakasz)
      return ki
    }
    return [...ki, [szakasz]]
  }, [])

const LapVaz = ({
  tartalom = {},
  vilag = "vilagos",
  egyediPeldany = false,
  morzsa,
}: LapVazProps) => {
  return (
    /**
     * A LAP SOTET, NEM EGY DOBOZ BENNE (picasso atnezese, 2026-09-08).
     *
     * A tervben az EGESZ oldal sotet. Nalunk egy sotet kartya lebegett feher
     * lapon. Picasso szava: "onmagaban ettol nez ki minden mas olcsobbnak".
     * Ezert megy elsonek: a tobbi javitas is ezen a hattéren fog latszani.
     *
     * Az ok szerkezeti volt: a `data-vilag` es a sotet hatter EGYUTT alltak a
     * kozepre igazitott, 1352 pixelre korlatozott dobozon. Ami azon kivul
     * esett, az a lap alapszinet viselte.
     *
     * === MIERT KET ELEM, ES MIERT ALL A JELOLO MIND A KETTON ===
     *
     * A kulso TELJES SZELESSEGU, es o viszi a hattert. A belso tartja a
     * tervbeli 1352 pixeles merteket es a racsot.
     *
     * A `data-vilag` mind a kettoen all, es ez nem duplikacio:
     *   a KULSO azert, hogy a SAJAT hattere a helyes vilagbol oldodjon fel
     *     (enelkul a teljes szelessegu sav a VILAGOS erteket kapna)
     *   a BELSO azert marad, mert allitas all ra (`lap-vaz.component.spec`
     *     a `muszaki-lap-vaz` elemen keri a jelolot)
     *
     * A `vilag-jelolo.spec` orzoje ettol NEM sertul: az FAJLOKAT szamol, nem
     * elofordulasokat, es a szandeka az, hogy egy helyen DOLJON EL a vilag --
     * ez a ket sor ugyanabban a komponensben, ugyanabbol az egy ertekbol all.
     *
     * === AMIT EZ NEM OLD MEG, ES MIERT NEM ITT ===
     *
     * A FEJLEC es a LABLEC tovabbra is vilagos: azok a `(main)` elrendezesben
     * allnak, a lap FOLOTT, tehat ez a komponens nem eri el oket. Mind a ketto
     * KULON tetel, es mindegyik a sajat feluletet hozza magaval, amikor
     * ujraepul. Egy ide eroltetett megoldas (kliens-oldali attributum a `html`
     * elemen) VILLANAST adna elso festeskor -- eppen azt, ami ellen ez a
     * javitas szol.
     */
    <div
      data-testid="lap-teljes-szelesseg"
      data-vilag={vilag}
      /*
        A VIZSZINTES MARGO ITT ALL, NEM A BELSO DOBOZON -- ES EZ 32 PIXELT ER
        (merve 2026-09-08).

        A terv 1440 pixelen 44 pixeles oldalmargot ad, tehat a tartalom 1352
        szeles. Nalunk a belso doboz maxWidth-je 1352 VOLT, es azon BELUL allt
        meg egy `p-4`: a tartalom igy 1320 lett, es a bal oszlop a tervbeli 856
        helyett 824-et kapott.

        Merve a stagingen, 1440 pixelen: 835,047 + 44 + 440,953 = 1320,000.
        Pontosan ketszer 16, vagyis a `p-4` ket oldala.

        A margo a KULSO burokra valo, mert az fut vegig a lap teljes
        szelessegeben. Igy 1440-en a belso doboz 1352 TISZTA tartalom (16 + 28
        = 44 pixel bal oldalt), keskenyebb nezeten pedig a 16 pixeles margo
        ugyanugy megmarad, mint eddig.
      */
      className="w-full px-4"
      style={{ background: "var(--terv-hatter)" }}
    >
      {/*
        A MORZSAMENU A SOTET FELULETEN BELUL ALL, NEM FOLOTTE (2026-09-08).

        Eddig a termeklap sablonjaban allt, egy `content-container` dobozban, a
        vaz FOLOTT -- vagyis a vilagos lapon. A tervben a sotet felulet a
        morzsamenuvel KEZDODIK.

        A sajat szelesseg-korlatja megismetli a racset (1352 px), mert az
        igazitasnak egyeznie kell: ha a morzsamenu a burok szelere futna ki, a
        lap tetején mas margoval indulna, mint a tartalom alatta.

        A SORREND SZAMIT, ES EZ NEM ELRENDEZESI IZLES: a morzsamenu szinei
        elozoleg kulon tetelkent kerultek tokenre (#210). Ha ez a lepes ment
        volna elsonek, a morzsamenu ROGZITETT szurke szoveggel kerult volna a
        sotet feluletre -- pontosan az a hiba, amit a #193 javitott.
      */}
      {morzsa ? (
        <div
          className="mx-auto w-full pt-4"
          style={{ maxWidth: "1352px" }}
          data-testid="lap-morzsa-sav"
        >
          {morzsa}
        </div>
      ) : null}
      <div
        className="mx-auto flex w-full flex-col gap-4 py-4"
        style={{
          maxWidth: "1352px",
          background: "var(--terv-hatter)",
          fontFamily: "var(--terv-betu-fo-lanc)",
        }}
        data-testid="muszaki-lap-vaz"
        data-vilag={vilag}
      >
        {(() => {
          const doboz = (csoport: VazSzakasz[]) => {
            const elso = csoport[0]
            const kozos = csoport.length > 1 || Boolean(elso.csoport)

            return (
              <div
                key={elso.kulcs}
                data-vaz-oszlop={elso.oszlop}
                data-vaz-csoport={elso.csoport}
                style={
                  kozos
                    ? {
                        border: "1px solid var(--terv-keret)",
                        /**
                         * A KET VILAG ELLENTETES IRANYBA VALASZTJA EL A PANELT
                         * A LAPTOL, ES EZ NEM ELIRAS (acrobot 15702, mérve).
                         *
                         * Soteten a panel VILAGOSABB a lapnal (0.205 a 0.17-en),
                         * vilagosban SOTETEBB (0.955 a 0.99-en). Elsore ez
                         * hibanak latszik -- de a ket VILAGOS tervlapon NULLA
                         * olyan panel all, amilyen a soteten. A tervnek tehat
                         * NINCS allitasa errol, es ha most "kijavitanank", egy
                         * sajat dontest tennenk a terv helyere, amit a kovetkezo
                         * olvaso tervbeli ertekkent olvasna.
                         *
                         * Ha egyszer lesz vilagos panel a tervben, AKKOR dol el.
                         * Ugyanaz a szabaly, mint a keszlet-sor mobil ertekenel:
                         * nem talalunk ki erteket oda, ahol nincs meres.
                         *
                         * A PANEL A `--terv-hatter-halvany` TOKENT VISELI, ES EZ
                         * NEM VALASZTAS, HANEM EGYEZES (acrobot 15599, 2026-09-08).
                         *
                         * A terv a panelre sotetben oklch(0.205 ...) erteket ker.
                         * A `--terv-hatter-halvany` sotet erteke PONTOSAN 0.205 --
                         * betüre ugyanaz. Uj tokent felvenni tehat nem kellett.
                         *
                         * AMI ELOTTE ALLT ITT, ES MIERT VOLT ROSSZ: a
                         * `--terv-hatter-lap`, aminek a sotet erteke 0.17. Az a
                         * terv LAP-erteke, nem a panelé. Emiatt a panel SOTETEBB
                         * volt a lapnal, holott a tervben VILAGOSABB -- a viszony
                         * meg volt forditva, es ezt egyetlen allitas sem merte.
                         */
                        background: "var(--terv-hatter-halvany)",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        /**
                         * A KOZOS PANELEN BELUL A SZAKASZOK KOZOTT 18 PIXEL ALL,
                         * ES EZ MERVE VAN, NEM VALASZTVA (2026-09-08).
                         *
                         * A tervben a vasarlasi panel HET belso sorbol all, es a
                         * kozottuk levo tavolsag NEM egyseges:
                         *
                         *   ar -> brutto/cikkszam        6 px
                         *   brutto -> keszlet           18 px
                         *   keszlet -> atvetel          18 px
                         *   atvetel -> Kosarba          18 px
                         *   Kosarba -> foglalas         10 px
                         *   foglalas -> DOA             16 px + egy FELSO VONAL
                         *
                         * A mi NEGY szakaszunk hatara pontosan a harom 18-as
                         * helyen van (ar | keszlet | atvetel | kosarba), tehat a
                         * SZAKASZOK KOZOTTI ritmus egyseges 18. A 6, a 10 es a 16
                         * a szakaszokon BELUL all, es azok mas komponensek
                         * tulajdona -- ide nem tartoznak.
                         *
                         * Elozoleg 16 allt itt, kerekitve. Ket pixel, de a lenyeg
                         * nem a kulonbseg merete: a 16 VALASZTAS volt, a 18 MERES.
                         */
                        gap: "18px",
                      }
                    : undefined
                }
              >
                {csoport.map((szakasz) => (
                  <VazDoboz
                    key={szakasz.kulcs}
                    szakasz={szakasz}
                    keretNelkul={kozos}
                  >
                    {tartalom[szakasz.kulcs]}
                  </VazDoboz>
                ))}
              </div>
            )
          }

          return szegmensek(
            csoportokba(szakaszokVilagra(vilag, egyediPeldany)),
          ).map((szeg, i) =>
            szeg.tipus === "teljes" ? (
              szeg.elemek.map(doboz)
            ) : (
              <div
                key={`oszlopos-${i}`}
                className="lg:grid lg:grid-cols-[minmax(0,1fr)_452px] lg:gap-x-[44px] lg:items-start max-lg:flex max-lg:flex-col max-lg:gap-4"
                data-testid="vaz-ket-oszlop"
              >
                <div
                  className="flex flex-col gap-4"
                  data-testid="vaz-bal-halom"
                >
                  {szeg.bal.map(doboz)}
                </div>
                <div
                  /*
                    A TAPADAS A FEJLEC ALJAHOZ IGAZODIK, NEM EGY TALALT SZAMHOZ.

                    Merve 2026-09-09 a kitelepitett lapon (1440x900): a fejlec
                    79 pixel magas es a 268 ota VEGIG lathato, a panel viszont
                    16 pixelre tapadt a nezet tetejetol. Gorgetes kozben a panel
                    tetejebol 63 PIXEL a fejlec ala csuszott -- ott all az ar es
                    a panel felso kerete.

                    A `--fejlec-magassag` a fejlec sajat valtozoja; a 16 pixel
                    marad, de mostantol a fejlec ALJATOL szamolodik, nem a nezet
                    tetejetol.

                    A MAGASSAG-KORLAT A MASODIK KERDESRE VALASZ: ha a panel
                    magasabb, mint a nezet, a tapadas ALUL vagna le, es a
                    "Kosarba" gomb elerhetetlenne valna. Ma a panel 496 pixel,
                    tehat ez nem all fenn -- de a terven tobb sor van benne,
                    mint nalunk, tehat elore szol. A korlat alatt a panel
                    BELUL gorget.
                  */
                  className="flex flex-col gap-4 lg:sticky lg:overflow-y-auto"
                  style={{
                    top: "calc(var(--fejlec-magassag) + 1rem)",
                    maxHeight: "calc(100vh - var(--fejlec-magassag) - 2rem)",
                  }}
                  data-testid="vaz-jobb-halom"
                >
                  {szeg.jobb.map(doboz)}
                </div>
              </div>
            ),
          )
        })()}
      </div>
    </div>
  )
}

export default LapVaz
