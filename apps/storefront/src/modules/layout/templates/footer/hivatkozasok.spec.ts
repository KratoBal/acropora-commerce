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

  /**
   * A SZOVEGSZINEK IS TOKENBOL JONNEK -- ES A HATTER NELKULUK ROSSZABB LENNE.
   *
   * Merve a kitelepitett SOTET lapon (2026-09-09), MIELOTT a lablec vilagfuggo
   * lett volna: a lablec szovegszinei rgb(0,0,0) 12 helyen, rgb(82,82,91) 22
   * helyen, rgb(113,113,122) 2 helyen alltak. Egyik sem tokenbol jott.
   *
   * Vagyis ha CSAK a hatteret tettuk volna sotette, fekete szoveg allna sotet
   * feluleten -- rosszabb allapot, mint a mai vilagos lablec. A ket valtozas
   * ezert egy korben ment.
   *
   * A KERESES CSALADRA MER, NEM A TIZENHAROM KONKRET OSZTALYRA: egy uj
   * `text-ui-fg-interactive` ugyanugy rogzitett szin lenne, es egy nevsorolo
   * allitas azt atengedne.
   *
   * ES EGY ELGEPELES IS KIDERULT KOZBEN: harom oszlopcim `txt-ui-fg-base`
   * osztalyt viselt (`txt-` az `text-` helyett), ami nem letezik -- azok a
   * cimek szin nelkul alltak, feketet orokolve. A minta ezert a `txt-ui-` alakot
   * is nezi.
   */
  const ROGZITETT_SZIN =
    /\b(?:text|txt|bg|border)-ui-|\btext-(?:zinc|gray|neutral|slate)-\d|\btext-(?:black|white)\b/

  it("a lábléc szövegszínei tokenből jönnek, nem rögzített osztályból", () => {
    expect(kod).not.toMatch(ROGZITETT_SZIN)
  })

  /**
   * ISMERT POZITIV KONTROLL A FENTI MINTAHOZ. Egy tagado allitast egy URES
   * VILAG is kielegit: ha a regex elromlik, a sor akkor is zold, ha a lablec
   * tele van rogzitett szinnel.
   *
   * === EZ A KONTROLL EGY MASIK FAJLRA MUTATOTT, ES ELAVULT ===
   *
   * Elso alakja a `product-preview/index.tsx` fajlt olvasta be, azzal az
   * indokkal, hogy "tudjuk, hogy vannak benne" rogzitett szinek. 2026-09-10-en
   * abbol a fajlbol kikerultek a nyers Medusa osztalyok (a kartya cime es ara
   * a terv tokenjeire allt at), es ez a kontroll PIROSRA valtott -- holott sem
   * a lablec, sem a minta nem valtozott.
   *
   * A hiba nem a javitase volt, hanem a kontrolle: egy MASIK fajl esetleges
   * tartalmara tamaszkodott, es epp azt a tartalmat dolgozunk azon, hogy
   * eltuntessuk. Amig ilyen alakban all, minden token-atallas ujra elsuti.
   *
   * A mai alak SAJAT mintakon mer, minden aganra kulon, es a tagado peldakkal
   * egyutt azt is megmondja, hogy a minta nem talal MINDENT. Amit ezzel
   * elvesztunk: nem bizonyitja, hogy valodi kodon is elsul -- azt viszont a
   * lablec sajat beolvasasa (`a forrás olvasható`) mar allitja.
   *
   * === KALIBRACIO (2026-09-10) ===
   *
   *   a minta mindent elkap (`/text/`)      3 piros, koztuk MINDKET kontroll
   *   a minta semmit nem talal              1 piros: a rogzitett-peldak kontroll
   *
   * A ket irany kulon sul el, tehat a ket kontroll nem ugyanazt meri.
   */
  it("ugyanez a minta megtalálja a rögzített színt ott, ahol van", () => {
    const ROGZITETT_PELDAK = [
      "text-ui-fg-subtle",
      "txt-ui-fg-base",
      "bg-ui-bg-base",
      "border-ui-border-base",
      "text-zinc-500",
      "text-gray-400",
      "text-neutral-700",
      "text-slate-900",
      "text-black",
      "text-white",
    ]

    for (const pelda of ROGZITETT_PELDAK) {
      expect(pelda).toMatch(ROGZITETT_SZIN)
    }
  })

  /**
   * ES A MASIK IRANY: a minta NEM talal el mindent. E nelkul egy elszabadult
   * regex (peldaul `/text-/`) is kielegitene a fenti kontrollt, es kozben a
   * lablec minden token-alapu osztalyat rogzitett szinnek mondana.
   */
  it("a minta a terv tokenjeit és a méret-osztályokat békén hagyja", () => {
    const TOKEN_PELDAK = [
      "text-[var(--terv-szoveg)]",
      "border-[var(--terv-keret)]",
      "text-sm font-medium",
      "bg-[var(--terv-hatter)]",
    ]

    for (const pelda of TOKEN_PELDAK) {
      expect(pelda).not.toMatch(ROGZITETT_SZIN)
    }
  })
})

