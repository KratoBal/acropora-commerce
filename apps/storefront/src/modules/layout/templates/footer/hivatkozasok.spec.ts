import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

import {
  CEG,
  OSZLOP_SORREND,
  REGI_BOLT_HIVATKOZASOK,
  SAJAT_HIVATKOZASOK,
} from "./hivatkozasok"

/** A megjegyzeseket kiszedi, hogy egy MAGYARAZO szoveg ne szamitson hasznalatnak. */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

/**
 * A LABLEC HIVATKOZASAI.
 *
 * A forras a mai elo bolt (shop.acropora.hu) lableca, TIZENHAROM tetellel,
 * harom oszlopban. A szamok itt BEEGETVE allnak, es ez szandekos: nem a lista
 * hossza a mellekes koruelmeny, hanem MAGA AZ ALLITAS. Ha egy tetel eltunik
 * vagy jon egy uj, azt eszre kell venni, nem elnyelni egy "legalabb ennyi"
 * kuszobbel.
 *
 * AMIT NEM MER: hogy a het kulso cim BETOLT-e. Az halozati kerdes, es a lapok
 * ugyis meg fognak szunni, amikor sajat lapokat kapnak.
 */
describe("a lábléc hivatkozásai", () => {
  it("hat tetelnek van sajat utvonala, es mind relativ", () => {
    expect(SAJAT_HIVATKOZASOK).toHaveLength(6)

    for (const h of SAJAT_HIVATKOZASOK) {
      expect(h.cim.startsWith("/")).toBe(true)
    }
  })

  it("het tetel a regi boltba visz, mind teljes cimmel", () => {
    expect(REGI_BOLT_HIVATKOZASOK).toHaveLength(7)

    for (const h of REGI_BOLT_HIVATKOZASOK) {
      expect(h.cim.startsWith("https://shop.acropora.hu/")).toBe(true)
    }
  })

  it("a tizenharom felirat mind kulonbozik", () => {
    const cimkek = [...SAJAT_HIVATKOZASOK, ...REGI_BOLT_HIVATKOZASOK].map(
      (h) => h.cimke,
    )

    expect(cimkek).toHaveLength(13)
    expect(new Set(cimkek).size).toBe(13)
  })

  /**
   * AZ OSZLOPOK MEGOSZLASA A BOLTE, ES EZ NEM DISZITES: a "Kosár" a vasarloi
   * fiok mellett all, nem az oldalterkepen. Ha a besorolas elcsuszik, a lablec
   * MUKODNI fog, csak mast fog mondani -- pont az a fajta elteres, ami nem
   * hibazik es nem hasal el.
   */
  it("az oszlopok megoszlása a bolt lábléceét követi", () => {
    const mind = [...SAJAT_HIVATKOZASOK, ...REGI_BOLT_HIVATKOZASOK]
    const db = (o: string) => mind.filter((h) => h.oszlop === o).length

    expect(db("oldalterkep")).toBe(2)
    expect(db("fiok")).toBe(5)
    expect(db("informaciok")).toBe(6)
    expect(OSZLOP_SORREND).toHaveLength(3)
  })
})

describe("a cég adatai a lábléc negyedik oszlopában", () => {
  /**
   * A TUDATOS ELTERES A FORRASTOL. A boltban "Nyitvatarás" all, egy hianyzo
   * `t` betuvel. Itt javitva, es ez allitas, nem veletlen: ha valaki egyszer
   * "hussegbol" visszairja a bolti alakot, ez pirosodik.
   *
   * A FELIRAT A LABLEC JSX-EBEN ALL, NEM EBBEN A LISTABAN -- es ezt a mellette
   * allo pozitiv kontroll mondta meg. Eloszor a `hivatkozasok.ts` fajlra
   * kerdeztem ra, es a hiany-allitas zold lett... csak epp ott a szo SOHA nem
   * is allhatott volna. Egy hianyt mero allitast egy URES VILAG is kielegit:
   * a kontroll nelkul ez egy orokre zold, halott allitas maradt volna.
   */
  it("a nyitvatartás szó helyesen áll, nem a bolt elgépelésével", () => {
    const forras = kodSzoveg(
      readFileSync(join(__dirname, "index.tsx"), "utf-8"),
    )

    expect(forras).not.toContain("Nyitvatarás")
  })

  /**
   * ISMERT POZITIV KONTROLL a fenti hiany-allitas melle: ugyanaz a kereses,
   * ugyanabban a fajlban, megtalalja a HELYES alakot.
   */
  it("a helyes alak viszont ott van, ugyanazzal a kereséssel", () => {
    const forras = kodSzoveg(
      readFileSync(join(__dirname, "index.tsx"), "utf-8"),
    )

    expect(forras).toContain("Nyitvatartás")
  })

  it("a négy adat mind ki van töltve", () => {
    expect(CEG.nev).toBe("Acropora Kft.")
    expect(CEG.cim).toContain("Pesti Gábor utca 35")
    expect(CEG.telefon).toBe("+36-20/267-6801")
    expect(CEG.email).toBe("webshop@acropora.hu")
    expect(CEG.nyitvatartas).toHaveLength(3)
  })
})

