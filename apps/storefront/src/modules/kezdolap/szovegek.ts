/**
 * A KEZDOLAP SZERKESZTHETO SZOVEGEI: A KATALOGUS.
 *
 * Balazs, 2026-10-20: "az egesz oldalon az osszes szoveg kitalalt. en fogom
 * atirni vagy atiratni veled". Ezert a kezdolap egyetlen cime, gombfelirata
 * vagy blokk-szovege sincs beegetve a komponensbe: mind egy KULCSON at jon, a
 * kulcs erteket az Acropora OS szerkeszti (`GET /store/homepage-content`), a
 * kulcs `alap` erteke pedig a terv szovege, KEZDOERTEKKENT.
 *
 * === A HIANYZO KULCS NEM URES FOLT ===
 *
 * Amit az OS meg nem kuldott, annak az `alap` ertek all a helyen, tehat egy uj
 * kulcs (egy kovetkezo PR-ban felvett uj blokk) nem tori el a lapot attol, hogy
 * az OS meg nem ismeri. Egy KIFEJEZETTEN kuldott ures szoveg viszont URES: az a
 * szerkeszto dontese (a sor eltunik), nem hiany.
 *
 * === AZ OS EBBOL OLVASSA A LISTAT ===
 *
 * A `kulcs`, a `csoport`, a `cimke`, a `tipus` es az `alap` az OS
 * szerkesztojenek bemenete is (3. PR). A lista ezert EGY helyen, adatkent all, nem a
 * komponensek kozott szetszorva.
 */
export type KezdolapTipus = "szoveg" | "link" | "kep"

/**
 * `szoveg`: sima szoveg (tobb soros is lehet, a sortores `\n`).
 * `link`: egy bolti ut (`/store`) VAGY egy `http(s)` cim; ures = nincs link, es
 *   az elem (gomb, sor) nem jelenik meg.
 * `kep`: egy kep cime (`http(s)` vagy bolti ut); ures = a lap szurke helyet
 *   mutat.
 * Ugyanaz a mezo-fajta mind a harom: az OS egy karakterlancot ir, a TIPUS
 * csak azt dönti el, hogyan olvassa a lap, es mit tesz az OS szerkesztoje
 * (szovegmezo, link-mezo, feltoltes).
 */
export type KezdolapSzoveg = {
  kulcs: string
  csoport: string
  cimke: string
  tipus: KezdolapTipus
  alap: string
}

const sor = (
  csoport: string,
  kulcs: string,
  cimke: string,
  alap: string,
  tipus: KezdolapTipus = "szoveg",
): KezdolapSzoveg => ({ kulcs, csoport, cimke, tipus, alap })

const sorszamok = (db: number) => Array.from({ length: db }, (_, i) => i + 1)

const HERO: KezdolapSzoveg[] = [
  sor("Hero", "hero.tenyek.1.cim", "Első tény: címsor", "Személyes átvétel"),
  sor("Hero", "hero.tenyek.1.szoveg", "Első tény: szöveg", "a budapesti boltban"),
  sor("Hero", "hero.tenyek.2.cim", "Második tény: címsor", "Szakmai tanácsadás"),
  sor("Hero", "hero.tenyek.2.szoveg", "Második tény: szöveg", "vásárlás előtt és után"),
  sor("Hero", "hero.tenyek.3.cim", "Harmadik tény: címsor (értékelés)", "4,9 / 5"),
  sor("Hero", "hero.tenyek.3.szoveg", "Harmadik tény: szöveg", "312 vásárlói értékelés"),
]

/** A "Mit keresel ma?" sav negy terulete, soronkent legfeljebb ot hivatkozassal. */
const TERULETEK: {
  cim: string
  linkek: [string, string | ""][]
}[] = [
  {
    cim: "Élőállat",
    linkek: [
      ["Tengeri halak", "/categories/halak"],
      ["SPS korallok", "/categories/korallok"],
      ["LPS korallok", "/categories/korallok"],
      ["Lágykorallok", "/categories/korallok"],
      ["Gerinctelenek", "/categories/gerinctelenek"],
    ],
  },
  {
    cim: "Technika",
    linkek: [
      ["Világítás", "/categories/technika"],
      ["Áramoltatók", "/categories/technika"],
      ["Szűréstechnika", "/categories/technika"],
      ["Mérés- és vezérléstechnika", "/categories/technika"],
    ],
  },
  {
    cim: "Vegyszer és fogyóanyag",
    linkek: [
      ["Víztesztek", "/categories/vizkezeles"],
      ["Tengeri sók", "/categories/vizkezeles"],
      ["Adalékanyagok", "/categories/vizkezeles"],
      ["Táp", "/categories/vizkezeles"],
    ],
  },
  {
    cim: "Szolgáltatások",
    linkek: [
      ["Tervezés és telepítés", "/hamarosan/szolgaltatasok"],
      ["Karbantartás", "/hamarosan/szolgaltatasok"],
      ["Szerviz", "/hamarosan/szolgaltatasok"],
      ["Vízmérés", "/hamarosan/szolgaltatasok"],
    ],
  },
]

