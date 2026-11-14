/**
 * "INDITSD EL A KOROLLOS AKVARIUMODAT" (V4.4, kartya 34b46727): hat lepeses cikk-oldal a teszt kirakaton.
 *
 * A SZOVEG KORALL SAJAT SZOVEGE (exchange/otletek-2026-11-04/v4-4-reef-inditas-sajat-szoveg.md), nem az Akil-utmutato
 * forditasa; a termeklista polip igazolt listaja (agents/polip/output/v44-indit-termekek-2026-11-11.md): csak olyan termek
 * all itt, aminek a bolti szovege maga nevezi meg a lepest vagy az inditast. Kategoria-szintu ajanlas szovegben all.
 *
 * A SZAKMAI ELLENORZES (EL) A KIKERULES FELTETELE, NEM A TESZT KIRAKATE: a lap noindex, menu- es lablec-link nelkul, es a
 * 6. lepes celertekei (KH, kalcium, magnezium) az ellenorzesre varnak. A nyitott jelolesek (EL, KITOLTENDO) nem kerulnek az
 * oldalra; a spec ezt meri.
 *
 * A TERMEKEK A BOLT SAJAT ADATABOL JONNEK (kezelo alapjan, ar es keszlet nelkul): amelyik kozben nem megveheto vagy eltunt,
 * kimarad, a szoveg igy is megall. A `sku` csak a visszakereshetoseg (a UNAS cikkszam = a Medusa valtozat cikkszama).
 */
export type ReefTermek = {
  /** a Medusa valtozat cikkszama (merve a teszt Medusan, 2026-11-14) */
  sku: string
  /** a bolti termek kezeloje (`/termek/{handle}`) */
  handle: string
}

export type ReefTermekCsoport = {
  /** a csoport cime, h3 */
  cim: string
  /** a bolti szoveg szo szerinti allitasa vagy a figyelmeztetes, a csoport elott */
  megjegyzes?: string
  termekek: readonly ReefTermek[]
}

export type ReefLepes = {
  szam: number
  cim: string
  /** cimkezett bekezdesek: [cimke, szoveg] */
  bekezdesek: readonly (readonly [string, string])[]
  /** kategoriak szoveges ajanlasa, konkret termek nelkul */
  kategoriak?: string
  csoportok?: readonly ReefTermekCsoport[]
  tovabblepes: string
}

export const REEF_CIM =
  "Indítsd el a korallos akváriumodat: hat lépés a száraz kőtől az első korallig"
export const REEF_ALCIM =
  "Egy tengeri akvárium indítása nem verseny. A türelem itt a legjobb eszköz."
export const REEF_BEVEZETO =
  "A tengeri akvárium akkor működik hosszú távon, ha előbb a víz és a biológiai szűrő érik meg, és csak utána jönnek az állatok. A legtöbb kezdő hiba abból jön, hogy az állatok túl korán kerülnek a medencébe. Ez az útmutató sorrendet ad, és minden lépés végén megmondja, mikor léphetsz tovább."
export const REEF_ZARSZO =
  "A korallos akvárium nem készül el, hanem érik. A legjobb eszköz továbbra is a türelem és a rendszeres mérés. Ha elakadtál, kérdezz a boltban."
export const REEF_TERMEK_MEGJEGYZES =
  "A bolti szövegek szerint; a hatás gyártói állítás, nem garancia."

