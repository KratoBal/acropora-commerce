import { KEZDOLAP_SZOVEGEK, szovegek } from "./szovegek"

/**
 * Egy dia a hero-csuszkan, ahogy a bolt `GET /store/homepage-content` adja
 * (a mezonevek a backend validatoraeval egyeznek).
 */
export type HeroDia = {
  eyebrow: string
  title: string
  text: string
  cta: string
  cta_href: string | null
  cta2: string
  cta2_href: string | null
  caption: string
  caption2: string
  image_url: string | null
  image_alt: string
  /**
   * CSAK A KEZDOERTEK DIAIN (`ALAP_DIAK`), SOHA AZ OS REKORDJABAN: a diak
   * kepalairasaban ar es cikkszam, a szovegeiben tenyallitas all, amit a lap a
   * `MintaJelzo` cimkevel jelol, amig az OS nem ir sajat diakat.
   */
  minta?: boolean
}

/** Egy fix blokk a kezdolapon: a kulcs es hogy latszik-e (a sorrend a lista sorrendje). */
export type KezdolapBlokk = { key: string; visible: boolean }

/**
 * A SZERKESZTHETO LABLEC, ahogy a bolt adja (`GET /store/homepage-content`).
 * Az `intro` HTML: a lap NEM veszi adottnak, a sajat tisztitasan at rajzolja.
 * Elerhetoseg (cim, nyitvatartas) nincs benne: az "A boltunk" blokk szovegeibol
 * jon, hogy egy cim legyen a lapon, ne ketto. A jogi dokumentumokat a lap mindig
 * maga teszi hozza.
 */
export type KezdolapLablec = {
  intro: string
  columns: Array<{
    title: string
    links: Array<{ label: string; href: string }>
  }>
  social: {
    facebook: string | null
    instagram: string | null
    youtube: string | null
  }
  bottom_text: string
}

/** A bolt valasza: `null`, amig az OS nem irt semmit. */
/**
 * A LABLEC FOLOTTI HIRLEVEL-SOR (Balazs, 2026-10-27, kirakat-lablec-kep), a
 * bolt `homepage_content.newsletter` alakja (#577). A hozzajarulas szovege az,
 * amit a feliratkozas rogzit; mellette a lap az Adatkezelesi tajekoztato
 * linkjet teszi ki.
 */
export type KezdolapHirlevel = {
  enabled: boolean
  title: string
  text: string
  consent_text: string
  button: string
}

export type KezdolapTartalom = {
  texts: Record<string, string>
  /** `null`: az OS nem allitott be diakat, a kezdodiak allnak; `[]`: nincs hero. */
  slides: HeroDia[] | null
  /** Az Egyedi korallok sav termek-handle-jei sorrendben; `null` vagy ures: a sav rejtett. */
  featured_handles?: string[] | null
  /**
   * A markak logosavjanak marka-handle-jei sorrendben (Balazs, 2026-10-27:
   * tetszoleges szamu marka); `null` vagy ures: a sav a nevek sorat mutatja.
   */
  featured_brand_handles?: string[] | null
  /** A fix blokkok sorrendje es lathatosaga; `null` vagy hiany: a lap sorrendje, minden latszik. */
  blocks?: KezdolapBlokk[] | null
  /** A szerkesztheto lablec; `null` vagy hiany: a lap sajat lablece. */
  footer?: KezdolapLablec | null
  /** A hirlevel-sor; `null` vagy hiany: a lap sajat sora (bekapcsolva, a regi bolt szovegeivel). */
  newsletter?: KezdolapHirlevel | null
  /**
   * CSAK A SZERVER ALLITJA (`tisztitas.ts`), SOHA nem jon az OS-bol (a rekord
   * validatora ismeretlen kulcskent elutasitja): jelzi, hogy a formazott
   * szovegek a "short" profilon atmentek. Enelkul a lap sima szovegnek veszi oket.
   */
  tisztitott?: boolean
}

/**
 * A TERV HAROM DIAJA, KEZDOERTEKKENT. Csak akkor all a helyen, ha az OS meg
 * SEMMIT nem irt (a valasz `null`); amint ir egy rekordot, annak diai nyernek,
 * akkor is, ha ures a lista (az a szerkeszto dontese: nincs csuszka).
 *
 * A link ott ures (`null`), ahol a terv gombjanak nincs meg a celoldala:
 * a gomb ilyenkor NEM jelenik meg, mert egy halott gomb rosszabb a hianyzonal.
 */
export const ALAP_DIAK: readonly HeroDia[] = [
  {
    eyebrow: "Tengeri akvarisztikai szaküzlet · Budapest",
    title: "A zátonyod darabjait egyenként válogatjuk.",
    text: "Egyedi korallok, amelyeket pontosan úgy kapsz meg, ahogy a fotón látod. Mellé technika, vegyszer és tanács azoktól, akik maguk is zátonyakváriumot tartanak.",
    cta: "Egyedi korallok",
    cta_href: "/store",
    cta2: "Most kezdem a tengeri akváriumot",
    cta2_href: null,
    caption: "A fotón: Acropora tenuis, #K-2418",
    caption2: "Egyedi példány · 21 900 Ft",
    image_url: null,
    image_alt: "Zátonyakvárium közelről, korallokkal",
    minta: true,
  },
  {
    eyebrow: "Friss érkezés · minden pénteken",
    title: "Új korallok kerültek a medencékbe.",
    text: "Ausztrál és indonéz SPS és LPS darabok, mindegyik külön fotózva. Lefoglalod a webshopban, átveszed a budapesti boltban.",
    cta: "Friss érkezések",
    cta_href: "/store",
    cta2: "Értesítést kérek",
    cta2_href: null,
    caption: "A fotón: Euphyllia ancora, #K-2409",
    caption2: "Egyedi példány · 24 500 Ft",
    image_url: null,
    image_alt: "Friss korallok a bolti medencében",
    minta: true,
  },
  {
    eyebrow: "Tervezés és telepítés",
    title: "Megtervezzük és beüzemeljük az akváriumodat.",
    text: "Helyszíni felmérés, technikai terv, összeszerelés és beüzemelés. Utána karbantartással és vízméréssel is melletted maradunk.",
    cta: "Ajánlatot kérek",
    cta_href: null,
    cta2: "Szolgáltatásaink",
    cta2_href: null,
    caption: "A fotón: általunk telepített zátonyakvárium",
    caption2: "Tervezés, telepítés, havi karbantartás",
    image_url: null,
    image_alt: "Általunk telepített akvárium egy otthonban",
    minta: true,
  },
]

/** A bolt valaszabol a lapnak szolo alak: a keresok (szoveg, link, kep) es a diak. */
export const kezdolapAdat = (tartalom: KezdolapTartalom | null) => ({
  ...szovegek(tartalom?.texts ?? null, tartalom?.tisztitott === true),
  diak: tartalom?.slides ?? [...ALAP_DIAK],
  tisztitott: tartalom?.tisztitott === true,
})

export { KEZDOLAP_SZOVEGEK }