const MIT_KERESEL: KezdolapSzoveg[] = [
  sor("Mit keresel ma?", "mit.cim", "Címsor", "Mit keresel ma?"),
  sor(
    "Mit keresel ma?",
    "mit.alcim",
    "Alcím",
    "Négy terület, egy bolt. Ha nem tudod, melyikkel kezdd, írj nekünk, és segítünk.",
  ),
  ...TERULETEK.flatMap((terulet, i) => {
    const n = i + 1
    const csoport = `Mit keresel ma? ${n}. terület`
    return [
      sor(csoport, `mit.${n}.cim`, "Terület neve", terulet.cim),
      sor(csoport, `mit.${n}.kep`, "Kép", "", "kep"),
      ...sorszamok(5).flatMap((l) => {
        const [felirat, link] = terulet.linkek[l - 1] ?? ["", ""]
        return [
          sor(csoport, `mit.${n}.l${l}.felirat`, `${l}. hivatkozás: felirat`, felirat),
          sor(csoport, `mit.${n}.l${l}.link`, `${l}. hivatkozás: cél`, link, "link"),
        ]
      }),
    ]
  }),
]

const KEZDOK: KezdolapSzoveg[] = [
  sor("Kezdőknek", "kezdo.felirat", "Felirat", "Kezdőknek"),
  sor("Kezdőknek", "kezdo.cim", "Címsor", "Most rakod össze az első tengeri akváriumodat?"),
  sor(
    "Kezdőknek",
    "kezdo.szoveg",
    "Bevezető",
    "Végigmegyünk veled az egészen: melyik medence, milyen technika, mennyi idő a beüzemelés, és mikor jöhetnek az első lakók.",
  ),
  ...(
    [
      ["1. lépés", "Tervezés", "Méret, hely, költségkeret"],
      ["2. lépés", "Beüzemelés", "4–6 hét türelem"],
      ["3. lépés", "Első lakók", "Halak és könnyű korallok"],
    ] as const
  ).flatMap(([lepes, cim, szoveg], i) => [
    sor("Kezdőknek", `kezdo.${i + 1}.lepes`, `${i + 1}. lépés: sorszám`, lepes),
    sor("Kezdőknek", `kezdo.${i + 1}.cim`, `${i + 1}. lépés: címsor`, cim),
    sor("Kezdőknek", `kezdo.${i + 1}.szoveg`, `${i + 1}. lépés: szöveg`, szoveg),
  ]),
  sor("Kezdőknek", "kezdo.gomb1.felirat", "Első gomb: felirat", "Kezdő útmutató"),
  sor("Kezdőknek", "kezdo.gomb1.link", "Első gomb: cél", "", "link"),
  sor("Kezdőknek", "kezdo.gomb2.felirat", "Második gomb: felirat", "Időpont tanácsadásra"),
  sor("Kezdőknek", "kezdo.gomb2.link", "Második gomb: cél", "", "link"),
]

const HALADOK: KezdolapSzoveg[] = [
  sor("Tapasztaltaknak", "halado.felirat", "Felirat", "Tapasztaltaknak"),
  sor("Tapasztaltaknak", "halado.cim", "Címsor", "Tudod, mit keresel. Itt megtalálod."),
  ...(
    [
      ["SPS frag-ok, eredet szerint", "Ausztrália, Indonézia, saját szaporítás", "/categories/korallok"],
      ["Laboratóriumi vízmérés", "Mintaleadás a boltban", "/hamarosan/szolgaltatasok"],
      ["Adalékanyagok és nyomelemek", "Fauna Marin, Tropic Marin, Red Sea", "/categories/vizkezeles"],
      ["Vezérlés és dózispumpák", "Alkatrész és szerviz is", "/categories/technika"],
    ] as const
  ).flatMap(([cim, szoveg, link], i) => [
    sor("Tapasztaltaknak", `halado.${i + 1}.cim`, `${i + 1}. sor: felirat`, cim),
    sor("Tapasztaltaknak", `halado.${i + 1}.szoveg`, `${i + 1}. sor: jobb oldali szöveg`, szoveg),
    sor("Tapasztaltaknak", `halado.${i + 1}.link`, `${i + 1}. sor: cél`, link, "link"),
  ]),
  sor("Tapasztaltaknak", "halado.gomb.felirat", "Gomb: felirat", "Friss érkezések"),
  sor("Tapasztaltaknak", "halado.gomb.link", "Gomb: cél", "/store", "link"),
]