export const REEF_LEPESEK: readonly ReefLepes[] = [
  {
    szam: 1,
    cim: "Eszközök és helyszín",
    bekezdesek: [
      [
        "Mi kell",
        "Medence a szekrénnyel, lehabzó (skimmer), áramoltatók, fűtő (és szükség esetén hűtő), világítás, RO/DI víz (ozmózis víz), utántöltő (ATO), refraktométer, tesztek (NH3/NH4, NO2, NO3, PO4, KH, Ca, Mg), tengeri só.",
      ],
      [
        "Tipp",
        "Ne vegyél túl sok eszközt, és ne az újdonságot, hanem a bevált típust válaszd. Minden eszköz egy újabb hibaforrás.",
      ],
    ],
    kategoriak:
      "Kategóriák a kínálatunkban: Lehabzók, Áramoltatók, Fűtés/Hűtés, Világítástechnika (LED), RO-vízlágyítás (ozmózis készülékek), Vízutántöltő (ATO), Refraktométerek, Tesztek és mérés (a Víztesztek és a TDS, pH mérők alkategóriák). A kiválasztás a medence méretétől és a tervezett állatoktól függ, ebben a bolt tanácsa segít.",
    csoportok: [
      {
        cim: "TDS mérő az RO/DI víz ellenőrzéséhez",
        megjegyzes:
          "A D-D bolti leírása szerint „a fordított ozmózissal tisztított víz TDS értéke 0 és 10 között van”.",
        termekek: [
          { sku: "5060078021142", handle: "d-d-tds-meter" },
          { sku: "8023222196186", handle: "amtra-tds-ec-digitalis-tds-mero" },
          { sku: "150147", handle: "dm1-dual-tds-meter" },
        ],
      },
      {
        cim: "Sótartalom mérése",
        termekek: [
          { sku: "HI98319", handle: "hanna-hi98319-sotartalom-mero" },
          {
            sku: "4260119451711",
            handle:
              "fauna-marin-salinity-reference-100ml-sosurusegmero-kalibralo-folyadek",
          },
        ],
      },
    ],
    tovabblepes:
      "Minden eszköz működik, az RO/DI víz TDS értéke 0, a refraktométer kalibrálva van.",
  },
  {
    szam: 2,
    cim: "Kő, homok, víz",
    bekezdesek: [
      [
        "Mit csinálsz",
        "Építsd fel a dekorációt (száraz kő vagy kezelt élő kő), tedd be a homokot, keverd meg a sós vizet a célsótartalomra (kb. 35 PSU, 1,025-1,026 SG), és állítsd be a hőmérsékletet (kb. 25-26 °C). Járasd az áramoltatókat és a fűtőt.",
      ],
      [
        "Miért",
        "A száraz kő nem hoz be kártevőt, az élő kő biológiai gazdagságot ad, de kártevőt is hozhat. Mindkettőnek van helye, de tudatosan válassz.",
      ],
    ],
    csoportok: [
      {
        cim: "Tengeri só",
        megjegyzes: "A bolti szövegek az új akvárium indítását említik.",
        termekek: [
          {
            sku: "5902026739269",
            handle: "aquaforest-reef-salt-tengeri-so-2kg",
          },
          {
            sku: "5902026730150",
            handle: "aquaforest-reef-salt-tengeri-so-22kg-vodor",
          },
          {
            sku: "tropicmarin10kg",
            handle: "tropic-marin-pro-reef-tengeri-so-10-kg-vodros",
          },
          {
            sku: "tropicmarin25",
            handle: "tropic-marin-pro-reef-tengeri-so-25-kg-vodor",
          },
          {
            sku: "faunamarinsea10",
            handle:
              "fauna-marin-sea10-concentrat-2x10l-plusz-2x1l-tengerviz-koncentratum-ajandek-icp",
          },
        ],
      },
      {
        cim: "Aljzat",
        megjegyzes:
          "Az Aquaforest Bio Sand bolti szövege szerint baktériummal dúsított: „gyorsabb nitrogénciklus, biztonságosabb indulás”.",
        termekek: [
          {
            sku: "AFO-10108062",
            handle:
              "aquaforest-bio-sand-1-2mm-bakteriummal-dusitott-aljzat-10kg-dobozban",
          },
        ],
      },
      {
        cim: "Kő szirtépítéshez",
        megjegyzes: "A bolti szövegek a szirtépítést nevezik meg.",
        termekek: [
          {
            sku: "arka_reefrock",
            handle: "arka-aquatics-my-reef-rocks-mesterseges-szarazko-kg",
          },
          {
            sku: "marcorockuts",
            handle:
              "marco-rock-cuts-ko-akvariumi-szirtepiteshez-lapos-talpu-elem-kg",
          },
          {
            sku: "marcorockshelf",
            handle:
              "marco-rock-shelf-natural-rock-ko-akvariumi-szirthez-lapos-polcos-elem-kg",
          },
          {
            sku: "marcorock_natural",
            handle: "marcorock-foundation-mesterseges-szarazko-kg",
          },
          {
            sku: "szarazkokg",
            handle: "acropora-szarazko-elokobol-akvariumi-szirtepiteshez-kg",
          },
        ],
      },
    ],
    tovabblepes: "A sótartalom és a hőmérséklet 2-3 napig stabil.",
  },
  {
    szam: 3,
    cim: "Ciklusozás (a biológiai szűrő felépítése)",
    bekezdesek: [
      [
        "Mit csinálsz",
        "Adj a vízhez ammóniaforrást (erre készült ammóniaoldatot, vagy kevés eleséget, amelyet hagysz elbomlani), és mérd az ammóniát, a nitritet és a nitrátot. A ciklus során az ammónia először emelkedik, majd nitritté, végül nitráttá alakul.",
      ],
      [
        "Miért",
        "A baktériumok a felületeken (kő, homok) telepednek meg, és az állatok hulladékát ezek bontják le. Ha nincs kész, az ammónia megöli az állatokat.",
      ],
      ["Mennyi ideig", "Általában 4-6 hétig, de a mérés dönt, nem a naptár."],
    ],
    csoportok: [
      {
        cim: "Ammóniaforrás",
        megjegyzes:
          "A Modern Reef AmmoMix bolti szövege szerint „a hal nélküli biológiai szűrés elindítására szolgál új, száraz kövekkel rendelkező akváriumokban”.",
        termekek: [
          {
            sku: "9770208379581",
            handle: "modern-reef-ammomix-100ml-ammonium-chloride",
          },
        ],
      },
      {
        cim: "Indító baktériumok",
        megjegyzes: "A bolti szövegek az új akvárium indítását említik.",
        termekek: [
          { sku: "5902026731256", handle: "aquaforest-bio-s-10ml" },
          {
            sku: "22150",
            handle: "modern-reef-biobac-100ml-bakterium-kultura",
          },
          {
            sku: "9780701379698",
            handle:
              "modern-reef-biodiversity-500ml-bakteriumkultura-a-biologiai-egyensuly",
          },
          {
            sku: "9780701379674",
            handle:
              "modern-reef-biodiversity-1000ml-bakteriumkultura-a-biologiai-egyensuly",
          },
          {
            sku: "4260119453401",
            handle: "fauna-marin-bacto-reef-balls-bakteriumkultura-100ml",
          },
        ],
      },
      {
        cim: "Ammónia- és nitrit-teszt",
        termekek: [
          { sku: "8715897259234", handle: "colombo-ammonia-test-nh3" },
          {
            sku: "HI764",
            handle: "hanna-hi764-kolorimeter-nitrit-alacsony-tartomany",
          },
        ],
      },
    ],
    tovabblepes:
      "Az ammónia és a nitrit nem mérhető, a nitrát mérhető. Egy ellenőrző ammónia-adaggal is tesztelheted: 24 órán belül nullára kell esnie.",
  },
  {
    szam: 4,
    cim: "A medence érése és a „csúnya” szakaszok",
    bekezdesek: [
      [
        "Mit várj",
        "Barna kovaalga, esetleg zöld alga, később cianobaktérium. Ez az érés normális része.",
      ],
      [
        "Mit csinálj",
        "Tartsd az áramlást erősen, ne hagyd nullára esni a nitrátot és a foszfátot, és ne siess.",
      ],
    ],
    tovabblepes: "A kovaalga-szakasz lecsengett, és a mérések stabilak.",
  },
  {
    szam: 5,
    cim: "Az első állatok",
    bekezdesek: [
      [
        "Mit csinálsz",
        "Lassan, kevés állattal kezdj. Először takarítócsapat (csigák, remeterákok), utána kevés, szívós hal. Minden új állat között várj, és mérd az ammóniát és a nitritet.",
      ],
      [
        "Miért",
        "A biológiai szűrő a terheléshez nő hozzá. A gyorsan betett sok állat túlterheli.",
      ],
      [
        "Fontos",
        "Minden új állatot karanténozz, mielőtt a fő medencébe kerül. Nézd meg a Tartási adatok blokkot (nehézség, minimális medence, kompatibilitás).",
      ],
    ],
    tovabblepes:
      "Az ammónia és a nitrit végig nulla maradt, és az állatok jól vannak.",
  },
  {
    szam: 6,
    cim: "A korallok",
    bekezdesek: [
      [
        "Mit csinálsz",
        "Lágykorallokkal és LPS korallokkal kezdd, az SPS-t hagyd a medence érettebb szakaszára. Új korallt nézz át nagyító alatt kártevőkre, fürdesd meg, és tedd karanténba, mielőtt a medencébe kerül. Csak a korall menjen be, a talp vagy a kő, amin érkezett, ne.",
      ],
      [
        "Miért",
        "A kártevők (laposféreg, csupaszkopoltyús csiga, Aiptasia) a korallal együtt érkeznek. A karantén az egyetlen hatékony védelem.",
      ],
      [
        "Víz",
        "KH kb. 7-9 dKH, kalcium kb. 380-450 mg/l, magnézium kb. 1250-1350 mg/l, a nitrát és a foszfát alacsony, de nem nulla.",
      ],
    ],
    kategoriak:
      "Nyomelemadagolók: kategória a kínálatunkban (Nyomelemadagolók, tartozékok: Grotech, Reef Factory, Aqua Medic). A kiválasztás a medence méretétől és a tervezett adagolási módszertől függ, ebben a bolt tanácsa segít.",
    csoportok: [
      {
        cim: "Korallfürdő",
        megjegyzes:
          "A bolti szövegek az új korall fürdetését vagy beszoktatását nevezik meg. A fürdetés nem helyettesíti a karantént.",
        termekek: [
          { sku: "5902026735322", handle: "aquaforest-protect-dip-50ml" },
          {
            sku: "894991001814",
            handle: "coral-protec-coral-dip-1ml-shot-korallfurdeto-szer",
          },
          {
            sku: "9794901579789dip",
            handle:
              "modern-reef-c-dip-1-es-2-professzionalis-ketlepcsos-korallfurdeto",
          },
          {
            sku: "0696859301858",
            handle: "polyplab-reef-primer-45g-korallfurdeto-4literhez",
          },
          {
            sku: "0696859301872",
            handle: "polyplab-reef-primer-180g-korallfurdeto-16literhez",
          },
        ],
      },
    ],
    tovabblepes: "A korallok kinyílnak, a színük stabil, a mérések stabilak.",
  },
]

