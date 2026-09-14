/**
 * A KEZDOLAP MINTA-ADATAI -- EGY FAJLBAN, ES SZANDEKOSAN ITT.
 *
 * === MIERT LETEZIK EGYALTALAN ===
 *
 * A kezdolap terve (Balazs, 2026-09-14 11:36) HET savot ir le. Lemertem, mi
 * all ma mindegyik mogott a teszt boltban (2026-09-14 14:15, commerce-stage):
 *
 *   kategoriasav   VAN ADAT, 219 kategoria. Elo adatbol epul, nem innen.
 *   lablec         MAR MEGEPULT a terv szerint. Nem innen.
 *   akcios sor     NULLA. 1494 termek, 1490 valtozat hordoz arat a magyar
 *                  regioban, es EGYETLEN EGYEN SINCS kedvezmenyes ar
 *                  (original_amount != calculated_amount sehol). A tervbeli
 *                  -20 es -30 szazalek MA nem szarmaztathato adatbol.
 *   hero-csuszka   nincs forras: kep es szoveg kell hozza (tartalmi dontes).
 *   Reef Club      nincs mogotte pontgyujtes es nincs feliratkozo lista.
 *   magazin        nincs cikkforras a boltban.
 *   video          nincs kivalasztott video.
 *
 * Balazs dontese ugyanezen a napon, szo szerint: "epitsd meg, ahol lehet ott
 * eles ahol nem ott mock adatokkal".
 *
 * === A KET SZABALY, AMI EZT A FAJLT HASZNALHATOVA TESZI ===
 *
 * 1. AMI INNEN JON, AZT A LAP MEGJELOLI. Minden sav, ami ebbol a fajlbol
 *    olvas, a `MintaJelzo` cimket viseli. Egy jelolesetlen minta-adat
 *    ugyanugy tovabbutazik, mint egy valodi szam: kepernyokepen, atadasban,
 *    dontes alatt. A kedvezmeny-szazaleknal ez nem stilus-kerdes, hanem a
 *    kulonbseg egy hirdetes es egy helykitolto kozott.
 *
 * 2. A SZOVEG A TERVLAPROL JON, NEM TOLEM. Minden mondat, ar es cim alabb a
 *    kezdolap-terv sajat demo-tartalma. Ha valamit en talaltam volna ki, az
 *    egy MASODIK kitalalt reteg lenne a terv folott, es kesobb senki nem
 *    tudna szetvalasztani, melyik szo szarmazik Balazstol.
 *
 * === HOGY TUNIK EL ===
 *
 * Savonkent, nem egyszerre. Amikor egy sav valodi forrast kap (peldaul az
 * elso kedvezmenyes ar megjelenik a boltban), az adott konstans torlodik, a
 * sav elo adatot olvas, es a `MintaJelzo` lekerul rola. A fajl akkor szunik
 * meg, amikor az utolso konstans is elfogy.
 */

/** Egy dia a hero-csuszkan. */
export interface MintaDia {
  eyebrow: string
  cim: string
  szoveg: string
  elsoGomb: string
  masodikGomb: string
}

/**
 * A HERO-CSUSZKA DIAI.
 *
 * A terv EGY diat mutat kidolgozva, es a lapozo alatta "01 / 03" allast ir.
 * A masik ket dia szovege ezert nem szerepel a terven: azokat a cimeket a
 * tervlap sajat kategoria-csempeirol vettem at (Vilagitastechnika, Vizkezeles),
 * hogy a csuszka mozgasa megnezheto legyen. Tartalmi ertekuk NINCS.
 */
export const MINTA_DIAK: MintaDia[] = [
  {
    eyebrow: "Új szállítmány · SPS",
    cim: "Friss indonéz korallok a telepen",
    szoveg:
      "Minden példány egyedi, fotóval és mérettel. Karanténból kikerült, telepített darabok.",
    elsoGomb: "Korallok megtekintése",
    masodikGomb: "Hogyan vásárolj élő állatot",
  },
  {
    eyebrow: "Világítástechnika",
    cim: "Lámpák minden medenceméretre",
    szoveg:
      "LED, T5 és hibrid megoldások, a nano medencétől a bemutató akváriumig.",
    elsoGomb: "Lámpák megtekintése",
    masodikGomb: "Mennyi fény kell az SPS-nek",
  },
  {
    eyebrow: "Vízkezelés",
    cim: "A víz a kiindulás, nem a következmény",
    szoveg:
      "Foszfátmegkötők, baktériumkultúrák, adalékok és a hozzájuk tartozó tesztek.",
    elsoGomb: "Vízkezelés megtekintése",
    masodikGomb: "ICP vízanalízis",
  },
]

/** Egy kedvezmenyes termek az akcios soron. */
export interface MintaAkcio {
  marka: string
  cikkszam: string
  nev: string
  ar: string
  regiAr: string
  kedvezmeny: string
  allapot: string
}

/**
 * AZ AKCIOS SOR NEGY TETELE -- MIND A NEGY A TERVLAPROL.
 *
 * A szazalekok, az arak es a keszlet-feliratok is onnan jonnek. Ezek NEM a mi
 * katalogusunk termekei: szandekosan NEM kotottem valodi termekhez egyetlen
 * kitalalt szazalekot sem. Egy valodi termeknev melle irt kitalalt "-30%"
 * kepernyokepen mar hirdetesnek latszik, es a jelzo nem utazik vele.
 */