const SZOLGALTATASOK: KezdolapSzoveg[] = [
  sor("Szolgáltatások", "szolg.kep", "Kép", "", "kep"),
  sor("Szolgáltatások", "szolg.felirat", "Felirat", "Szolgáltatások"),
  sor("Szolgáltatások", "szolg.cim", "Címsor", "Az akváriumod első napjától évekig."),
  ...(
    [
      ["Tervezés és telepítés", "Helyszíni felmérés, technikai terv, összeszerelés és beüzemelés.", "Ajánlatot kérek →"],
      ["Rendszeres karbantartás", "Vízcsere, tisztítás, paraméterek ellenőrzése, heti vagy havi rendben.", "Részletek →"],
      ["Szerviz", "Szivattyúk, lámpák, fölözők és vezérlők javítása.", "Részletek →"],
      ["Vízmérés", "Hozd be a mintát, és elmondjuk, mit jelentenek a számok.", "Részletek →"],
    ] as const
  ).flatMap(([cim, szoveg, felirat], i) => [
    sor("Szolgáltatások", `szolg.${i + 1}.cim`, `${i + 1}. szolgáltatás: név`, cim),
    sor("Szolgáltatások", `szolg.${i + 1}.szoveg`, `${i + 1}. szolgáltatás: leírás`, szoveg),
    sor("Szolgáltatások", `szolg.${i + 1}.felirat`, `${i + 1}. szolgáltatás: hivatkozás felirata`, felirat),
    sor("Szolgáltatások", `szolg.${i + 1}.link`, `${i + 1}. szolgáltatás: cél`, "/hamarosan/szolgaltatasok", "link"),
  ]),
]

const MARKAK: KezdolapSzoveg[] = [
  sor("Márkák", "markak.felirat", "Felirat", "Márkák, amelyekkel mi is dolgozunk"),
  ...["Red Sea", "Tropic Marin", "Fauna Marin", "Microbe-Lift"].map((nev, i) =>
    sor("Márkák", `markak.${i + 1}`, `${i + 1}. márka neve`, nev),
  ),
  sor("Márkák", "markak.osszes.felirat", "Összes márka: felirat", "Összes márka →"),
  sor("Márkák", "markak.osszes.link", "Összes márka: cél", "", "link"),
]

const VELEMENYEK: KezdolapSzoveg[] = [
  sor("Vélemények", "velemenyek.cim", "Címsor", "Akik már nálunk vásároltak"),
  sor("Vélemények", "velemenyek.pont", "Értékelés: pontszám", "4,9 / 5"),
  sor("Vélemények", "velemenyek.szoveg", "Értékelés: szöveg", "312 Google-értékelés"),
  ...(
    [
      ["„A millepora pontosan olyan színű, mint a fotón. Az átvételnél még tíz percet beszélgettünk az akklimatizálásról.”", "Kovács Gergely", "egyedi korall vásárlása"],
      ["„Kezdőként jöttem be egy listával, és egy jóval rövidebbel mentem haza. Fél év után sem bántam meg semmit.”", "Szabó Anna", "első tengeri akvárium"],
      ["„Két éve ők tartják karban a 600 literes rendszerünket. A vízértékekről havonta kapok összefoglalót.”", "Tóth Péter", "karbantartási szerződés"],
    ] as const
  ).flatMap(([idezet, nev, megjegyzes], i) => [
    sor("Vélemények", `velemenyek.${i + 1}.idezet`, `${i + 1}. vélemény: idézet`, idezet),
    sor("Vélemények", `velemenyek.${i + 1}.nev`, `${i + 1}. vélemény: név`, nev),
    sor("Vélemények", `velemenyek.${i + 1}.megjegyzes`, `${i + 1}. vélemény: megjegyzés`, megjegyzes),
  ]),
]