/**
 * A FELTETEL, AMIT ACROBOT KERT: A HET KULSO CIM EGY HELYEN ALL.
 *
 * Nem stilus-keres. Amikor a lapok elkeszulnek, EGY helyen kell atirni oket --
 * ha het helyen allnanak, hat atirodna, es a hetediket senki nem venne eszre.
 *
 * Ezert az allitas nem az, hogy "van egy lista", hanem hogy a lablec SAJAT
 * fajlja EGYETLEN bolti cimet sem tartalmaz. A `kodSzoveg` kiszedi a
 * megjegyzeseket, tehat az a bekezdes, amelyik ezt a szabalyt INDOKOLJA, nem
 * dontii el hamisan a sajat allitasat.
 */
/**
 * AZ OSZLOPCIMEK NAGYBETUSEK -- ES EZ AZ EGYETLEN ALLITAS, AMIT A HTML-BOL NEM
 * LEHETETT VOLNA MEGIRNI.
 *
 * A lablec mintaja az elo bolt, es a szerkezetet meg a tartalmat a bolt
 * HTML-jebol fejtettem ki. Ott a cimek VEGYES kisbetusek. A kepernyokepen
 * viszont nagybetuvel allnak: a bolt stiluslapja alakitja at oket.
 *
 * Ket kiolvasas ugyanarrol a forrasrol, ket kulonbozo valasz -- es a kerdes
 * dontotte el, melyik a helyes: a vevo azt latja, amit a kep mutat.
 */
describe("a lábléc oszlopcímei", () => {
  const lablec = kodSzoveg(readFileSync(join(__dirname, "index.tsx"), "utf-8"))

  /** ISMERT POZITIV KONTROLL: a fajlt beolvastuk, es ez a lablec. */
  it("a forrás olvasható, és tényleg a lábléc", () => {
    expect(lablec).toContain("export default async function Footer")
  })

  /**
   * NEGY CIM, NEGY `uppercase`: a harom hivatkozas-oszlop egy ismetlodo
   * elembol jon, a ceg-oszlop kulon all -- tehat a forrasban KETTO szerepel.
   * A szamot azert allitjuk, mert egy hianyzo `uppercase` a negyedik oszlopon
   * nem hibazna, csak masként nezne ki.
   */
  it("a címek nagybetűvel állnak, mind a négy oszlopban", () => {
    expect(lablec.match(/uppercase tracking-wide/g)).toHaveLength(2)
  })
})