export const MINTA_AKCIOK: MintaAkcio[] = [
  {
    marka: "Reef LED",
    cikkszam: "RL160P",
    nev: "Reef LED 160 Pro függeszthető lámpa",
    ar: "217 400 Ft",
    regiAr: "259 000 Ft",
    kedvezmeny: "-20%",
    allapot: "Raktáron · 3 db",
  },
  {
    marka: "Flow",
    cikkszam: "WP40",
    nev: "Áramlásgenerátor WP-40 vezérlővel",
    ar: "48 700 Ft",
    regiAr: "59 900 Ft",
    kedvezmeny: "-19%",
    allapot: "Raktáron · 11 db",
  },
  {
    marka: "Teszt",
    cikkszam: "ICP2",
    nev: "ICP vízanalízis csomag, 2 db teszt",
    ar: "19 900 Ft",
    regiAr: "28 400 Ft",
    kedvezmeny: "-30%",
    allapot: "Utolsó 2 db",
  },
  {
    marka: "SPS · Acropora",
    cikkszam: "AC-TT-01",
    nev: "Acropora tabletop, telepített darab",
    ar: "24 900 Ft",
    regiAr: "29 000 Ft",
    kedvezmeny: "Egyedi · 1 db",
    allapot: "Csak boltban átvehető",
  },
]

/**
 * AZ AKCIO VEGE -- RELATIV, NEM EGY BEEGETETT NAP.
 *
 * A terven "AZ AKCIÓ VÉGE: 04 NAP 12:38" all. Egy beegetett datum ket nap
 * mulva multbeli lenne, es a visszaszamlalo negativba fordulna: az egy MAS
 * hiba latszatat keltene, mint ami van (nem a minta-adat latszana rossznak,
 * hanem a szamlalo). Ezert a hatarido a lap betoltesehez kepest ertendo.
 */
export const MINTA_AKCIO_HATRALEVO_ORA = 4 * 24 + 12

/** Egy cikk a magazin savon. */
export interface MintaCikk {
  rovat: string
  cim: string
  bevezeto?: string
  datum: string
  kiemelt?: boolean
}

/** A MAGAZIN HAROM CIKKE -- mind a harom cim a tervlaprol. */
export const MINTA_CIKKEK: MintaCikk[] = [
  {
    rovat: "Ismerkedés · Reef Glossary",
    cim: "Az első 90 nap: hogyan érjen be egy új tengeri akvárium",
    bevezeto:
      "Ciklus, első lakók, mérési ütemterv, és a tipikus hibák, amiket a boltban hetente hallunk.",
    datum: "2026. szeptember 3.",
    kiemelt: true,
  },
  {
    rovat: "Vízkezelés",
    cim: "Miért nem nő a korall, ha a paraméterek jók?",
    datum: "2026. augusztus 21.",
  },
  {
    rovat: "Világítás",
    cim: "PAR-mérés otthon: mennyi fény kell az SPS-nek?",
    datum: "2026. augusztus 9.",
  },
]

/** A VIDEO SAV -- a cim es a ket fejezet is a tervlaprol. */
export const MINTA_VIDEO = {
  cim: "Szállítmány kicsomagolása: 180 korall karanténba",
  szoveg:
    "Végigmegyünk egy teljes érkezésen: mit nézünk meg elsőként, mi kerül azonnal karanténba, és mikor megy ki a webshopba.",
  fejezetek: [
    "Nano akvárium indítása 0 tól 22:14",
    "Fragvágás lépésről lépésre 14:02",
  ],
}

/**
 * A REEF CLUB DOBOZ SZOVEGE.
 *
 * A terv teljes szovege, valtoztatas nelkul. A feliratkozo urlap MA nem
 * kuld sehova: nincs lista, amire feliratkozzon. Ezert a sav gombja tiltott
 * allapotban all -- egy mukodonek latszo, de nemaba futo urlap rosszabb a
 * hianyzo urlapnal, mert a vevo azt hiszi, hogy feliratkozott.
 */
export const MINTA_REEF_CLUB = {
  eyebrow: "Reef Club · Hamarosan",
  cim: "Klub azoknak, akik nem egy akváriumot akarnak, hanem egy zátonyt",
  szoveg:
    "A Reef Club a bolt közössége: pontgyűjtés minden vásárlás után, előbbre látod az új szállítmányokat, és hasonló rangú klubdélutánok a boltban, ahol vért mérünk, fragot vágunk és megbeszéljük, mi miért nem működik.",
  urlapCim: "Szólj, ha indul",
  urlapSzoveg:
    "Ha bent lesz az e-mail címed, és az induláskor te kapod az első meghívást. Nem küldünk hetente levelet.",
  gomb: "Feliratkozom a listára",
  gombAlatt: "Eddig 428 vásárlónak van fenn a listán.",
  pontok: [
    {
      cim: "Pontgyűjtés",
      szoveg: "Minden 1000 Ft után 1 pont, pontból korall vagy vízteszt.",
    },
    {
      cim: "Korai hozzáférés",
      szoveg: "Az új szállítmány 24 órával előbb nyílik meg a tagoknak.",
    },
    {
      cim: "Klubdélután",
      szoveg: "Havonta workshop a boltban, tagoknak ingyenes.",
    },
  ],
}