/**
 * A KATEGORIA-RACS KIKERULT A LABLECBOL, ES A HELYERE TAGADAS JON.
 *
 * ITT KORABBAN OT ALLITAS ALLT arrol, hogy a racs benne van, hogy az
 * oszlopszama a gyokerek szamabol jon, es hogy nincs beegetett oszlopszam.
 * Mind az ot HELYES volt, es mind az ot TARGYTALAN lett: Balazs dontese
 * (2026-09-09) az, hogy a racs teljesen eltunik.
 *
 * NEM TOROLTEM OKET NYOMTALANUL. Egy torolt allitas helyen ures hely marad, es
 * az ures hely nem orzo: ha valaki visszaepiti a racsot, semmi nem szolna. A
 * helyukre az kerul, hogy a racs NINCS ott -- ugyanazokra a jelekre merve,
 * amiket a regi allitasok kerestek.
 *
 * ES EGY POZITIV KONTROLL IS KELL MELLE, kulonben a tagadas akkor is teljesulne,
 * ha a fajlt egyaltalan nem olvastuk be, vagy ha ures.
 */
describe("a lábléc kategória-rácsa kikerült", () => {
  const kod = kodSzoveg(readFileSync(join(__dirname, "index.tsx"), "utf-8"))

  /** ISMERT POZITIV KONTROLL: tenyleg a lablecet olvastuk. */
  it("a forrás olvasható, és tényleg a lábléc", () => {
    expect(kod).toContain("lablec-sik")
  })

  it("nincs kategória-rács a láblécben", () => {
    expect(kod).not.toContain("lablec-kategoria-racs")
    expect(kod).not.toContain("--lablec-oszlopok")
  })

  /**
   * A HAROM HIVAS IS ELTUNT, ES EZ KULON ALLITAS: a racs kirajzolasa nelkul is
   * ottmaradhatna a lekerdezes, es akkor minden lapbetoltes fizetne erte
   * ugy, hogy senki nem hasznalja.
   */
  it("a lábléc nem kérdezi le a kategóriákat és a régiót", () => {
    expect(kod).not.toMatch(/listNonEmptyRootCategories\(/)
    expect(kod).not.toMatch(/listCategories\(/)
    expect(kod).not.toMatch(/getRegion\(/)
  })

  /**
   * ES AMI MEGMARADT: a MASIK racs (az info-oszlopoke) a helyen van. Enelkul a
   * fenti tagadasok akkor is zoldek lennenek, ha valaki az egesz lablecet
   * kiuritette volna.
   */
  it("az info-oszlopok rácsa a helyén maradt", () => {
    expect(kod).toContain("lg:grid-cols-6")
  })
})
