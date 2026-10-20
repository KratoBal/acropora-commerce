import { describe, expect, it } from "vitest"

import { szovegek } from "../szovegek"
import {
  MAX_OSZLOP,
  feloldatlanKategoriak,
  kategoriaKeres,
  MAX_OSZLOP_LINK,
  handleLista,
  menuOszlopok,
  menuPontok,
  type MenuKategoria,
} from "./menu-adat"

/**
 * A DESIGN LENYILO MENUJENEK ADATA A VALODI KATEGORIAKBOL.
 *
 * MI PIROSIT: ha a terv kitalalt oszlopa vagy linkje megjelenik (a menu csak a
 * bolt kategoriafajabol epul); ha egy hianyzo vagy ures gyoker oszlopot ad; ha a
 * lapos fa (Elollat: Halak, Korallok, Gerinctelenek) nem a gyokerekbol, a mely
 * fa (Technika > Vilagitas > LED) nem a gyerekekbol epit oszlopot; ha a linkek
 * nem a valodi handle-re mutatnak; ha egy handle nelkuli kategoria linket kap;
 * ha egy felirat nelkuli vagy hova sem vezeto pont megjelenik; ha a kartya
 * hivatkozasa felirat vagy cel nelkul megjelenik.
 */
const kat = (
  handle: string,
  name: string,
  children: MenuKategoria[] = [],
): MenuKategoria => ({
  id: `pcat_${handle}`,
  name,
  handle,
  category_children: children,
})

const FA: MenuKategoria[] = [
  kat("halak", "Halak", [
    kat("bohochalak", "Bohóchalak"),
    kat("doktorhalak", "Doktorhalak"),
  ]),
  kat("korallok", "Korallok", [
    kat("sps", "SPS korallok"),
    kat("lps", "LPS korallok"),
  ]),
  kat("gerinctelenek", "Gerinctelenek", [kat("garnelak", "Garnélák")]),
  kat("technika", "Technika", [
    kat("vilagitas", "Világítás", [
      kat("led", "LED-lámpák"),
      kat("tartok", "Tartók"),
    ]),
    kat("aramoltatok", "Áramoltatók", [kat("szivattyuk", "Szivattyúk")]),
  ]),
  kat("vizkezeles", "Vízkezelés"),
]
const NEVEK = new Map<string, string>()

describe("handleLista", () => {
  it("vesszővel vagy szóközzel tagol, a veszélyes alakot eldobja, legfeljebb hat", () => {
    expect(handleLista("halak, korallok  gerinctelenek")).toEqual([
      "halak",
      "korallok",
      "gerinctelenek",
    ])
    expect(handleLista("a/b, ../x, <b>, a%2Fb, b-c, ok")).toEqual(["b-c", "ok"])
    expect(handleLista("a,b,c,d,e,f,g,h,i,j")).toHaveLength(8)
    expect(handleLista("")).toEqual([])
  })
})

