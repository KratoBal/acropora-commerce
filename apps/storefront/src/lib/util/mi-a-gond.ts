/**
 * "MI A GOND A MEDENCEDDEL?" (V4.3, kartya 85545d1f): problema alapu belepo es tunet-oldalak a teszt kirakaton.
 *
 * A SZOVEG KORALL SAJAT SZOVEGE (exchange/otletek-2026-11-04/v4-3-problema-alapu-belepo.md a cianobakterium mintaoldalhoz es
 * v4-3-tunet-oldalak-2026-11-11.md a tobbi kilenchez), gepi atalakitassal, majd oldalankent atnezve. A termekek polip igazolt
 * tunetenkenti listajabol valok (agents/polip/output/v43-tunet-termekek-2026-11-11.md): csak olyan, aminek a bolti szovege maga
 * nevezi meg a tunetet; a cikkszamok kezelore a teszt Medusan feloldva (2026-11-14).
 *
 * A NYITOTT JELOLESEK NEM KERULNEK AZ OLDALRA (acrobot 51912): a KITOLTENDO es KEP KELL jelolesek, a forras-cimkek
 * (KOZISMERET, BOLTI) es az EL jelolesek elhagyva; ahol az EL jeloles egy mondat jovahagyasat kerdezte (nem egy hianyzo
 * szamot), a mondat is kimaradt. A kimaradasok oldalankent a PR torzseben vannak. A szakmai ellenorzes (EL) a kikerules
 * feltetele, nem a teszt kirakate: a lapok noindex, menu- es lablec-link nelkul.
 *
 * AZ "N. OLDAL" HIVATKOZASOK a belepo szamozasara mutatnak (a belepo listaja ugyanezeket a szamokat viseli); ahol az oldal nincs
 * meg, nem link.
 */
export type TunetTermek = {
  /** a Medusa valtozat cikkszama (merve a teszt Medusan, 2026-11-14) */
  sku: string
  /** a bolti termek kezeloje (`/termek/{handle}`) */
  handle: string
}

export type TunetKezelo = {
  termekek: readonly TunetTermek[]
  /** a bolti szoveg szo szerinti allitasa a termekrol (gyartoi allitas, nem garancia) */
  megjegyzes: string
}

export type TunetOldal = {
  /** a tunet sorszama a belepo listajaban (az "N. oldal" hivatkozasok erre mutatnak) */
  szam: number
  slug: string
  cim: string
  kinez: readonly string[]
  lasdMeg: readonly string[]
  merd: readonly string[]
  okok: readonly string[]
  teendok: readonly string[]
  nene: readonly string[]
  segitseg: readonly string[]
  termekek: {
    meroeszkozok: readonly TunetTermek[]
    egyebEszkoz: string
    ovatossag: readonly string[]
    bevezeto: string | null
    kezelok: readonly TunetKezelo[]
    utolso: readonly string[]
  }
}

export const MIAGOND_CIM = "Mi a gond a medencéddel?"
export const MIAGOND_BEVEZETO =
  "Válaszd ki, mit látsz a medencédben. Minden oldal méréssel kezdődik, és a termék csak a végén jön, a mérések és a teendők után."
export const MIAGOND_FIGYELMEZTETES =
  "Ez általános útmutató, nem helyettesíti a medence mérését és szakember tanácsát."

