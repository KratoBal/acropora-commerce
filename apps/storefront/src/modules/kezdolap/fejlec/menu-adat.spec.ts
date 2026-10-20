import { describe, expect, it } from "vitest"

import { szovegek } from "../szovegek"
import {
  MAX_OSZLOP,
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
    expect(handleLista("a,b,c,d,e,f,g,h")).toHaveLength(6)
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
    ).toHaveLength(6)
    expect(MAX_OSZLOP).toBe(8)
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

  it("kategória nélküli boltban csak a linkes pont marad, nem találunk ki menüt", () => {
    expect(menuPontok(szovegek(null), [], NEVEK).map((p) => p.felirat)).toEqual(
      ["Szolgáltatások"],
    )
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