describe("a külső címek egyetlen helyen állnak", () => {
  const lablec = kodSzoveg(readFileSync(join(__dirname, "index.tsx"), "utf-8"))
  const lista = kodSzoveg(
    readFileSync(join(__dirname, "hivatkozasok.ts"), "utf-8"),
  )

  /** ISMERT POZITIV KONTROLL: a ket fajlt tenyleg beolvastuk, es ezek azok. */
  it("mindkét fájl olvasható, és tényleg a lábléc kettőse", () => {
    expect(lablec).toContain("export default async function Footer")
    expect(lista).toContain("REGI_BOLT_HIVATKOZASOK")
  })

  it("a lábléc JSX-ében EGYETLEN bolti cím sem áll", () => {
    expect(lablec.match(/shop\.acropora\.hu/g)).toBeNull()
  })

  it("a hét cím mind a listában áll", () => {
    expect(lista.match(/https:\/\/shop\.acropora\.hu\//g)).toHaveLength(7)
  })
})

/**
 * A LABLEC SIKJA -- TOKEN, NEM BEEGETETT ERTEK.
 *
 * acrobot kikotese (2026-09-08): "ne egesz szamokat egessunk bele", hogy egy
 * kesobbi valtoztatas ADAT legyen, ne ATIRAS. Ez a ket allitas ezt orzi.
 *
 * A MASODIK A FONTOSABB, es a `kodSzoveg` miatt tud egyaltalan letezni: a
 * komponens MEGJEGYZESE idezi a tervbeli `oklch(0.17 0.016 250)` erteket, mert
 * a dontes indokat rogziti. Egy fajl-szintu tagadas ettol pirosodna, holott a
 * KOD helyes -- ugyanaz az alak, mint amikor egy javito szoveg idezi a regit.
 *
 * AMIT NEM MER: hogy a lablec SOTET-e. Nem is merheti: a `--terv-hatter`
 * vilagonkent mas erteket vesz fel, es hogy melyiket, azt a lablec FOLOTT allo
 * `data-vilag` donti el -- ma egy sincs. Ez az allitas azt orzi, hogy a szin a
 * VILAGTOL fuggjon, nem azt, hogy melyik vilagban allunk.
 */
describe("a lábléc síkja", () => {
  const kod = kodSzoveg(readFileSync(join(__dirname, "index.tsx"), "utf-8"))

  /** ISMERT POZITIV KONTROLL: tenyleg a lablecet olvastuk be. */
  it("a forrás olvasható, és tényleg a lábléc", () => {
    expect(kod).toContain("<footer")
    expect(kod).toContain("lablec-sik")
  })

  it("a sík a világfüggő háttér-tokenen áll", () => {
    expect(kod).toContain('background: "var(--terv-hatter)"')
  })

  it("egyetlen oklch érték sincs beégetve a kódba", () => {
    expect(kod).not.toContain("oklch(")
  })
})

/**
 * A KATEGORIA-RACS A GYOKEREK SZAMARA VAN HUZALOZVA.
 *
 * acrobot kikotese (2026-09-08): "ne egesz szamokat egessunk bele", hogy egy
 * kesobbi valtozas (a ket rejtett gyoker sorsa a 73038a32 kartyan all) ADAT
 * legyen, ne ATIRAS.
 *
 * A TAGADO ALLITAS A LENYEG: egy `lg:grid-cols-4` ugyanugy MUKODNE ma, es
 * pontosan akkor romlana el, amikor senki nem nezne oda -- amikor a gyokerek
 * szama valtozik. A pozitiv allitas onmagaban ezt nem zarja ki.
 *
 * A `kodSzoveg` itt nem kenyelem: a komponens megjegyzese SZO SZERINT leirja,
 * hogy miert nem rogzitett negy. Fajl-szinten merve a tagadas a sajat
 * magyarazatunkon bukna el.
 */
describe("a lábléc kategória-rácsa", () => {
  const kod = kodSzoveg(readFileSync(join(__dirname, "index.tsx"), "utf-8"))

  /** ISMERT POZITIV KONTROLL: tenyleg a lablecet olvastuk, es all benne a racs. */
  it("a forrás olvasható, és a rács benne van", () => {
    expect(kod).toContain("lablec-kategoria-racs")
  })

  it("az oszlopszám a gyökerek számából jön", () => {
    expect(kod).toContain("repeat(var(--lablec-oszlopok)")
    expect(kod).toContain('"--lablec-oszlopok": gyokerOszlopok.length')
  })

  /**
   * A TAGADAST A KATEGORIA-RACS SZAKASZARA MERJUK, NEM A FAJLRA.
   *
   * Elso alakja a teljes fajlra ment, es JOGGAL bukott el: a lablecben all egy
   * MASIK racs is (az info-oszlopoke), `lg:grid-cols-6` ertekkel. Az nem resze
   * ennek a munkanak (a kartya kifejezetten kimondja), es rogzitett
   * oszlopszama ott helyes -- azok az oszlopok nem adatbol jonnek.
   *
   * Egy fajl-szintu tagadas tehat egy HELYES sort tiltana meg. A hatokort a
   * szakasz nyito tagja adja.
   */
  const racsSzakasz = kod.slice(
    kod.indexOf("<section"),
    kod.indexOf("lablec-kategoria-racs"),
  )

  it("nincs rögzített oszlopszám a törésponton", () => {
    expect(racsSzakasz).toContain("grid")
    expect(racsSzakasz).not.toMatch(/lg:grid-cols-\d/)
  })

  it("a töréspont alatt két oszlop áll, nem egy", () => {
    expect(kod).toContain("grid-cols-2")
  })

  /**
   * A GYOKEREK A SZURT HALMAZBOL JONNEK, NEM KEZI LISTABOL. Egy beegetett
   * nevsor ugyanugy negy oszlopot adna ma, es ugyanugy nemán avulna el.
   *
   * A HIVAS ALAKJARA MERUNK, NEM A NEVRE -- es ezt a kalibracio kenyszeritette
   * ki. Az elso alak `toContain("listNonEmptyRootCategories")` volt, es amikor
   * a hivast kezi nevsorra csereltem, ZOLD MARADT: az IMPORT sor is tartalmazza
   * a nevet. Az allitas tehat pont az ellen a regresszio ellen volt halott,
   * amiert megirtam.
   */
  it("a gyökerek a szűrt halmazból jönnek", () => {
    expect(kod).toMatch(/await listNonEmptyRootCategories\(/)
  })

  /**
   * ES A SORREND A KOZOS LISTABOL JON, NEM a `rank` mezobol.
   *
   * A HIVAS ALAKJARA merunk, nem a nevre -- ugyanabbol az okbol, mint fentebb:
   * az `import` sor is tartalmazza a nevet, tehat egy `toContain` akkor is
   * zold maradna, ha a hivast kivennenk. A megjegyzeseket a `kodSzoveg` mar
   * kiszedte, tehat ez a MAGYARAZO szovegre sem illeszkedik.
   */
  it("a sorrend a közös listából jön", () => {
    expect(kod).toMatch(/sorrendbeRakva\(/)
  })
})