export const TUNET_OLDALAK: readonly TunetOldal[] = [
  {
    szam: 1,
    slug: "kovaalga",
    cim: "Barna, poros réteg a homokon és a köveken (kovaalga)",
    kinez: [
      "Barna, poros, finom bevonat a homokon, a köveken és az üvegen, amit az áramlás könnyen felkavar. Új medencékben gyakori, az érés egyik szakasza. A kovaalga a szilikátot használja fel, ezért a szilikát forrását is érdemes megkeresni.",
    ],
    lasdMeg: [
      "ha a barna bevonat nyúlós, fonalas és éjszakára eltűnik, az a 3. oldal (dinoflagellata gyanú). Ha nyálkás szőnyeg buborékokkal, az a 2. oldal (cianobaktérium). Ha a tápanyag-értékek magasak, a 10. oldal.",
    ],
    merd: [
      "Szilikát (Si), ha van tesztedhez készlet. A vízből, az ozmózisvízből és a sóból is bekerülhet.",
      "Nitrát (NO3) és foszfát (PO4): a kovaalga is tápanyagfüggő.",
      "Az ozmózisvíz minősége: mikor cserélted a szűrőbetétet?",
    ],
    okok: [
      "Mióta működik a medence? Új medencében ez normális szakasz lehet.",
      "Honnan van a vized: ozmózisvíz, csapvíz? Mikor cseréltél szűrőbetétet?",
      "Új homokot vagy követ tettél be mostanában?",
      "Milyen a fényed, és mennyi ideig világít?",
    ],
    teendok: [
      "Szívd le a bevonatot a homokról és a kövekről, a szifont a vízcsere vizébe vezesd.",
      "Nézd meg a szilikát forrását: az ozmózisvíz és a só a leggyakoribb. Ha a víz forrása hibás, azt kell kijavítani.",
      "Tarts rendszeres, kis vízcserét tiszta vízzel.",
      "Javíts az áramláson, hogy a lerakódás ne maradjon meg.",
      "Ha ennyi nem elég, kérj tanácsot (lásd lent). Termék csak a mérések után.",
    ],
    nene: [
      "Ne indíts több vegyszert egyszerre.",
      "Ne kapcsold le a világítást napokra „megoldásként” fényben élő korallok mellett.",
      "Ne cserélj nagy mennyiségű vizet egyszerre pánikból.",
    ],
    segitseg: [
      "Ha a javítások után sem javul, vagy ha az állatok állapota romlik.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
        {
          sku: "8714079130439",
          handle: "salifert-si-szilikat-teszt",
        },
      ],
      egyebEszkoz: "szifon",
      ovatossag: [
        "Kezelő termék csak a mérések és a teendők után, és kérdezz minket előtte.",
      ],
      bevezeto:
        "A boltunk kínálatából azok, amelyeknek a bolti szövege megnevezi ezt a tünetet; a hatás gyártói állítás, nem garancia.",
      kezelok: [
        {
          termekek: [
            {
              sku: "4025901108217",
              handle: "aqua-medic-szilikatmegkoto-gyanta-600g",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „csökkenti a kovamoszat növekedését, ha a csapvízben túl magas a szilikátszint”, a fordított ozmózis egység utolsó lépéseként.",
        },
        {
          termekek: [
            {
              sku: "8032755803096",
              handle: "aquili-po4-no3-sio2-removal-500ml",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „hatékonyan küzd az algák fejlődése és a kovamoszat terjedése ellen”.",
        },
      ],
      utolso: [],
    },
  },
  {
    szam: 2,
    slug: "cianobakterium",
    cim: "Piros, bordó vagy zöld nyálkás szőnyeg, buborékokkal (cianobaktérium)",
    kinez: [
      "Piros, bordó, barnás vagy zöld nyálkás szőnyeg a homokon és a köveken, gyakran apró buborékokkal. Nem valódi alga, hanem baktérium-telep. Gyakran tápanyag-egyensúlytalanságra, gyenge áramlású zugokra vagy még nem kiegyensúlyozott, új medencére utal.",
    ],
    lasdMeg: [
      "a barna, nyúlós, éjszakára eltűnő bevonat a 3. oldal (dinoflagellata gyanú), a barna, poros bevonat az 1. oldal (kovaalga), a tápanyag-értékek a 10. oldal.",
    ],
    merd: [
      "Nitrát (NO3) és foszfát (PO4): a nulla közeli és a túl magas érték is gyanús. A cianobaktérium gyakran akkor jelenik meg, ha az egyensúly felborult, nem feltétlenül akkor, ha „sok” a tápanyag.",
      "Áramlás: hol van holt tér? Nézd meg, hol marad mozdulatlan a víz a kövek mögött.",
      "Hőmérséklet és sótartalom: stabilak-e?",
    ],
    okok: [
      "Mióta működik a medence? Új medencében ez az érés egyik szakasza.",
      "Esett-e nullára a nitrát vagy a foszfát?",
      "Gyengült-e az áramlás, vagy új kő/dekoráció miatt keletkezett holt tér?",
      "Gyakran etetsz, vagy sok a feldolgozatlan eleség?",
    ],
    teendok: [
      "Szívd le a telepet szifonnal, amennyire tudod (a szifont a vízcsere vizébe vezesd).",
      "Javíts az áramláson: mozdítsd el az áramoltatót vagy a követ, hogy ne maradjon holt tér.",
      "Mérd újra a tápanyagot, és ha az egyensúly hibás, korrigáld lassan, nem hirtelen.",
      "Tarts rendszeres, kis vízcserét.",
      "Ha a fenti nem elég, kérj tanácsot (lásd lent). Vegyszert, antibiotikumot ne alkalmazz kérdezés nélkül: a biológiai szűrő is károsodhat.",
    ],
    nene: [
      "Ne indíts több vegyszert egyszerre.",
      "Ne csökkentsd hirtelen a tápanyagot nullára: az újabb problémát (például dinoflagellatát) hozhat.",
      "Ne kapcsold le a világítást napokra „megoldásként” fényben élő korallok mellett.",
    ],
    segitseg: [
      "Ha 1-2 hét rendszeres takarítás és áramlás-javítás után sem javul, vagy ha az állatok állapota romlik. Hozd a tápanyag-mérések eredményeit.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
      ],
      egyebEszkoz: "szifon, áramoltató",
      ovatossag: [
        "Kezelő termék csak a mérések és a teendők után, és kérdezz minket előtte.",
      ],
      bevezeto:
        "A boltunk kínálatából azok, amelyeknek a bolti szövege megnevezi a cianobaktériumot; a hatás gyártói állítás, nem garancia.",
      kezelok: [
        {
          termekek: [
            {
              sku: "858542001241",
              handle: "blue-life-red-cyano-rx-4g-voros-cyano-alga-elleni-szer",
            },
          ],
          megjegyzes: "„vörös cyano alga elleni szer”.",
        },
        {
          termekek: [
            {
              sku: "mrbioclear250",
              handle: "modern-reef-bioclear-250ml-cyanocleaner-utodja",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „a cianobaktérium eltávolításának leggyorsabb és legbiztonságosabb módja”.",
        },
        {
          termekek: [
            {
              sku: "4039966025068",
              handle:
                "aqua-connect-cyano-remove-liquid-cyanobakterium-elleni-keszitmeny-250ml",
            },
          ],
          megjegyzes: "„a cianobaktériumok biológiai eltávolítása”.",
        },
        {
          termekek: [
            {
              sku: "4260119454316",
              handle: "fauna-marin-red-x-alga-elleni-szer-500ml",
            },
          ],
          megjegyzes:
            "Hatékony „zöld és vörös cianobaktériumok” ellen (és enyhe dinoflagelláták ellen).",
        },
        {
          termekek: [
            {
              sku: "0710270146628",
              handle: "microbe-lift-zeopure-powder-250g",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „ideális problémák esetén, pl. cianobaktériumoknál”.",
        },
        {
          termekek: [
            {
              sku: "aquaforest_phosohate",
              handle: "aquaforest-phosphate-minus-100ml",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint megelőzhető vele „a cyano megjelenése”.",
        },
      ],
      utolso: [],
    },
  },
  {
    szam: 3,
    slug: "dinoflagellata",
    cim: "Barna, szálas, takonyszerű bevonat buborékokkal (dinoflagellata gyanú)",
    kinez: [
      "Barna vagy aranybarna, nyúlós, fonalas bevonat, a fonalak végén buborékokkal. A felismerés egyik jele, hogy éjszakára jórészt eltűnik, a fény bekapcsolása után órákon belül visszajön. Ez nem fonalalga: egysejtű, ostoros élőlény. Mivel a megkülönböztetés nehéz, a gyanú nem diagnózis.",
    ],
    lasdMeg: [
      "a barna, poros bevonat az 1. oldal (kovaalga), a nyálkás, felemelhető szőnyeg a 2. oldal (cianobaktérium), a zöld szálas a 4. oldal (fonalas alga). A tápanyag-értékekhez a 10. oldal.",
    ],
    merd: [
      "Fényidő és fényerő: hány órát világít a lámpa?",
      "Áramlás: hol van holt tér?",
      "Hőmérséklet és sótartalom: stabilak-e?",
    ],
    okok: [
      "Mióta működik a medence? Új medencében a „csúnya szakasz” gyakori.",
      "Nulla közelébe esett-e a nitrát vagy a foszfát, például tápanyagcsökkentő adagolása miatt?",
      "Változtattál-e mostanában a fényen?",
      "Túl tiszta, túl kevés élőlényes a rendszer?",
    ],
    teendok: [
      "Szívd ki a bevonatot, amennyire tudod. A kiszívott vizet ne öntsd oda, ahol gyerek vagy háziállat hozzáfér.",
      "Mérd meg a nitrátot és a foszfátot.",
      "Gondold át a fényidőt, és tartsd állandónak.",
      "Javítsd az áramlást.",
      "Kérj tanácsot, ha nem javul (lásd lent).",
    ],
    nene: [
      "Ne vidd nullára a nitrátot és a foszfátot „megoldásként”: ez a leggyakoribb hiba.",
      "Ne indíts több vegyszert egyszerre.",
      "Ne kapcsold le a világítást napokra fényben élő korallok mellett.",
    ],
    segitseg: [
      "Ha a javítások után sem javul, vagy ha az állatok állapota romlik. Biztonság: bizonyos dinoflagellata-fajok mérgező anyagot termelhetnek. Kesztyűvel dolgozz, ne fröcsköld a vizet, ne dolgozz nyílt sebbel a medencében.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
      ],
      egyebEszkoz: "szifon",
      ovatossag: [
        "Kezelő termék csak a mérések és a teendők után, és kérdezz minket előtte.",
      ],
      bevezeto:
        "A boltunk kínálatából azok, amelyeknek a bolti szövege megnevezi a dinoflagellatát; a hatás gyártói állítás, nem garancia.",
      kezelok: [
        {
          termekek: [
            {
              sku: "4260119451117",
              handle: "fauna-marin-dino-x-algaolo-keszitmeny-1000ml",
            },
            {
              sku: "4262495740601",
              handle: "fauna-marin-dino-m-algaolo-keszitmeny-250ml",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „speciális folyékony algicide arany alga és más dinoflagelláták ellen”.",
        },
        {
          termekek: [
            {
              sku: "4039966024009",
              handle:
                "aqua-connect-dino-remove-liquid-dino-alga-elleni-keszitmeny-250ml",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „különösen hatékony az egysejtű algák, például dinoflagelláták és aranyalga ellen”.",
        },
        {
          termekek: [
            {
              sku: "4260119454316",
              handle: "fauna-marin-red-x-alga-elleni-szer-500ml",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint hatékony többek között „enyhe dinoflagelláták” ellen (a cianobaktériumok mellett).",
        },
      ],
      utolso: [],
    },
  },
  {
    szam: 4,
    slug: "fonalas-alga",
    cim: "Zöld szálas alga a köveken (fonalas alga)",
    kinez: [
      "Zöld, szálas, erősen tapad a kőhöz. Ha megfogod, rugalmas, tépni kell. Tápanyagra és fényre épül.",
    ],
    lasdMeg: [
      "a zöld, hólyagos alga az 5. oldal (bubble algae), a barna fonalas bevonat a 3. oldal (dinoflagellata gyanú), a tápanyag-értékek a 10. oldal.",
    ],
    merd: [
      "Nitrát és foszfát: megugrottak-e?",
      "Fényidő és a lámpa kora: hány órát világít, mikor cserélted a fényforrást?",
      "Az etetés és a vízcsere gyakorisága.",
    ],
    okok: [
      "Mennyit etetsz, és marad-e feldolgozatlan eleség?",
      "Mikor cserélted utoljára a vizet, mikor takarítottál utoljára?",
      "Hosszú a fényidő, vagy régi a lámpa?",
      "Elhullott-e állat, ami lebomlik?",
    ],
    teendok: [
      "Távolítsd el kézzel, amennyit tudsz (például puha kefével, a vízből kivett kövön vagy pálcával).",
      "Csökkentsd a tápanyag-terhelést: etetés, vízcsere, szűrés karbantartása.",
      "Gondold át a fényt, tartsd állandónak.",
      "Tarts rendszeres, kis vízcserét.",
      "Kérj tanácsot, ha a javítások után sem javul.",
    ],
    nene: [
      "Ne indíts több vegyszert egyszerre.",
      "Ne csökkentsd hirtelen a tápanyagot nullára: az újabb problémát hozhat.",
      "Ne várj gyors megoldást: a fonalalga eltűnése a megszüntetett ok után is időt vesz igénybe.",
    ],
    segitseg: [
      "Ha a javítások után sem javul, vagy ha az állatok állapota romlik.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
      ],
      egyebEszkoz: "kefe, szifon",
      ovatossag: [
        "Kezelő termék csak a mérések és a teendők után, és kérdezz minket előtte.",
      ],
      bevezeto:
        "A boltunk kínálatából azok, amelyeknek a bolti szövege megnevezi ezt a tünetet; a hatás gyártói állítás, nem garancia.",
      kezelok: [
        {
          termekek: [
            {
              sku: "850699002003",
              handle: "coral-rx-pro-parazitairto-korallokhoz-30ml",
            },
          ],
          megjegyzes:
            "Korall-fürdető. A bolti (angol) szöveg szerint „aids in the treatment of: filamentous hair algae”. Korallra készült, nem a medence kezelésére.",
        },
        {
          termekek: [
            {
              sku: "0696859301858",
              handle: "polyplab-reef-primer-45g-korallfurdeto-4literhez",
            },
          ],
          megjegyzes:
            "Korall-fürdető. A bolti szöveg a „fonalas hínáralgákat” is említi. Korallra készült, nem a medence kezelésére.",
        },
      ],
      utolso: [],
    },
  },
  {
    szam: 5,
    slug: "holyagos-alga",
    cim: "Zöld buborékos, hólyagos alga (bubble algae)",
    kinez: [
      "Zöld, gyöngyszerű vagy hólyagos gömbök, amelyek a köveken ülnek. Egyetlen sejtből állnak, de nagyra nőnek. A felszínük sima, nyomásra puha vagy feszes.",
    ],
    lasdMeg: [
      "a zöld szálas alga a 4. oldal (fonalas alga), a tápanyag-értékek a 10. oldal.",
    ],
    merd: [
      "Nitrát és foszfát.",
      "Fényidő és fényerő.",
      "Honnan érkezett: új kő, új korall vagy frag a medencébe?",
    ],
    okok: [
      "Mikor került be új kő vagy korall? Az alga gyakran velük érkezik.",
      "Karanténoztad az új állatot és követ?",
      "Túl sok-e a tápanyag a vízben?",
    ],
    teendok: [
      "Távolítsd el kézzel, óvatosan, ép gömbökkel. Ha kipukkad, a benne lévő tartalom szétszóródhat és újra megtelepedhet.",
      "Csökkentsd a tápanyag-terhelést.",
      "Az új köveket és korallokat érdemes karanténban megfigyelni, mielőtt a főmedencébe kerülnek.",
      "Kérj tanácsot, ha gyorsan terjed.",
    ],
    nene: [
      "Ne törd, ne nyomd össze a gömböket a medencében.",
      "Ne indíts több vegyszert egyszerre.",
      "Ne ígérj magadnak gyors megoldást: az alga makacs.",
    ],
    segitseg: [
      "Ha gyorsan terjed, vagy ha a kézi eltávolítás után sem hagy alább.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
      ],
      egyebEszkoz: "csipesz",
      ovatossag: [
        "A bolti szövegek egyik vegyszere sem nevezi meg a hólyagos algát, ezért vegyszert nem ajánlok.",
      ],
      bevezeto: null,
      kezelok: [],
      utolso: [],
    },
  },
  {
    szam: 6,
    slug: "feheredo-korall",
    cim: "Fehéredő vagy halványuló korall",
    kinez: [
      "A korall elveszíti a színét, halvány vagy fehér lesz. Két eltérő eset áll mögötte: a szövet még rajta van, csak a színe fakul, vagy a szövet leválik, és a fehér váz látszik. A kettő nem ugyanaz, és nem ugyanúgy sürgős.",
    ],
    lasdMeg: [
      "az ingadozó értékek a 9. oldal, a tápanyag-értékek a 10. oldal.",
    ],
    merd: [
      "Hőmérséklet: stabil-e, nincs-e hirtelen emelkedés vagy ingadozás?",
      "KH, kalcium, magnézium: stabilak-e?",
      "Nitrát és foszfát: nulla közelébe estek-e?",
      "Fényerő: nem lett-e hirtelen erősebb?",
      "Áramlás: kap-e elég vízmozgást?",
    ],
    okok: [
      "Változtattál-e a fényen vagy lámpát cseréltél?",
      "Volt-e hirtelen hőmérséklet-változás?",
      "Ingadozott-e a KH?",
      "Nullára esett-e a nitrát vagy a foszfát?",
      "Új korall került-e mellé, amelyik leégeti a szomszédait?",
    ],
    teendok: [
      "Mérj meg mindent, mielőtt bármit átállítasz.",
      "Ha a hőmérséklet vagy a fény változott, állítsd vissza fokozatosan.",
      "Állítsd stabilra a KH-t, a kalciumot és a magnéziumot, lassan, nem egyszerre nagyot.",
      "Ha a szövet leválik és a váz fehéren látszik, kérj azonnal tanácsot.",
      "A korallt ne mozgasd feleslegesen.",
    ],
    nene: [
      "Ne változtass egyszerre több paramétert.",
      "Ne tegyél gyors, nagy korrekciót.",
      "Ne indíts vegyszert vagy gyógyszert kérdezés nélkül.",
    ],
    segitseg: [
      "Azonnal, ha a szövet leválik és a váz látszik. Egyébként, ha a mérések rendben vannak, de a korall tovább halványul.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130354",
          handle: "salifert-karbonat-kemenyseg-kh-mero-profi-tesztcsomag",
        },
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
      ],
      egyebEszkoz: "hőmérő",
      ovatossag: [],
      bevezeto: null,
      kezelok: [],
      utolso: [],
    },
  },
  {
    szam: 7,
    slug: "zavaros-viz",
    cim: "Zavaros, tejszerű víz",
    kinez: [
      "A víz tejszerű vagy opálos, a medence tisztasága romlik. Új medencében gyakori és gyakran ideiglenes. Más okai is lehetnek.",
    ],
    lasdMeg: [
      "a tápanyag-értékek a 10. oldal, a nyálkás bevonat a 2. oldal (cianobaktérium).",
    ],
    merd: [
      "Ammónia és nitrit: érik-e a medence, vagy mérgező érték van?",
      "Nitrát és foszfát.",
      "Sótartalom és hőmérséklet.",
      "Mikor adagoltál utoljára, mit?",
    ],
    okok: [
      "Új a medence, vagy frissen indítottad?",
      "Adagoltál-e baktériumot vagy más készítményt?",
      "Felkavartál-e homokot vagy port?",
      "Túl sokat etettél?",
      "Mikor cserélted a szűrőanyagot, és mikor tisztítottad?",
    ],
    teendok: [
      "Várj, és mérj. Új medencében vagy adagolás után a zavarosság gyakran magától elmúlik.",
      "Ne etess többet, mint amit az állatok megesznek.",
      "Tisztítsd a mechanikus szűrőt, és ellenőrizd az áramlást.",
      "Tarts rendszeres, kis vízcserét.",
      "Kérj tanácsot, ha nem tisztul, vagy ha az állatok állapota romlik.",
    ],
    nene: [
      "Ne cserélj le egyszerre sok vizet pánikból.",
      "Ne indíts több vegyszert egyszerre.",
      "Ne kapcsold ki a szűrést vagy az áramlást „megoldásként”.",
    ],
    segitseg: [
      "Ha nem tisztul, vagy ha az állatok állapota romlik (kapkodó légzés, étvágytalanság).",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
      ],
      egyebEszkoz: "ammónia- és nitrit-teszt",
      ovatossag: [
        "Szűrőanyag és kezelő termék csak a mérések és a teendők után, és kérdezz minket előtte.",
      ],
      bevezeto:
        "A boltunk kínálatából azok, amelyeknek a bolti szövege a zavarosságot vagy a tiszta vizet említi; a hatás gyártói állítás, nem garancia.",
      kezelok: [
        {
          termekek: [
            {
              sku: "4005258004912",
              handle: "aquavital-perlonvatta-250g",
            },
          ],
          megjegyzes:
            "Mechanikus szűrőanyag, a bolti szöveg szerint „a víz gyorsan tisztává és kristálytisztává válik”.",
        },
        {
          termekek: [
            {
              sku: "4032974409103",
              handle: "rowa-carbon-magas-minosegu-aktiv-szen-1000ml-450g",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „kristálytiszta tengeri akváriumvízért”.",
        },
        {
          termekek: [
            {
              sku: "4032517200075",
              handle: "grotech-reefclear-500ml-szurofolyadek",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint többek között „a zavarosodást” is megköti.",
        },
        {
          termekek: [
            {
              sku: "4260735742736",
              handle: "arka-bacto-shot-50ml-bakteriumkultura",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint „kristálytiszta vizet biztosít”. Baktériumkultúra: új medencében a zavarosság magától is elmúlhat, ezért előbb várj és mérj.",
        },
      ],
      utolso: [],
    },
  },
  {
    szam: 8,
    slug: "feher-pottyok-halon",
    cim: "Fehér pöttyök a halon, vagy a halak vakaródznak",
    kinez: [
      "Apró fehér pöttyök a hal testén vagy úszóin, és a hal a kövekhez dörgölőzik, vakaródzik. Ez gyakran a darakór (Cryptocaryon irritans), egy külső parazita. A doktorhalak különösen érzékenyek rá, ezt a boltunk adatlapjai is írják. Más betegség is okozhat hasonló tünetet.",
    ],
    lasdMeg: [
      "ha a víz értékei is rosszak, a 10. oldal (tápanyagok) és a 9. oldal (ingadozó értékek).",
    ],
    merd: [
      "Hőmérséklet és sótartalom: stabilak-e?",
      "Ammónia, nitrit, nitrát: a stressz oka lehet a rossz víz.",
      "Mikor került új hal a medencébe, és karanténban volt-e?",
    ],
    okok: [
      "Új hal érkezett-e mostanában, karantén nélkül?",
      "Volt-e hirtelen hőmérséklet- vagy sótartalom-változás?",
      "Stresszes-e a hal (szállítás, megváltozott körülmények)? A boltunk egyik adatlapja szerint a hal darakórra érzékeny, és könnyen bestresszelhet szállítás és megváltozott akváriumi körülmények miatt.",
      "Hány halat tartasz, és mennyi helyen?",
    ],
    teendok: [
      "Nézd meg alaposan: több halon vannak-e a pöttyök, és mennyire erősek a tünetek.",
      "Mérd meg az értékeket, és hozd rendbe, ha rosszak.",
      "Kérj azonnal tanácsot: ez a tünet gyors lépést kér.",
    ],
    nene: [
      "Ne adj gyógyszert vagy vegyszert a főmedencébe kérdezés nélkül: a korallokat és a gerincteleneket károsíthatja.",
      "Ne tegyél új halat a beteg medencébe.",
      "Ne várj napokat a tanácskéréssel.",
    ],
    segitseg: ["Azonnal, amint a tünetet észreveszed."],
    termekek: {
      meroeszkozok: [],
      egyebEszkoz: "hőmérő, refraktométer, ammónia- és nitrit-teszt",
      ovatossag: ["Gyógyszer csak szakember tanácsa után."],
      bevezeto: null,
      kezelok: [],
      utolso: [],
    },
  },
  {
    szam: 9,
    slug: "ingadozo-ertekek",
    cim: "Ingadozó KH, pH vagy kalcium",
    kinez: [
      "A mért értékek napról napra vagy hétről hétre eltérnek. Egy mérés egy pont: a sorozat az információ. Az ingadozás oka általában az, hogy a korallok fogyasztása és a pótlás nem egyezik.",
    ],
    lasdMeg: [
      "ha a korallok halványodnak, a 6. oldal. A tápanyag-értékekhez a 10. oldal.",
    ],
    merd: [
      "KH, kalcium, magnézium: ugyanabban a napszakban, ugyanazzal a teszttel.",
      "Hőmérséklet és sótartalom: stabilak-e?",
      "A teszted: mikor jár le a reagens, mikor tároltad rosszul? Ha egy eredmény meglepő, először a tesztet gyanúsítsd, mérj újra.",
    ],
    okok: [
      "Adagolod-e valamivel a KH-t, a kalciumot, a magnéziumot, és mikor?",
      "Egyenletes-e az adagolás, vagy napról napra más mennyiséget adsz?",
      "Nőtt-e a korallok mennyisége, ezért a fogyasztás?",
      "Ugyanabban a napszakban és ugyanazzal a teszttel mérsz-e?",
    ],
    teendok: [
      "Mérd meg újra, mielőtt beavatkozol.",
      "A magnéziumot rendezd a kalcium és a lúgosság módosítása előtt (több gyártó adatlapja ezt írja: AquaForest termékek).",
      "Állítsd be az adagolást egyenletesre, lehetőleg adagolópumpával vagy rendszeres időközönként.",
      "Az értékeket lassan told a kívánt irányba. A termékek gyártói napi emelési határát ne lépd túl (a termék leírása adja meg).",
      "Írd fel az eredményeket, hogy lásd a trendet.",
    ],
    nene: [
      "Ne korrigálj nagy egyszeri adaggal.",
      "Ne adagolj mérés nélkül.",
      "Ne indíts egyszerre több korrekciós terméket.",
    ],
    segitseg: [
      "Ha az értékek az egyenletes adagolás után sem állnak be, vagy ha a korallok állapota romlik.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130354",
          handle: "salifert-karbonat-kemenyseg-kh-mero-profi-tesztcsomag",
        },
        {
          sku: "8714079130347",
          handle: "salifert-calcium-teszt",
        },
        {
          sku: "8714079130422",
          handle: "salifert-magnezium-teszt",
        },
      ],
      egyebEszkoz:
        "KH, kalcium, magnézium, pH teszt, kalibráló oldat, adagolópumpa",
      ovatossag: [
        "A korrekciós termékek csak a mérések és a teendők után, és kérdezz minket előtte.",
      ],
      bevezeto:
        "A boltunk kínálatából azok, amelyeknek a bolti szövege a KH vagy a kalcium emelését írja: ezek emelők, a szövegek az ingadozás megszüntetését nem állítják, és a pH-ra a listán nincs termék.",
      kezelok: [
        {
          termekek: [
            {
              sku: "4260119451209",
              handle:
                "fauna-marin-balling-carbonate-kh-mix-4-kg-karbonat-keszitmeny",
            },
            {
              sku: "4260119451179",
              handle: "fauna-marin-balling-calcium-mix-4-kg-kalcium-keszitmeny",
            },
          ],
          megjegyzes: "",
        },
        {
          termekek: [
            {
              sku: "10139",
              handle: "modern-reef-kh-plusz-1000ml-kh-emelo-keszitmeny",
            },
            {
              sku: "grokh1000",
              handle: "grotech-carbonate-pro-liquid-1000-ml-kh-novelo",
            },
          ],
          megjegyzes: "",
        },
        {
          termekek: [
            {
              sku: "aqua_forest_kh",
              handle: "aquaforest-kh-buffer-1kg-kimert",
            },
          ],
          megjegyzes: "",
        },
      ],
      utolso: [],
    },
  },
  {
    szam: 10,
    slug: "magas-nitrat-foszfat",
    cim: "Magas nitrát vagy foszfát",
    kinez: [
      "A mért nitrát vagy foszfát a jóváhagyott tartomány fölött van. Gyakran alga és halvány korall kíséri, de lehet, hogy semmi nem látszik rajta.",
    ],
    lasdMeg: [
      "a lerakódások és algák: 1. oldal (kovaalga), 2. oldal (cianobaktérium), 3. oldal (dinoflagellata gyanú), 4. oldal (fonalas alga), 5. oldal (bubble algae). A zavaros víz a 7. oldal, a halványuló korall a 6. oldal.",
    ],
    merd: [
      "Nitrát és foszfát: ugyanazzal a teszttel, ugyanabban a napszakban.",
      "Az ozmózisvíz és a só: ezekből is bekerülhet foszfát és szilikát.",
      "Etetés, halállomány, szűrőanyagok kora.",
    ],
    okok: [
      "Mennyit etetsz, és marad-e feldolgozatlan eleség?",
      "Mikor cserélted vagy tisztítottad a szűrőanyagot?",
      "Elég gyakori és elég nagy-e a vízcsere?",
      "Sok az állat a medence méretéhez képest?",
      "Honnan van a vized, és milyen az ozmózisvíz minősége?",
    ],
    teendok: [
      "Mérj újra, mielőtt beavatkozol.",
      "Csökkentsd az etetést, és ne hagyj feldolgozatlan eledelt.",
      "Tisztítsd a szűrőanyagot és a mechanikus szűrőt.",
      "Tarts rendszeres vízcserét tiszta vízzel.",
      "Ha ez nem elég, kérj tanácsot a következő lépésről. Termék csak a végén, ha a mérések alátámasztják.",
    ],
    nene: [
      "Ne vidd nullára a nitrátot vagy a foszfátot. A nulla közeli érték ugyanúgy problémát okozhat, mint a magas.",
      "Ne csökkentsd hirtelen: lassan, mérések mellett.",
      "Ne indíts több tápanyagcsökkentőt egyszerre.",
    ],
    segitseg: [
      "Ha a javítások után az érték nem csökken, vagy ha az állatok állapota romlik.",
    ],
    termekek: {
      meroeszkozok: [
        {
          sku: "8714079130385",
          handle: "salifert-nitrat-teszt",
        },
        {
          sku: "8714079130361",
          handle: "salifert-foszfat-teszt",
        },
      ],
      egyebEszkoz:
        "nitrát, foszfát teszt, vezetőképesség-mérő az ozmózisvízhez, szűrőanyag",
      ovatossag: [
        "A tápanyagcsökkentő termékek csak a mérések és a teendők után, és kérdezz minket előtte.",
      ],
      bevezeto:
        "A boltunk kínálatából azok, amelyeknek a bolti szövege a nitrát vagy a foszfát csökkentését írja; a hatás gyártói állítás, nem garancia. Két típus van: biológiai szénforrások (a baktériumok anyagcseréjét serkentik) és adszorbensek (megkötik).",
      kezelok: [
        {
          termekek: [
            {
              sku: "4260246927295",
              handle: "nyos-nitrate-minus-1000ml-nitratcsokkento-keszitmeny",
            },
          ],
          megjegyzes: "Biológiai nitrátcsökkentő.",
        },
        {
          termekek: [
            {
              sku: "642213326807",
              handle: "xepta-np-out-1000-ml",
            },
          ],
          megjegyzes:
            "Szénforrás a nitrát és a foszfát biológiai eltávolításához.",
        },
        {
          termekek: [
            {
              sku: "7290100773895",
              handle: "redsea-no3-po4-x-nitrat-foszfat-kontroll-5000ml",
            },
          ],
          megjegyzes:
            "A bolti szöveg szerint biológiailag csökkenti a nitrátot és a foszfátot.",
        },
        {
          termekek: [
            {
              sku: "8032755805144",
              handle: "aquili-phosphate-minus-250ml",
            },
            {
              sku: "aquaforest_phosohate",
              handle: "aquaforest-phosphate-minus-100ml",
            },
            {
              sku: "0710270147946",
              handle:
                "microbe-lift-phos-out-4-granulalt-foszfatmegkoto-1000ml-550g",
            },
          ],
          megjegyzes: "Foszfátmegkötők (adszorbensek).",
        },
      ],
      utolso: [
        "A Xepta és a Red Sea termék szövege a zooxanthellák számának csökkentéséről is beszél: ezért fehéredő korallnál ezek nem ajánlottak (lásd a 6. oldalt). Ne vidd nullára a tápanyagot.",
      ],
    },
  },
]

export const tunetOldal = (slug: string): TunetOldal | undefined =>
  TUNET_OLDALAK.find((oldal) => oldal.slug === slug)

/** Minden hivatkozott bolti kezelo (mérőeszköz és kezelő termék), egyszer. */
export function tunetKezelok(oldal: TunetOldal): string[] {
  return Array.from(
    new Set([
      ...oldal.termekek.meroeszkozok.map((t) => t.handle),
      ...oldal.termekek.kezelok.flatMap((k) => k.termekek.map((t) => t.handle)),
    ]),
  )
}

export type SzovegDarab = { szoveg: string } | { szam: number; szoveg: string }

/**
 * A szoveg darabjai: az "N. oldal" (es a mogotte allo zarojeles nev) hivatkozasa az N. tunet oldalara mutat, ha az oldal
 * megvan (`letezo`); ahol nincs, sima szoveg marad. A szamok a belepo listajanak szamai.
 */
export function szovegDarabok(
  szoveg: string,
  letezo: ReadonlySet<number>,
): SzovegDarab[] {
  const darabok: SzovegDarab[] = []
  let utolso = 0
  const minta = /(\d+)\. oldal\w*(?:\s*\([^)]*\))?/g
  let m: RegExpExecArray | null
  while ((m = minta.exec(szoveg)) !== null) {
    const szam = Number(m[1])
    if (!letezo.has(szam)) continue
    if (m.index > utolso)
      darabok.push({ szoveg: szoveg.slice(utolso, m.index) })
    darabok.push({ szam, szoveg: m[0] })
    utolso = m.index + m[0].length
  }
  if (utolso < szoveg.length) darabok.push({ szoveg: szoveg.slice(utolso) })
  return darabok
}