const BOLT: KezdolapSzoveg[] = [
  sor("A boltunk", "bolt.felirat", "Felirat", "A boltunk"),
  sor("A boltunk", "bolt.cim", "Címsor", "Gyere be, nézd meg élőben."),
  sor(
    "A boltunk",
    "bolt.szoveg",
    "Bevezető",
    "Az élőállatot csak személyesen adjuk át, így biztosan egészségesen és jól csomagolva viszed haza.",
  ),
  sor("A boltunk", "bolt.cim_felirat", "Cím: felirat", "Cím"),
  sor("A boltunk", "bolt.cim_ertek", "Cím: érték (sortöréssel)", "1117 Budapest,\nPélda utca 12."),
  sor("A boltunk", "bolt.nyitva_felirat", "Nyitvatartás: felirat", "Nyitvatartás"),
  sor("A boltunk", "bolt.nyitva_ertek", "Nyitvatartás: érték (sortöréssel)", "Hétfő–péntek 10–19\nSzombat 9–14"),
  sor("A boltunk", "bolt.gomb.felirat", "Gomb: felirat", "Útvonaltervezés"),
  sor("A boltunk", "bolt.gomb.link", "Gomb: cél (térkép)", "", "link"),
  sor("A boltunk", "bolt.kep", "Kép", "", "kep"),
]

export const KEZDOLAP_SZOVEGEK: readonly KezdolapSzoveg[] = [
  ...HERO,
  ...MIT_KERESEL,
  ...KEZDOK,
  ...HALADOK,
  ...SZOLGALTATASOK,
  ...MARKAK,
  ...VELEMENYEK,
  ...BOLT,
]

const SOROK: ReadonlyMap<string, KezdolapSzoveg> = new Map(
  KEZDOLAP_SZOVEGEK.map((sor) => [sor.kulcs, sor]),
)

/** Egy bolti ut: egy perjel, utana se `/`, se `\`, szokoz sem (a bolt validatoraval egyezik). */
const BOLTI_UT = /^\/(?![/\\])[^\s\\]*$/
const KULSO_CIM = /^https?:\/\/[^\s\\]+$/

export type KezdolapCim = { href: string; kulso: boolean }

/**
 * A HIVATKOZAS ES A KEP CIME CSAK BIZTONSAGOS ALAKBAN JUT A LAPRA. Az OS a
 * gazda, de ez a ket mezo szoveg, es egy `javascript:` vagy `data:` cim a
 * `href`-ben vagy a `src`-ben ugyanugy XSS lenne, mint a HTML. Ami nem illik
 * a mintara, azt a lap ugy kezeli, mintha ures lenne (nincs link, nincs kep).
 */
export const biztonsagosCim = (ertek: string): KezdolapCim | null => {
  if (BOLTI_UT.test(ertek)) return { href: ertek, kulso: false }
  if (KULSO_CIM.test(ertek)) return { href: ertek, kulso: true }
  return null
}

const kuldott = (texts: Record<string, string> | null, kulcs: string) =>
  texts && Object.prototype.hasOwnProperty.call(texts, kulcs)
    ? texts[kulcs]
    : null

const ertek = (
  texts: Record<string, string> | null,
  kulcs: string,
  tipus: KezdolapTipus,
): string => {
  const sor = SOROK.get(kulcs)
  if (!sor) throw new Error(`ismeretlen kezdolap-szoveg kulcs: ${kulcs}`)
  if (sor.tipus !== tipus)
    throw new Error(`a(z) ${kulcs} kulcs tipusa ${sor.tipus}, nem ${tipus}`)
  const k = kuldott(texts, kulcs)
  return typeof k === "string" ? k : sor.alap
}

/**
 * A szoveg-kereso egy tartalomhoz. Az OS-tol kapott `texts` elsobbseget elvez,
 * akkor is, ha ures; ami nincs benne, annak a katalogus `alap` erteke all. Egy
 * ISMERETLEN kulcs hiba (nem ures szoveg): egy elgepelt kulcs ne tunjon el
 * csendben a lapon. Egy kulcsot csak a SAJAT tipusaval lehet olvasni.
 */
export const szovegKereso = (texts: Record<string, string> | null) => {
  return (kulcs: string): string => ertek(texts, kulcs, "szoveg")
}

export const linkKereso = (texts: Record<string, string> | null) => {
  return (kulcs: string): KezdolapCim | null =>
    biztonsagosCim(ertek(texts, kulcs, "link"))
}

/** A kep cime, vagy `null` (ures, vagy nem biztonsagos cim). */
export const kepKereso = (texts: Record<string, string> | null) => {
  return (kulcs: string): string | null =>
    biztonsagosCim(ertek(texts, kulcs, "kep"))?.href ?? null
}

/** A lap komponenseinek egy csomagban atadott kereso-hármasa. */
export type Szovegek = {
  szoveg: ReturnType<typeof szovegKereso>
  link: ReturnType<typeof linkKereso>
  kep: ReturnType<typeof kepKereso>
}

export const szovegek = (texts: Record<string, string> | null): Szovegek => ({
  szoveg: szovegKereso(texts),
  link: linkKereso(texts),
  kep: kepKereso(texts),
})
