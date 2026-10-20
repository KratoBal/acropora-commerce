import { KEZDOLAP_SZOVEGEK, szovegKereso } from "./szovegek"

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
}

/** A bolt valasza: `null`, amig az OS nem irt semmit. */
export type KezdolapTartalom = {
  texts: Record<string, string>
  slides: HeroDia[]
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
  },
]

/** A bolt valaszabol a lapnak szolo alak: szoveg-kereso es diak. */
export const kezdolapAdat = (tartalom: KezdolapTartalom | null) => ({
  szoveg: szovegKereso(tartalom?.texts ?? null),
  diak: tartalom ? tartalom.slides : [...ALAP_DIAK],
})

export { KEZDOLAP_SZOVEGEK }