describe("menuOszlopok", () => {
  it("lapos fa: több gyökér, az oszlopok maguk a gyökerek, a linkek a gyerekeik", () => {
    const o = menuOszlopok(FA, NEVEK, ["halak", "korallok", "gerinctelenek"])
    expect(o.map((c) => c.cim)).toEqual(["Halak", "Korallok", "Gerinctelenek"])
    expect(o[1]?.href).toBe("/categories/korallok")
    expect(o[1]?.linkek).toEqual([
      { nev: "SPS korallok", href: "/categories/sps" },
      { nev: "LPS korallok", href: "/categories/lps" },
    ])
  })

  it("mély fa: egy gyökér, az oszlopok a gyerekek, a linkek az unokák", () => {
    const o = menuOszlopok(FA, NEVEK, ["technika"])
    expect(o.map((c) => c.cim)).toEqual(["Világítás", "Áramoltatók"])
    expect(o[0]?.linkek.map((l) => l.nev)).toEqual(["LED-lámpák", "Tartók"])
    expect(o[0]?.href).toBe("/categories/vilagitas")
  })

  it("egy gyökér lapos gyerekekkel: egy oszlop, a gyerekek a linkek", () => {
    const o = menuOszlopok(FA, NEVEK, ["korallok"])
    expect(o).toHaveLength(1)
    expect(o[0]?.cim).toBe("Korallok")
    expect(o[0]?.linkek).toHaveLength(2)
  })

  it("a handle ékezet- és kisbetű-független, ami nincs, kimarad, a terv kitalált pontja nem jön létre", () => {
    expect(menuOszlopok(FA, NEVEK, ["Vízkezelés"]).map((c) => c.cim)).toEqual([
      "Vízkezelés",
    ])
    expect(menuOszlopok(FA, NEVEK, ["nincs-ilyen"])).toEqual([])
    expect(
      menuOszlopok(FA, NEVEK, ["halak", "nincs-ilyen"]).map((c) => c.cim),
    ).toEqual(["Halak"])
    expect(menuOszlopok([], NEVEK, ["halak"])).toEqual([])
  })

  it("a megjelenített név a névtérkép szerint, a handle nélküli kategória nem kap linket, a határok érvényesek", () => {
    const nevek = new Map([["pcat_sps", "SPS"]])
    expect(menuOszlopok(FA, nevek, ["korallok"])[0]?.linkek[0]?.nev).toBe("SPS")
    const handleNelkul: MenuKategoria[] = [
      kat("x", "X", [
        { id: "a", name: "Nincs handle", handle: null },
        kat("ok", "Rendben"),
      ]),
    ]
    expect(
      menuOszlopok(handleNelkul, NEVEK, ["x"])[0]?.linkek.map((l) => l.nev),
    ).toEqual(["Rendben"])
    const sok = [
      kat(
        "g",
        "G",
        Array.from({ length: 20 }, (_, i) => kat(`k${i}`, `K${i}`)),
      ),
    ]
    expect(menuOszlopok(sok, NEVEK, ["g"])[0]?.linkek).toHaveLength(
      MAX_OSZLOP_LINK,
    )
    const sokGyoker = Array.from({ length: 12 }, (_, i) =>
      kat(`r${i}`, `R${i}`, [kat(`c${i}`, `C${i}`)]),
    )
    expect(
      menuOszlopok(
        sokGyoker,
        NEVEK,
        handleLista(sokGyoker.map((g) => g.handle).join(",")),
      ),
    ).toHaveLength(8)
    expect(MAX_OSZLOP).toBe(5)
  })
})

