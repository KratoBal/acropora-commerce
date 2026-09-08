/**
 * A LABLEC HIVATKOZASAI, EGY HELYEN.
 *
 * A forras a MAI ELO BOLT lableca (shop.acropora.hu), nem a tervfajl. Balazs
 * dontese, es lemerve is ez all: a tervfajl EGYALTALAN NEM TARTALMAZ lablecet
 * (nulla `footer` elofordulas). A cim es az email szerepel benne egyszer, de a
 * "Kerdezd a boltot" doboz tartalmakent, nem lablec-szovegkent.
 *
 * A bolt lableca TIZENHAROM hivatkozast tart, harom oszlopban. Ebbol hatnak van
 * megfeleloje a kirakatban, hetnek NINCS.
 *
 * === MIERT VAN A HET KULSO CIM EGY LISTABAN, ES MIERT NEM A JSX KOZOTT ===
 *
 * acrobot keresе (2026-09-08), es az indoka egy sor: amikor ezek a lapok
 * elkeszulnek, EGY helyen kell atirni oket -- ha het helyen allnanak, hat
 * atirodna, es a hetediket senki nem venne eszre.
 *
 * === ES EGY FELTETEL, AMI NELKUL A HET HIVATKOZAS HAZUDNI FOG ===
 *
 * Ma a shop.acropora.hu A VALODI BOLT: ott vasarolnak, es az ott allo ASZF a
 * ma ervenyes. Egy odavivo link tehat IGAZAT mond.
 *
 * Ez ELESITESKOR fordul at. Amint az uj kirakat lesz a bolt, egy "ASZF" link,
 * ami egy MASIK boltba viszi a vevot, rosszabb a hianyzo linknel.
 *
 *   AZ ELESITES ELOTT MIND A HET TETELNEK SAJAT LAPRA KELL MUTATNIA.
 *
 * A szovegeket NEM lehet gepiesen atmasolni: harom kozuluk jogi szoveg, es az
 * UNAS boltra irt ASZF a UNAS fizetesi es szallitasi folyamatat irja le. Egy
 * masik motoron ugyanaz a szoveg mar nem igaz. Ez kulon, emberi munka.
 */

/**
 * AZ OSZLOP IS ADAT, NEM A JSX TULAJDONA.
 *
 * A bolt lableceben a tizenharom tetel HAROM oszlopban all, es a csoportositas
 * nem kozombos: a "Kosár" a vasarloi fiok mellett all, nem az oldalterkepen.
 * Ha az oszlop a JSX-ben dolne el, a lista ket helyen mondana meg ugyanazt --
 * es a ket hely elteveddese nem hibazna, csak mast mutatna.
 */
export type LablecOszlop = "oldalterkep" | "fiok" | "informaciok"

export const OSZLOP_CIMEK: Record<LablecOszlop, string> = {
  oldalterkep: "Oldaltérkép",
  fiok: "Vásárlói fiók",
  informaciok: "Információk",
}

/** A megjelenesi sorrend, a bolt lableceenek megfeleloen. */
export const OSZLOP_SORREND: readonly LablecOszlop[] = [
  "oldalterkep",
  "fiok",
  "informaciok",
] as const

export type LablecHivatkozas = {
  cimke: string
  cim: string
  oszlop: LablecOszlop
}

/**
 * AKINEK VAN MEGFELELOJE A KIRAKATBAN. Sajat utvonalra megy.
 *
 * A HAROM FIOK-TETEL UGYANODA MUTAT, ES EZ MERES, NEM HANYAGSAG: a kirakatban
 * egyetlen `/account` utvonal all, parhuzamos agakkal (`@login` es
 * `@dashboard`). Bejelentkezes nelkul a belepteto lap jon, bejelentkezve a
 * fiok -- vagyis mind a harom felirat a HELYES lapra visz, csak a cimuk ma nem
 * tud kulonbozni. Kulon `/account/register` utvonal nem letezik.
 */
export const SAJAT_HIVATKOZASOK: readonly LablecHivatkozas[] = [
  { cimke: "Nyitóoldal", oszlop: "oldalterkep", cim: "/" },
  { cimke: "Termékek", oszlop: "oldalterkep", cim: "/store" },
  { cimke: "Belépés", oszlop: "fiok", cim: "/account" },
  { cimke: "Regisztráció", oszlop: "fiok", cim: "/account" },
  { cimke: "Profilom", oszlop: "fiok", cim: "/account" },
  { cimke: "Kosár", oszlop: "fiok", cim: "/cart" },
] as const

/**
 * AKINEK MA NINCS MEGFELELOJE. A REGI BOLTBA visz, teljes cimmel.
 *
 * A "Kedvenceim" azert all itt, es nem a sajat listaban: a kirakatban nincs
 * kivansaglista-utvonal. Nem elfelejtettuk, hanem nincs.
 */
export const REGI_BOLT_HIVATKOZASOK: readonly LablecHivatkozas[] = [
  {
    cimke: "Kedvenceim",
    oszlop: "fiok",
    cim: "https://shop.acropora.hu/shop_order_track.php?tab=favourite",
  },
  {
    cimke: "Általános szerződési feltételek",
    oszlop: "informaciok",
    cim: "https://shop.acropora.hu/shop_help.php?tab=terms",
  },
  {
    cimke: "Adatkezelési tájékoztató",
    oszlop: "informaciok",
    cim: "https://shop.acropora.hu/shop_help.php?tab=privacy",
  },
  {
    cimke: "Fizetés",
    oszlop: "informaciok",
    cim: "https://shop.acropora.hu/shop_contact.php?tab=payment",
  },
  {
    cimke: "Szállítás",
    oszlop: "informaciok",
    cim: "https://shop.acropora.hu/shop_contact.php?tab=shipping",
  },
  {
    cimke: "Elérhetőségek",
    oszlop: "informaciok",
    cim: "https://shop.acropora.hu/shop_contact.php",
  },
  {
    cimke: "Képes vásárlói tájékoztató",
    oszlop: "informaciok",
    cim: "https://shop.acropora.hu/fogyaszto-barat",
  },
] as const

/**
 * A CEG ADATAI, a bolt lablecebol betuere, EGY TUDATOS ELTERESSEL.
 *
 * A boltban "Nyitvatarás" all, egy hianyzo `t` betuvel. Itt javitva. Ez nem
 * elirás-javitas, hanem dontes, ezert all ki: a SAJAT cegunk sajat lablece,
 * nem idezet. Husegel a jogi szovegnek es az arnak tartozunk, ott az elteres
 * komoly. Egy hianyzo betu a nyitvatartas szoban nem az. (acrobot, 2026-09-08.)
 *
 * A TELEFONSZAM ALAKJA A BOLTE (`+36-20/267-6801`). A tervfajl ugyanezt a
 * szamot `+36 20 267 6801` alakban irja, a "Kerdezd a boltot" dobozban. Ugyanaz
 * a szam, ket irasmod -- a lablec forrasa a bolt, tehat a bolte all itt.
 */
export const CEG = {
  nev: "Acropora Kft.",
  cim: "1106 Budapest, Pesti Gábor utca 35",
  telefon: "+36-20/267-6801",
  email: "webshop@acropora.hu",
  nyitvatartas: ["Kedd-Péntek 10-18", "Szombat 10-14", "Vasárnap-Hétfő Zárva"],
} as const
