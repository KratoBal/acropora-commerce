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
 *
 * A LABLECBEN FIX (Balazs, 2026-10-27, kirakat-lablec-kep): az OS nem irja
 * felul; "ha valtozik, mi irjuk at" -- itt, ebben a fajlban.
 */
export const CEG = {
  nev: "Acropora Kft.",
  cim: "1106 Budapest, Pesti Gábor utca 35",
  telefon: "+36-20/267-6801",
  email: "webshop@acropora.hu",
  nyitvatartas: ["Kedd-Péntek 10-18", "Szombat 10-14", "Vasárnap-Hétfő Zárva"],
} as const

/**
 * A NYITVATARTAS A NYITOTT NAPOKKAL, "Zarva" nelkul: a fejlec info-savja ezt mondja ki ("Nyitva: Kedd-Pentek
 * 10-18, Szombat 10-14"), a lablec pedig mindent, a zarva napokkal egyutt. EGY forrasbol, hogy a ketto ne
 * mondhasson mast.
 */
export const CEG_NYITVA: readonly string[] = CEG.nyitvatartas.filter(
  (nap) => !/zárva/i.test(nap),
)