describe("menuPontok", () => {
  it("az alapértékekkel: az Élőállat, a Technika és a Vegyszer lenyílik, a Szolgáltatások link, a Boltunk (nincs cím) kimarad", () => {
    const pontok = menuPontok(szovegek(null), FA, NEVEK)
    expect(pontok.map((p) => p.felirat)).toEqual([
      "Élőállat",
      "Technika",
      "Vegyszer és fogyóanyag",
      "Szolgáltatások",
    ])
    expect(pontok[0]?.oszlopok.map((c) => c.cim)).toEqual([
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
    expect(pontok[3]?.href).toBe("/hamarosan/szolgaltatasok")
    expect(pontok[3]?.oszlopok).toEqual([])
  })

  it("kategória nélküli boltban nincs kitalált oszlop: a pont a teljes katalógusra mutat, nem tűnik el csendben", () => {
    const pontok = menuPontok(szovegek(null), [], NEVEK)
    expect(pontok.map((p) => p.felirat)).toEqual([
      "Élőállat",
      "Technika",
      "Vegyszer és fogyóanyag",
      "Szolgáltatások",
    ])
    expect(
      pontok
        .slice(0, 3)
        .every((p) => p.oszlopok.length === 0 && p.href === "/store"),
    ).toBe(true)
    expect(pontok[3]?.href).toBe("/hamarosan/szolgaltatasok")
  })

  it("a felirat nélküli pont kimarad, a szerkesztett felirat és kategória érvényesül", () => {
    const s = szovegek({
      "fejlec.1.felirat": "",
      "fejlec.2.felirat": "Gépek",
      "fejlec.2.kategoriak": "technika",
    })
    const pontok = menuPontok(s, FA, NEVEK)
    expect(pontok.map((p) => p.felirat)).toContain("Gépek")
    expect(pontok.map((p) => p.felirat)).not.toContain("Élőállat")
  })

  it("a kártya hivatkozása csak felirattal és céllal áll, a kezdő policy-szöveg minta, az OS saját értékénél már nem", () => {
    const alap = menuPontok(szovegek(null), FA, NEVEK)
    expect(alap[0]?.kartya?.cim).toBe("Jó tudni")
    expect(alap[0]?.kartya?.minta).toBe(true)
    expect(alap[0]?.kartya?.href).toBeNull()
    const sajat = menuPontok(
      szovegek({
        "fejlec.1.kartya.szoveg": "Saját mondat.",
        "fejlec.1.kartya.felirat": "Átvétel →",
        "fejlec.1.kartya.link": "/store",
      }),
      FA,
      NEVEK,
    )
    expect(sajat[0]?.kartya?.minta).toBe(false)
    expect(sajat[0]?.kartya?.href).toBe("/store")
    const celNelkul = menuPontok(
      szovegek({ "fejlec.1.kartya.felirat": "Felirat cél nélkül" }),
      FA,
      NEVEK,
    )
    expect(celNelkul[0]?.kartya?.href).toBeNull()
    expect(celNelkul[0]?.kartya?.felirat).toBe("")
  })
})

/*
  A STAGE VALODI FAJA (acrobot, 2026-10-20, a 219 kategoria): NINCS "technika"
  es nincs "vegyszer" kategoria: a Design "Technika" foopontja a Termekek tobb
  gyerekenek csoportja, es a handle-ek ekezetesek, vesszosek, zarojelesek
  ("vilagitastechnika-(lampak)---termekek", "tesztek,-meres,-vezerles---termekek",
  "futes/hutes---termekek"). A menu kifejezese a handle ELEJE.
*/
describe("a menü a valódi stage-fán", () => {
  // A STAGE VALODI FAJA (exchange/stage-kategoriak-2026-10-20.json): a gyoker a
  // "termékek", alatta a valodi, ekezetes, vesszos handle-ek ("Technika" gyoker nincs)
  const STAGE: MenuKategoria[] = [
    kat("termékek", "Termékek", [
      kat("eledelek---termékek", "Eledelek - Termékek", [
        kat("koralltápok---eledelek", "Koralltápok - Eledelek"),
        kat("haleledelek---eledelek", "Haleledelek - Eledelek"),
      ]),
      kat(
        "aminosavak-és-vitaminok---termékek",
        "Aminosavak és vitaminok - Termékek",
        [
          kat(
            "aquaforest---aminosavak-és-vitaminok",
            "Aquaforest - Aminosavak és vitaminok",
          ),
          kat(
            "red-sea---aminosavak-és-vitaminok",
            "Red Sea - Aminosavak és vitaminok",
          ),
        ],
      ),
      kat(
        "akvárium-építési-eszközök---termékek",
        "Akvárium építési eszközök - Termékek",
        [
          kat(
            "kő-szirtépítéshez-(mesterséges,-szárazkő)---akvárium-építési-eszközök",
            "Kő szirtépítéshez (mesterséges, szárazkő) - Akvárium építési eszközök",
          ),
          kat(
            "aljzat---akvárium-építési-eszközök",
            "Aljzat - Akvárium építési eszközök",
          ),
        ],
      ),
      kat(
        "akváriumkarbantartás,-eszközök---termékek",
        "Akváriumkarbantartás, eszközök - Termékek",
        [
          kat(
            "etetés---akváriumkarbantartás,-eszközök",
            "Etetés - Akváriumkarbantartás, eszközök",
          ),
          kat(
            "algakaparó---akváriumkarbantartás,-eszközök",
            "Algakaparó - Akváriumkarbantartás, eszközök",
          ),
        ],
      ),
      kat(
        "szűrők,-szűrőzsákok,-papírszűrők---termékek",
        "Szűrők, szűrőzsákok, papírszűrők - Termékek",
        [
          kat(
            "előszűrők,-papírszűrők---szűrők,-szűrőzsákok,-papírszűrők",
            "Előszűrők, papírszűrők - Szűrők, szűrőzsákok, papírszűrők",
          ),
          kat(
            "szűrőanyagok---szűrők,-szűrőzsákok,-papírszűrők",
            "Szűrőanyagok - Szűrők, szűrőzsákok, papírszűrők",
          ),
        ],
      ),
      kat(
        "világítástechnika-(lámpák)---termékek",
        "Világítástechnika (Lámpák) - Termékek",
        [
          kat(
            "led-világítások---világítástechnika-(lámpák)",
            "LED világítások - Világítástechnika (Lámpák)",
          ),
          kat(
            "t5-fénycsövek---világítástechnika-(lámpák)",
            "T5 fénycsövek - Világítástechnika (Lámpák)",
          ),
        ],
      ),
      kat("áramoltatók---termékek", "Áramoltatók - Termékek", [
        kat("aqua-light---áramoltatók", "AquaLight - Áramoltatók"),
        kat(
          "aqua-illumination---áramoltatók",
          "Aqua Illumination - Áramoltatók",
        ),
      ]),
      kat("vízkezelés---termékek", "Vízkezelés - Termékek", [
        kat("szűrőanyagok---vízkezelés", "Szűrőanyagok - Vízkezelés"),
        kat("foszfátmegkötők---vízkezelés", "Foszfátmegkötők - Vízkezelés"),
      ]),
      kat(
        "tesztek,-mérés,-vezérlés---termékek",
        "Tesztek, mérés, vezérlés - Termékek",
        [
          kat(
            "víztesztek---tesztek,-mérés,-vezérlés",
            "Víztesztek - Tesztek, mérés, vezérlés",
          ),
          kat(
            "refraktométerek,-sósűrűségmérők---tesztek,-mérés,-vezérlés",
            "Refraktométerek, sósűrűségmérők - Tesztek, mérés, vezérlés",
          ),
        ],
      ),
      kat("lehabzók---termékek", "Lehabzók - Termékek", [
        kat("atb---lehabzók", "ATB - Lehabzók"),
        kat("nyos---lehabzók", "Nyos - Lehabzók"),
      ]),
      kat("problémamegoldás---termékek", "Problémamegoldás - Termékek", [
        kat("gyógyszerek---problémamegoldás", "Gyógyszerek - Problémamegoldás"),
        kat(
          "parazita-írtók,-fürdetők---problémamegoldás",
          "Parazita írtók, fürdetők - Problémamegoldás",
        ),
      ]),
      kat("nyomelemek---termékek", "Nyomelemek - Termékek", [
        kat("coral-essential---nyomelemek", "Coral Essential - Nyomelemek"),
        kat("triton---nyomelemek", "Triton - Nyomelemek"),
      ]),
      kat("ro-vízlágyítás---termékek", "RO-vízlágyítás - Termékek", [
        kat("autoaqua---ro-vízlágyítás", "Autoaqua - RO-vízlágyítás"),
        kat(
          "előszűrők,-kiegészítők---ro-vízlágyítás",
          "Előszűrők, kiegészítők - RO-vízlágyítás",
        ),
      ]),
      kat("tengeri-só---termékek", "Tengeri só - Termékek", [
        kat("aquaforest---tengeri-só", "Aquaforest - Tengeri só"),
        kat("red-sea---tengeri-só", "Red Sea - Tengeri só"),
      ]),
      kat("fűtés/hűtés---termékek", "Fűtés/Hűtés - Termékek"),
      kat(
        "nyomelemadagolók,-tartozékok---termékek",
        "Nyomelemadagolók, tartozékok - Termékek",
        [
          kat(
            "grotech---nyomelemadagolók,-tartozékok",
            "Grotech - Nyomelemadagolók, tartozékok",
          ),
          kat(
            "reef-factory---nyomelemadagolók,-tartozékok",
            "Reef Factory - Nyomelemadagolók, tartozékok",
          ),
        ],
      ),
      kat("bi-orb---termékek", "biOrb - Termékek", [
        kat(
          "bi-orb-akváriumok/terráriumok---bi-orb",
          "biOrb akváriumok/terráriumok - biOrb",
        ),
        kat(
          "bi-orb-kiegészítők,-dekorációk---bi-orb",
          "biOrb kiegészítők, dekorációk - biOrb",
        ),
      ]),
      kat("akvárium-szettek---termékek", "Akvárium szettek - Termékek"),
      kat("légpumpák---termékek", "Légpumpák - Termékek"),
      kat("szivattyúk---termékek", "Szivattyúk - Termékek", [
        kat(
          "felnyomó-szivattyúk---szivattyúk",
          "Felnyomó szivattyúk - Szivattyúk",
        ),
        kat(
          "lehabzó-szivattyúk---szivattyúk",
          "Lehabzó szivattyúk - Szivattyúk",
        ),
      ]),
      kat("vízutántöltő---termékek", "Vízutántöltő - Termékek"),
      kat("ajándéktárgyak---termékek", "Ajándéktárgyak - Termékek"),
      kat(
        "használt-termékek-outlet-áron!---termékek",
        "Használt termékek OUTLET áron! - Termékek",
      ),
    ]),
    kat("halak", "Halak", [kat("bohóchalak", "Bohóchalak")]),
    kat("gerinctelenek", "Gerinctelenek", [kat("garnélák", "Garnélák")]),
    kat("korallok", "Korallok", [
      kat("wysiwyg---korallok", "WYSIWYG - Korallok", [
        kat("sps---wysiwyg", "SPS - WYSIWYG"),
      ]),
    ]),
  ]
  const nevek = new Map<string, string>()

  const TECHNIKA = [
    "vilagitastechnika",
    "aramoltatok",
    "szivattyuk",
    "lehabzok",
    "szurok",
    "futes",
    "tesztek",
    "ro-vizlagyitas",
  ]

  it("a Technika nyolc kifejezése a Termékek nyolc valódi gyerekét találja, mindegyiket másikat", () => {
    const talalt = TECHNIKA.map((h) => kategoriaKeres(STAGE, nevek, h)?.name)
    expect(talalt).toEqual([
      "Világítástechnika (Lámpák) - Termékek",
      "Áramoltatók - Termékek",
      "Szivattyúk - Termékek",
      "Lehabzók - Termékek",
      "Szűrők, szűrőzsákok, papírszűrők - Termékek",
      "Fűtés/Hűtés - Termékek",
      "Tesztek, mérés, vezérlés - Termékek",
      "RO-vízlágyítás - Termékek",
    ])
  })

  it("a kifejezés a handle ELEJE, utána nem betű és nem szám: a nyomelemek nem találja a nyomelemadagolókat", () => {
    expect(kategoriaKeres(STAGE, nevek, "nyomelemek")?.name).toBe(
      "Nyomelemek - Termékek",
    )
    expect(kategoriaKeres(STAGE, nevek, "nyomelem")).toBeUndefined()
    expect(kategoriaKeres(STAGE, nevek, "technika")).toBeUndefined()
  })

  it("az alapértékekkel a Technika öt oszlopot és az Összes linket kapja, a Vegyszer is, az Élőállat három oszlopot", () => {
    const pontok = menuPontok(szovegek(null), STAGE, nevek)
    expect(pontok.map((p) => p.felirat)).toEqual([
      "Élőállat",
      "Technika",
      "Vegyszer és fogyóanyag",
      "Szolgáltatások",
    ])
    const [elo, technika, vegyszer] = pontok
    expect(elo?.oszlopok.map((c) => c.cim)).toEqual([
      "Halak",
      "Korallok",
      "Gerinctelenek",
    ])
    expect(elo?.osszes).toBeNull()
    expect(technika?.oszlopok).toHaveLength(MAX_OSZLOP)
    expect(technika?.oszlopok[0]?.cim).toContain("Világítástechnika")
    expect(technika?.oszlopok[0]?.href).toBe(
      "/categories/vil%C3%A1g%C3%ADt%C3%A1stechnika-(l%C3%A1mp%C3%A1k)---term%C3%A9kek",
    )
    expect(technika?.osszes).toEqual({
      nev: "Összes kategória →",
      href: "/store",
    })
    expect(vegyszer?.oszlopok).toHaveLength(MAX_OSZLOP)
    expect(vegyszer?.oszlopok[0]?.cim).toContain("Vízkezelés")
    expect(vegyszer?.osszes).not.toBeNull()
  })

  it("az Összes hivatkozás felirat vagy cél nélkül nem jelenik meg, és öt vagy kevesebb oszlopnál sosem", () => {
    const celNelkul = menuPontok(
      szovegek({ "fejlec.2.osszes.link": "" }),
      STAGE,
      nevek,
    )
    expect(celNelkul.find((p) => p.felirat === "Technika")?.osszes).toBeNull()
    const kevesebb = menuPontok(
      szovegek({ "fejlec.2.kategoriak": "aramoltatok,szivattyuk" }),
      STAGE,
      nevek,
    )
    expect(
      kevesebb.find((p) => p.felirat === "Technika")?.oszlopok,
    ).toHaveLength(2)
    expect(kevesebb.find((p) => p.felirat === "Technika")?.osszes).toBeNull()
  })

  it("az alapértékek mindegyik kifejezése megvan a stage fában, nincs feloldatlan", () => {
    expect(feloldatlanKategoriak(szovegek(null), STAGE, nevek)).toEqual([])
  })

  it("a nem talált kifejezés nevesített, és a főpont nem tűnik el", () => {
    const csonka = szovegek({ "fejlec.2.kategoriak": "elgepelt-handle" })
    expect(
      menuPontok(csonka, STAGE, nevek).find((p) => p.felirat === "Technika")
        ?.href,
    ).toBe("/store")
    expect(feloldatlanKategoriak(csonka, STAGE, nevek)).toContainEqual({
      pont: 2,
      handlek: ["elgepelt-handle"],
    })
  })

  it("a handle-előtag névtérkép nélkül is talál, és a név a handle nélkül is (egymástól függetlenül)", () => {
    const nevesitett: MenuKategoria[] = [kat("valami-mas", "Akvárium technika")]
    expect(
      kategoriaKeres(
        nevesitett,
        new Map([["pcat_valami-mas", "Technika"]]),
        "technika",
      )?.handle,
    ).toBe("valami-mas")
    expect(kategoriaKeres(nevesitett, new Map(), "technika")).toBeUndefined()
  })
})
