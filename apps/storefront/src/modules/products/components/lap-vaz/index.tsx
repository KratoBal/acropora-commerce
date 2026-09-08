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
  { kulcs: "ar", cim: "", varakozo: "Ide jön az ár", oszlop: "jobb" },
  {
    kulcs: "elerhetoseg",
    cim: "",
    varakozo: "Készlet, szállítás, bolti átvétel",
    oszlop: "jobb",
  },
  { kulcs: "valaszto", cim: "", varakozo: "Változat-választó", oszlop: "jobb" },
  {
    kulcs: "mennyiseg",
    cim: "",
    varakozo: "Mennyiség és kosárba tétel",
    oszlop: "jobb",
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
}

/**
 * EGY DOBOZ. Ha kap tartalmat, azt mutatja; ha nem, a varakozo szoveget.
 *
 * A szaggatott keret SZANDEKOS: megkulonbozteti a meg ures dobozt a kesztol,
 * tehat aki a lapot nezi, latja, mi all mar es mi csak a helyet foglalja. Egy
 * ures doboz, ami kesznek latszik, rosszabb a hianyzonal.
 */
export const VazDoboz = ({ szakasz, children }: VazDobozProps) => {
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
      className="p-4"
      style={{
        border: uresE
          ? "1px dashed var(--terv-keret)"
          : "1px solid var(--terv-keret)",
        background: uresE ? "transparent" : "var(--terv-hatter-lap)",
        color: "var(--terv-szoveg)",
      }}
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
   * MA A ROVID NEV ALL A CIMBEN, ES A LATHATO CIM A VARAKOZOBAN -- szandekosan.
   * Amig a doboz URES VAZ, a h2 nem vevoi felirat, hanem szerkezeti cimke, es
   * arra a rovid nev valo. A vevoi cim akkor jon, amikor a doboz valodi
   * tartalmat kap, es akkor MIND A KET lapcsaladon egyszerre valt (a vilagos
   * oldalon ugyanez a doboz "MÉRETEZÉS-SEGÉD" neven all). Egy fel atallas
   * rosszabb, mint egyik sem. (acrobot dontese, msg_id 14812 es 14817.)
   *
   * Ez a ket koordinata azert marad itt, hogy a kovetkezo kornek ne kelljen
   * ujra kimernie: a lathato cim MEGVAN a tervben, nem kell kitalalni.
   */
  "meretezes-seged": {
    cim: "Elhelyezés-segéd",
    varakozo: "Hová tedd ezt a példányt?",
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
 * valamit a termekrol. Ezzel szemben a "Hová tedd ezt a példányt?" MEGSZOLIT,
 * es az marad -- az elso lehet hamis, a masodik legfeljebb szokatlan (acrobot
 * dontese ugyanabban az uzenetben, es a mondat a tervbol valo: 2a lap, y=1215).
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
 * A ket oszlop aranyat `856fr 452fr` alakban adjuk at, nem kerekitett
 * szazalekban: igy a forras SZAMA all a kodban, es barki visszakeresheti a
 * merésben. Egy "65% / 35%" mar ertelmezes lenne.
 *
 * MOBILON EGY OSZLOP, a tervbeli SORRENDBEN. Ez nem dontes, hanem a sorrend
 * kovetkezmenye: a `flex-col` alatt a dobozok abban a sorrendben allnak, ahogy
 * a `MUSZAKI_LAP_SZAKASZAI` felsorolja oket -- es az a terv sorrendje.
 */
const LapVaz = ({
  tartalom = {},
  vilag = "vilagos",
  egyediPeldany = false,
}: LapVazProps) => {
  return (
    <div
      className="mx-auto w-full p-4 lg:grid lg:grid-cols-[856fr_452fr] lg:gap-x-[44px] lg:gap-y-4 max-lg:flex max-lg:flex-col max-lg:gap-4"
      style={{
        maxWidth: "1352px",
        background: "var(--terv-hatter)",
        fontFamily: "var(--terv-betu-fo-lanc)",
      }}
      data-testid="muszaki-lap-vaz"
      data-vilag={vilag}
    >
      {szakaszokVilagra(vilag, egyediPeldany).map((szakasz) => (
        <div
          key={szakasz.kulcs}
          data-vaz-oszlop={szakasz.oszlop}
          className={
            szakasz.oszlop === "teljes"
              ? "lg:col-span-2"
              : szakasz.oszlop === "bal"
                ? "lg:col-start-1"
                : "lg:col-start-2"
          }
        >
          <VazDoboz szakasz={szakasz}>{tartalom[szakasz.kulcs]}</VazDoboz>
        </div>
      ))}
    </div>
  )
}

export default LapVaz