/** Minden hivatkozott bolti kezelo, egyszer, a lapnak egyetlen lekeresre. */
export function reefKezelok(): string[] {
  return Array.from(
    new Set(
      REEF_LEPESEK.flatMap((lepes) =>
        (lepes.csoportok ?? []).flatMap((csoport) =>
          csoport.termekek.map((termek) => termek.handle),
        ),
      ),
    ),
  )
}

type ReefLekertTermek = {
  handle?: unknown
  title?: unknown
  variants?:
    | {
        manage_inventory?: boolean | null
        allow_backorder?: boolean | null
        inventory_quantity?: number | null
      }[]
    | null
}

/**
 * A lapra kerulo termekek: kezelo -> bolti cim, CSAK a megveheto termekekre (legalabb egy valtozata kaphato). Amelyik
 * nincs a valaszban, vagy nem megveheto, kimarad, es a szoveg igy is megall. A kaphatosag szabalya ugyanaz, mint a
 * termeklapon (`valtozatKaphato`): nem kezelt keszlet, utanrendelheto, vagy van keszlet.
 */
export function kaphatoReefTermekek(
  termekek: readonly ReefLekertTermek[] | null | undefined,
): Record<string, string> {
  const kaphato = (v: NonNullable<ReefLekertTermek["variants"]>[number]) =>
    !v.manage_inventory ||
    !!v.allow_backorder ||
    (v.inventory_quantity ?? 0) > 0
  return Object.fromEntries(
    (termekek ?? []).flatMap((t) =>
      typeof t.handle === "string" &&
      typeof t.title === "string" &&
      t.title.trim() &&
      (t.variants ?? []).some(kaphato)
        ? [[t.handle, t.title.trim()] as const]
        : [],
    ),
  )
}
