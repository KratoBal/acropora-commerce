import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LapVaz, {
  csoportokba,
  ELO_ALLAT_LAP_SZAKASZAI,
  MUSZAKI_LAP_SZAKASZAI,
} from "./index"

afterEach(cleanup)

/**
 * A VÁZ ÁLLÍTÁSAI. Amit itt mérünk, az nem a kinézet, hanem hogy MI HOL ÁLL --
 * és hogy egy üres doboz meg is mondja magáról, hogy üres.
 */
describe("a műszaki lap váza", () => {
  /**
   * A SORREND A TERVBŐL JÖN, és ez az az állítás, ami elbukik, ha valaki
   * átrendezi a lapot anélkül, hogy a tervhez mérné.
   */
  it("a tizennégy doboz a tervbeli sorrendben áll", () => {
    render(<LapVaz />)

    const kulcsok = Array.from(
      document.querySelectorAll("[data-vaz-szakasz]"),
    ).map((e) => e.getAttribute("data-vaz-szakasz"))

    expect(kulcsok).toEqual([
      "cimsor",
      "foto",
      "meretezes-seged",
      "fulek",
      "muszaki-adatok",
      "ar",
      "elerhetoseg",
      "valaszto",
      "mennyiseg",
      "csomagajanlat",
      "kerdezd",
      "kiegeszitok",
      "hasonlo",
      "ragados-sav",
    ])
  })

  /**
   * TARTALOM NÉLKÜL MINDEN DOBOZ ÜRESNEK VALLJA MAGÁT. Enélkül a váz úgy nézne
   * ki, mintha kész lenne -- és egy üres doboz, ami késznek látszik, rosszabb a
   * hiányzónál.
   */
  it("tartalom nélkül minden doboz üresnek jelöli magát", () => {
    render(<LapVaz />)

    const uresek = document.querySelectorAll('[data-vaz-ures="igen"]')
    expect(uresek).toHaveLength(MUSZAKI_LAP_SZAKASZAI.length)
  })

  /**
   * ÉS AZ ÜRES DOBOZ MEG IS MONDJA, MI JÖN IDE.
   *
   * Ezt az állítást a kalibráció hívta elő: kivettem a várakozó szöveg
   * megjelenítését, és a készlet ZÖLD MARADT. Az üres dobozok néma üres
   * dobozokká váltak volna, és a váz -- aminek épp az a dolga, hogy megmutassa,
   * hol lesznek a dolgok -- töröttnek látszott volna.
   *
   * A sorrend, az üresség jelölése és a "nincs kitalált adat" mind igaz maradt
   * eközben. Három állítás, és egyik sem vette észre, hogy a lényeg eltűnt.
   */
  /**
   * A KÉT VILÁG. A váltó nem ízlés és nem látogatói beállítás: a TERMÉK fajtája
   * dönti el (élő állat sötét, műszaki világos).
   *
   * Az alapértelmezés a VILÁGOS, és ez sem véletlen: a katalógus 1884+ terméke
   * műszaki, az élő állat a kisebbik halmaz. Ha a hívó elfelejti megadni, a
   * gyakoribb esetet kapja.
   */
  /**
   * AZ OSZLOP-BESOROLÁS A TERVBŐL JÖN, mérve: bal 856 px, köz 44, jobb 452, és
   * a három szám összege pontosan a tartalom-oszlop 1352 pixele.
   *
   * Ez az állítás azt védi, hogy a besorolás ne csússzon el észrevétlenül: egy
   * doboz, ami rossz oszlopba kerül, a lapon látszik, de semmi nem szól róla.
   */
  it("a dobozok a tervbeli oszlopukban állnak", () => {
    render(<LapVaz />)

    const oszlopa = (kulcs: string) =>
      document
        .querySelector(`[data-vaz-szakasz="${kulcs}"]`)
        ?.parentElement?.getAttribute("data-vaz-oszlop")

    // teljes szélesség
    for (const k of ["cimsor", "kiegeszitok", "hasonlo", "ragados-sav"]) {
      expect(oszlopa(k)).toBe("teljes")
    }
    // bal: a termék megismerése
    for (const k of ["foto", "meretezes-seged", "fulek", "muszaki-adatok"]) {
      expect(oszlopa(k)).toBe("bal")
    }
    // jobb: a vásárlás
    for (const k of [
      "ar",
      "elerhetoseg",
      "valaszto",
      "mennyiseg",
      "csomagajanlat",
      "kerdezd",
    ]) {
      expect(oszlopa(k)).toBe("jobb")
    }
  })

  /**
   * ÉS MINDEN DOBOZNAK VAN OSZLOPA. E nélkül egy új szakasz besorolás nélkül
   * kerülhetne be, és csendben a rácsban kötne ki valahol.
   */
  /**
   * ÉS A RÁCS MAGA IS KI VAN TÉVE.
   *
   * Ezt a kalibráció hívta elő: kivettem a `lg:grid` osztályokat -- vagyis
   * asztali nézetben a két oszlop MEGSZŰNT --, és a készlet zöld maradt. Az
   * állításaim az ADATOT nézték (`data-vaz-oszlop`), nem azt, hogy a rács
   * egyáltalán ki van-e téve.
   *
   * ÉS AMIT EZ AZ ÁLLÍTÁS NEM BIZONYÍT, KIMONDVA: a jsdom nem számol
   * elrendezést, tehát azt NEM tudja megmondani, hogy a doboz tényleg a bal
   * oldalon áll-e 856 pixel szélesen. Csak azt, hogy az osztályok ott vannak.
   * A tényleges elrendezést böngészőben kell megnézni -- a mérőeszköz és a terv
   * geometriája az `agents/nautilus/measurement/terv-geometria/` alatt áll.
   */
  /**
   * A RACS MOSTANTOL A KETOSZLOPOS FUTAMON ALL, NEM A KULSO TAROLON.
   *
   * Balazs kerese (2026-09-09): a jobb panel csusszon fel a kep melle. Az ok
   * szerkezeti volt: egy lapos racsban minden `bal` szakasz megelozte az
   * OSSZES `jobb`-ot, es a CSS automatikus elhelyezes nem toltekezik
   * visszafele -- a jobb oszlop elso doboza a bal UTOLSO doboza ala kerult
   * (merve: 238 kontra 1243 pixel, harom szelessegen azonosan).
   *
   * A megoldas ket kulon oszlop-halom egy kozos racsban. Az allitas ezert a
   * `vaz-ket-oszlop` elemre mer -- ugyanaz a ket ertek (fix 452-es sav, 44
   * pixeles koz), csak eggyel beljebb.
   */
  it("az asztali két oszlopos rács ki van téve", () => {
    render(<LapVaz />)

    const osztalyok = screen.getByTestId("vaz-ket-oszlop").className

    expect(osztalyok).toContain("lg:grid")
    /*
      A JOBB OSZLOP FIX SAV, NEM ARANY. Korabban `856fr_452fr` allt itt, es a
      kulonbseget egyetlen szelesseg nem mutatja meg: 1440 pixelen az aranyos
      osztas 440,953-at ad. Ket szelessegen viszont az arany AZONOS marad
      (1,894), ami fix savnal lehetetlen. (picasso merese, 2026-09-08.)
    */
    expect(osztalyok).toContain("minmax(0,1fr)_452px")
    expect(osztalyok).toContain("lg:gap-x-[44px]")
  })

  /**
   * A KET OSZLOP KET KULON HALOM, ES A BESOROLAS DONTI EL, MELYIKBE KERUL.
   *
   * Ez a ket allitas egyutt bizonyitja, hogy a szetvalasztas a `oszlop` mezo
   * szerint tortenik, nem veletlenul: a foto BALRA, az ar JOBBRA kerul.
   * Enelkul a ket halom letezhetne uresen vagy forditva is.
   */
  it("a fotó a bal halomba kerül, az ár a jobba", () => {
    render(<LapVaz />)

    const bal = screen.getByTestId("vaz-bal-halom")
    const jobb = screen.getByTestId("vaz-jobb-halom")

    expect(bal.querySelector('[data-vaz-szakasz="foto"]')).not.toBeNull()
    expect(jobb.querySelector('[data-vaz-szakasz="ar"]')).not.toBeNull()
    expect(jobb.querySelector('[data-vaz-szakasz="foto"]')).toBeNull()
  })

  /**
   * A JOBB HALOM TAPAD, ES A TAPADAS FELTETELE KET OSZTALY, NEM EGY.
   *
   * Balazs kerese: "a jobb oldali resz tapadjon addig amig nem jon a kovetkezo
   * modul". A `sticky` onmagaban NEM eleg: ha a racs-cella nyujtozik (az
   * alapertelmezett `stretch`), a tapado elem magassaga kitolti a cellat, es
   * nincs mihez kepest elmozdulnia. Ezert kell a futamra `lg:items-start`.
   *
   * A tapadas VEGE nem kulon szabaly: a jobb halom a ketoszlopos futamon belul
   * all, tehat ott er veget, ahol a futam -- vagyis a kovetkezo teljes
   * szelessegu modulnal. Ez a szerkezet kovetkezmenye, nem egy beallitott ertek.
   *
   * AMIT EZ NEM MER: hogy a bongeszo tenyleg tapaszt-e. A jsdom nem szamol
   * elrendezest -- ez a ket osztaly MEGLETET meri.
   */
  it("a jobb halom tapad, és a futam nem nyújtja ki a cellát", () => {
    render(<LapVaz />)

    expect(screen.getByTestId("vaz-jobb-halom").className).toContain(
      "lg:sticky",
    )
    expect(screen.getByTestId("vaz-ket-oszlop").className).toContain(
      "lg:items-start",
    )
  })

  it("egyetlen szakasz sem marad besorolás nélkül", () => {
    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      expect(["teljes", "bal", "jobb"]).toContain(szakasz.oszlop)
    }
  })

  it("alapértelmezésben világos", () => {
    render(<LapVaz />)

    const vaz = screen.getByTestId("muszaki-lap-vaz")
    expect(vaz.getAttribute("data-vilag")).toBe("vilagos")
  })

  it("sötét világot kérve a váz azt jelöli", () => {
    render(<LapVaz vilag="sotet" />)

    const vaz = screen.getByTestId("muszaki-lap-vaz")
    expect(vaz.getAttribute("data-vilag")).toBe("sotet")
  })

  /**
   * EGY VÁZ, KÉT ÉRTÉK-KÉSZLET -- ÉS AZ ÁLLÍTÁS VISSZAKAPTA AZ EREDETI ALAKJÁT.
   *
   * Ez az állítás védi, ami az egészet összetartja: a két világ nem két külön
   * lap, csak két érték-készlet ugyanazon a vázon. Ha valaha valaki a sötét
   * ághoz más dobozokat vagy más sorrendet ad, ez pirosra vált.
   *
   * EGY KÖR ODA-VISSZA (2026-09-07): a #108-ban SZŰKÍTETTEM ezt az állítást
   * részhalmaz-alakra, mert acrobot két dobozt levetetett a sötét listáról. A
   * tervből vett mérés azt a döntést cáfolta -- a terv MINDKÉT dobozt
   * tartalmazza, csak mást kérdez --, ezért a dobozok visszakerültek, és ezzel
   * ez az állítás visszakapta az eredeti, ERŐSEBB alakját.
   *
   * A tanulság nem az, hogy fölösleges kör volt: az állítás mindkét irányban
   * elsült, és pontosan azt mutatta meg, hogy a szerkezet változik.
   */
  it("a sötét szerkezet a világos RÉSZHALMAZA, azonos sorrendben", () => {
    const kulcsok = (v: "vilagos" | "sotet") => {
      cleanup()
      render(<LapVaz vilag={v} />)
      return Array.from(document.querySelectorAll("[data-vaz-szakasz]")).map(
        (e) => e.getAttribute("data-vaz-szakasz"),
      )
    }

    const sotet = kulcsok("sotet")
    const vilagos = kulcsok("vilagos")

    // Nincs UJ doboz a sotet vilagon.
    for (const kulcs of sotet) {
      expect(vilagos).toContain(kulcs)
    }

    // ES A SORREND SEM VALTOZIK: a sotet lista a vilagos SZURT valtozata.
    expect(sotet).toEqual(vilagos.filter((k) => sotet.includes(k)))

    // Ismert pozitiv kontroll: tenyleg kaptunk dobozokat, nem ures listat.
    expect(sotet.length).toBeGreaterThanOrEqual(10)
  })

  it("az üres doboz kiírja, mi jön a helyére", () => {
    render(<LapVaz />)

    const varakozok = screen.getAllByTestId("vaz-varakozo")
    expect(varakozok).toHaveLength(MUSZAKI_LAP_SZAKASZAI.length)

    const szovegek = varakozok.map((e) => e.textContent)
    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      expect(szovegek).toContain(szakasz.varakozo)
    }
  })

  it("ahol van tartalom, ott azt mutatja, és nem a várakozó szöveget", () => {
    render(<LapVaz tartalom={{ ar: <span>289 900 Ft</span> }} />)

    const arDoboz = document.querySelector('[data-vaz-szakasz="ar"]')
    expect(arDoboz?.getAttribute("data-vaz-ures")).toBe("nem")
    expect(screen.getByText("289 900 Ft")).toBeTruthy()

    // a többi doboz változatlanul üres marad
    expect(document.querySelectorAll('[data-vaz-ures="igen"]')).toHaveLength(
      MUSZAKI_LAP_SZAKASZAI.length - 1,
    )
  })

  /**
   * A VÁRAKOZÓ SZÖVEG NEM ÁLLÍT SEMMIT A TERMÉKRŐL. A tervben minden szám
   * kitalált (289 900 Ft, PAR 380, 41 értékelés); ha ezek bekerülnének a vázba,
   * később valaki ténynek olvasná őket.
   *
   * Ez az állítás azt méri, hogy egyetlen szakasz várakozó szövege sem
   * tartalmaz számjegyet -- se árat, se mennyiséget, se mértékegységet.
   */
  it("egyetlen várakozó szöveg sem tartalmaz kitalált adatot", () => {
    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      expect(szakasz.varakozo).not.toMatch(/\d/)
    }
  })
})

/**
 * A VEVONEK SZANT SZOVEG MAGYARUL ALL -- ES EZ ORZO, NEM STILUS.
 *
 * 2026-09-07-ig mind a tizennegy dobozcim EKEZET NELKUL jelent meg az elo
 * lapon. Az ok nem dontes volt: mi egesz nap ekezet nelkul irunk egymasnak (a
 * csatorna-kapu es a parancssor miatt), es a szokas atlepett egy hatart. Epp
 * ezert kell orzo: a kovetkezo doboznal ugyanez a szokas ugyanigy hat.
 *
 * KET IRANYBOL MER, es a masodik a fontosabb:
 *
 *   1. a MAI cimek pontosan azok, aminek lenniuk kell   -- a visszacsuszast fogja meg
 *   2. EGYETLEN vevonek szant szoveg sem tartalmazhat    -- az UJ dobozokat is
 *      ekezet nelkuli magyar alakot                         vedi, amikrol ez a
 *                                                           fajl meg nem tud
 *
 * Az elso onmagaban csak azt orzi, ami MA all itt. A masodik az, ami holnap is
 * hat.
 */
describe("a vevonek szant szoveg magyarul all", () => {
  const VEVONEK: string[] = MUSZAKI_LAP_SZAKASZAI.flatMap((sz) => [
    sz.cim,
    sz.varakozo,
  ]).filter((x): x is string => Boolean(x))

  /** ISMERT POZITIV KONTROLL: van egyaltalan mit merni. */
  it("van vevőnek szánt szöveg, és mind a tizennégy doboz ad legalább egyet", () => {
    expect(VEVONEK.length).toBeGreaterThanOrEqual(MUSZAKI_LAP_SZAKASZAI.length)
  })

  it("a dobozcímek a helyes magyar alakjukban állnak", () => {
    const cimek = MUSZAKI_LAP_SZAKASZAI.map((sz) => sz.cim).filter(Boolean)

    expect(cimek).toEqual([
      "Méretezés-segéd",
      "Műszaki adatok",
      "Csomagajánlat",
      "Kérdezd minket",
      "Ami még kellhet hozzá",
      "Hasonló termékek",
    ])
  })

  /**
   * ES A TAGABB HALO. A lista SZANDEKOSAN a jellegzetes alakokat sorolja: olyan
   * betusorokat, amik magyar szovegben ekezet nelkul NEM helyesek, es amik nem
   * fordulnak elo veletlenul mas szoban. (Az "ar" vagy a "meg" ezert NINCS
   * benne: reszszokent barhol felbukkannak.)
   */
  const EKEZET_NELKULI_ALAKOK = [
    "Muszaki",
    "Leiras",
    "Ertekelesek",
    "Letoltesek",
    "Meretezes",
    "Hasonlo",
    "lampak",
    "Valtozat",
    "Mennyiseg",
    "Keszlet",
    "szallitas",
    "atvetel",
    "Csomagajanlat",
    "Kerdezd",
    "tartozekok",
    "Termekfoto",
    "termek",
    "fejlec",
    "muveletek",
    "aljan",
    "futo",
    "jonnek",
  ]

  it.each(EKEZET_NELKULI_ALAKOK)(
    "egyetlen vevőnek szánt szöveg sem tartalmazza: %s",
    (alak) => {
      const vetkezok = VEVONEK.filter((szoveg) => szoveg.includes(alak))

      expect(vetkezok).toEqual([])
    },
  )
})

/**
 * A HORGONY-AZONOSITOK. A ragados sav gombja `#vaz-mennyiseg` cimre ugrik, es
 * egy horgony CSENDBEN nem csinal semmit, ha nincs celpont: nem hibazik, csak
 * nem tortenik semmi. Ezert allitas all ra, nem a figyelem.
 */
describe("a dobozok horgonyozhatok", () => {
  it("minden doboz visel #vaz-<kulcs> azonosítót", () => {
    render(<LapVaz tartalom={{}} />)

    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      const doboz = document.getElementById(`vaz-${szakasz.kulcs}`)
      expect(doboz, `hiányzik: vaz-${szakasz.kulcs}`).not.toBeNull()
    }
  })

  /**
   * ES A CELPONT, AMIRE A SAV MUTAT, KULON ALLITAST KAP.
   *
   * A fenti allitas a KULCSOKBOL veszi a varhato halmazt, tehat ha valaki
   * atnevezi a `mennyiseg` kulcsot, VELE EGYUTT valtozik es zold marad --
   * onhivatkozo. A sav horgonya viszont egy KIIRT sztring a sablonban, ami nem
   * valtozna vele. Ez a sor mondja ki a nevet.
   */
  it("a vásárló oszlop horgonya pontosan #vaz-mennyiseg", () => {
    render(<LapVaz tartalom={{}} />)

    expect(document.getElementById("vaz-mennyiseg")).not.toBeNull()
  })
})

/**
 * AZ ÉLŐ ÁLLAT LAP FELIRATAI.
 *
 * A váz szerkezete a két világban AZONOS (arra külön állítás áll); ami eltér,
 * az a FELIRAT. Ez nem szépészet: a "Hasonló lámpák" doboz egy korall lapon
 * nem üresen állna, hanem TELE lenne, hamis felirat alatt. Egy üres doboz azt
 * mondja, hogy még nincs kész; egy rossz cím azt, hogy lámpát nézel.
 */
describe("az élő állat lap feliratai", () => {
  const cimek = (lista: typeof MUSZAKI_LAP_SZAKASZAI) =>
    lista.map((szakasz) => `${szakasz.cim} ${szakasz.varakozo}`).join(" | ")

  /**
   * ISMERT POZITÍV KONTROLL, ELÖL. A tagadó állítás önmagában akkor is zöld
   * lenne, ha a keresés soha nem talál semmit -- ezért előbb megmutatjuk, hogy
   * a VILÁGOS listában ugyanez a keresés MEGTALÁLJA a lámpás szavakat.
   */
  it("a világos lista tényleg műszaki-specifikus szavakat használ", () => {
    expect(cimek(MUSZAKI_LAP_SZAKASZAI)).toContain("Méretezés-segéd")
  })

  it("a sötét listában nincs műszaki-specifikus szó", () => {
    expect(cimek(ELO_ALLAT_LAP_SZAKASZAI)).not.toContain("Méretezés-segéd")
  })

  /**
   * A TERVBŐL MÉRT FELIRATOK, EGYENKÉNT MEGNEVEZVE -- ÉS MOST MÁR MIND.
   *
   * === MIÉRT NEM EGY OKOS, ÁLTALÁNOS SZABÁLY ÁLL ITT ===
   *
   * Írtam egyet: "ha egy feliratot a sötét világ felülír, a világos alak nem
   * jelenhet meg a sötét listában", a felülírtak halmazát a két lista
   * KÜLÖNBSÉGÉBŐL vezetve le. Elegánsnak látszott, és a kalibráció megölte.
   *
   * Ha valaki egy sötét feliratot VISSZAÍR a világos alakjára, a két érték
   * EGYENLŐ lesz -- tehát a szabály onnantól nem tekinti felülírtnak, és nem
   * tilt semmit. Mérve: két visszaírás, NULLA piros abból az állításból.
   * Pontosan arra volt vak, amiért megírtam.
   *
   * Egy visszacsúszást csak úgy lehet elkapni, ha a VÁRT ÉRTÉKET megnevezzük.
   * Ezért ez a lista, és ezért teljes: MINDEN felülírt mező szerepel benne, nem
   * csak a négy cím. A `foto` várakozó szövegének visszaírása korábban NULLA
   * pirosat adott -- semmi nem fedte.
   */
  it("a tervből mért feliratokat viseli", () => {
    const sotet = ELO_ALLAT_LAP_SZAKASZAI
    const doboz = (kulcs: string) =>
      sotet.find((szakasz) => szakasz.kulcs === kulcs)

    expect(doboz("hasonlo")?.cim).toBe("További WYSIWYG példányok")
    expect(doboz("meretezes-seged")?.cim).toBe("Elhelyezés-segéd")
    expect(doboz("kerdezd")?.cim).toBe("Kérdezd a boltot")
    expect(doboz("csomagajanlat")?.cim).toBe("Kötegajánlat")

    /**
     * ES AMI MAR NINCS: a `muszaki-adatok` doboz a sotet listarol lekerult,
     * tehat NINCS felirata. Ez az allitas MEGFORDITVA all itt, nem torolve:
     * ha valaki visszateszi a dobozt, ez pirosra valt, es akkor a feliratarol
     * is donteni kell -- a tervben ugyanis a 2a lapon nincs neki.
     */
    expect(doboz("muszaki-adatok")).toBeUndefined()

    // A varakozo szovegek is felul vannak irva, es eddig egyiket sem fedte semmi.
    expect(doboz("foto")?.varakozo).toBe("Saját fotó: ez a példány")
    /**
     * EZ AZ ERTEK MA VALTOZOTT (acrobot 15766), es a REGI a tervbeli LATHATO
     * CIM volt ("Hová tedd ezt a példányt?").
     *
     * Az indok nem az, hogy a regi hamis lett volna, hanem hogy VALODI
     * TARTALOMNAK latszott: egy vevo megprobalna hasznalni. A vilagos parja
     * ranezesre helykitolto, ez nem volt az.
     *
     * ES EGY MERES, AMIT ERDEMES TUDNI: amikor a komponenst atirtam es a
     * specet MEG NEM, EZ AZ ALLITAS PIROSODOTT KI. Vagyis a szoveg fedve volt
     * -- nem tudott volna csendben elmozdulni. A csere tehat nem "eszrevetlen
     * javitas", hanem egy nevesitett dontes, ami egy allitast is mozgatott.
     */
    expect(doboz("meretezes-seged")?.varakozo).toBe(
      "Ide jön az elhelyezés-segéd",
    )
    expect(doboz("csomagajanlat")?.varakozo).toBe("Ide jön a kötegajánlat")
    expect(doboz("hasonlo")?.varakozo).toBe(
      "Ide jönnek a további egyedi példányok",
    )
    expect(doboz("fulek")?.varakozo).toBe(
      "Gondozás, Leírás, Vízparaméterek, Élőállat-szállítás, Értékelések",
    )
  })

  /**
   * ÉS A SZERKEZET ADAT-SZINTEN IS AZONOS. A renderelt állítás ugyanezt méri a
   * DOM-on; ez itt a lista szintjén fogja meg, tehát egy elcsúszás akkor is
   * kiderül, ha a renderelés közben valami elnyeli.
   */
  it("a sötét lista a világos szűrt változata, azonos sorrendben", () => {
    const sotet = ELO_ALLAT_LAP_SZAKASZAI.map((sz) => sz.kulcs)
    const vilagos = MUSZAKI_LAP_SZAKASZAI.map((sz) => sz.kulcs)

    expect(sotet).toEqual(vilagos.filter((k) => sotet.includes(k)))
  })

  /**
   * ÉS AMIT ELHAGYUNK, AZ NÉVVEL ÁLL. Enélkül a részhalmaz-állítás egy EGYETLEN
   * dobozból álló sötét listát is elfogadna.
   */
  it("pontosan két doboz marad le, névvel", () => {
    const sotet = ELO_ALLAT_LAP_SZAKASZAI.map((sz) => sz.kulcs)
    const vilagos = MUSZAKI_LAP_SZAKASZAI.map((sz) => sz.kulcs)

    expect(vilagos.filter((k) => !sotet.includes(k))).toEqual([
      "muszaki-adatok",
      "kiegeszitok",
    ])
  })

  /** Az oszlop-besorolás sem csúszhat el a másolás során. */
  it("a megmaradt dobozok oszlop-besorolása változatlan", () => {
    for (const sotetSzakasz of ELO_ALLAT_LAP_SZAKASZAI) {
      const parja = MUSZAKI_LAP_SZAKASZAI.find(
        (sz) => sz.kulcs === sotetSzakasz.kulcs,
      )
      expect(sotetSzakasz.oszlop).toBe(parja?.oszlop)
    }
  })
})

/**
 * ÉS HOGY A VÁZ TÉNYLEG A VILÁGHOZ TARTOZÓ LISTÁT RAJZOLJA.
 *
 * EZT A KALIBRÁCIÓ HÍVTA ELŐ, ÉS A NULLA PIROS HÍVTA FEL RÁ A FIGYELMET: a
 * `szakaszokVilagra` váltót elrontottam (mindig a világos listát adta), és
 * MINDEN állítás zöld maradt -- mert a listákat közvetlenül néztem, a váltót
 * senki. Egy törött váltó mellett a korall lapon újra "Hasonló lámpák" állna,
 * és semmi nem szólt volna.
 *
 * A jóslatomban ez a lehetőség előre le volt írva, ezért nem "nincs baj"-nak
 * olvastam a nulla pirosat, hanem hiányzó állításnak.
 */
/**
 * A VARAKOZO SZOVEG A MASODLAGOS SZOVEG-TOKENEN ALL -- ES EZ A HARMADIK
 * FEDETLEN NODE.
 *
 * A token-fedettseg merese (2026-09-08) huszonharom style-node-ot talalt, amire
 * semmilyen allitas nem mutat. Ketto a `stock-state`-ben allt (azoknak
 * azonositot is kellett adni), ez a harmadik viszont MAR VISELT azonositot
 * (`vaz-varakozo`) -- csak nem allitott rola senki semmit.
 *
 * MIERT EPP EZ A TOKEN, ES MIERT NEM A BETU-LANC: az elso valtozatom a
 * betu-lancot allitotta, es KALIBRACIOVAL derult ki, hogy DISZLET -- a lancot
 * elveve NULLA allitas fordult pirosra. A `vaz-varakozo` elem nem visel
 * betu-lancot; azt a doboz CIME (`h2`) es a kulso kontener viseli. Az elso
 * allitasom tehat olyat mert, ami nincs ott.
 *
 * MIERT SZAMIT EZ AZ ALLITAS: a varakozo szoveg SZANDEKOSAN halvanyabb a
 * kesznel -- ez kulonbozteti meg a meg ures dobozt a tolttol. Ha a token
 * elcsuszik a fo szoveg-szintre, a doboz KESZNEK latszik, es epp azt veszitjuk
 * el, amit a szaggatott keret is jelol.
 */
describe("a váz várakozó szövege", () => {
  it("a várakozó szöveg a másodlagos szöveg-tokenen áll", () => {
    render(<LapVaz />)

    expect(screen.getAllByTestId("vaz-varakozo")[0]).toHaveStyle({
      color: "var(--terv-szoveg-halvany)",
    })
  })
})

describe("a váz a világhoz tartozó feliratokat rajzolja", () => {
  const feliratok = () =>
    Array.from(document.querySelectorAll("[data-vaz-szakasz]"))
      .map((e) => e.textContent ?? "")
      .join(" | ")

  /**
   * A WYSIWYG FELIRAT AZ ESETHEZ TARTOZIK, NEM A VILAGHOZ -- ES EZ HAROM
   * ALLITAS, MERT KETTO NEM ELEG.
   *
   * A ket vilag kozotti kulonbseget a harmadik allitas nelkul is latnank. Amit
   * CSAK a par mutat meg: hogy a sotet lapon a felirat a `unique_piece`
   * predikatumon mulik, nem a sotet listan.
   *
   * MERVE (acrobot, 2026-09-08 04:05, a stage Store API-jan, lapozva): a harom
   * elo allat gyoker alatt 161 lap all, es ebbol HAROM egyedi peldany -- tehat
   * 158 lapon a "tovabbi" szo valotlant allitott. A harmat ket egymastol
   * fuggetlen jel adja (`unique_piece` es a `wysiwyg---korallok` kategoria),
   * es ugyanazt a harmat.
   *
   * A korabbi 160 a REGI vilag-valto predikatumon allt; a kulonbseg az az egy
   * termek, amit a leveles kategoria-alak a rossz vilagba sorolt.
   */
  it("sötét világban, EGYEDI példánynál a WYSIWYG felirat áll", () => {
    render(<LapVaz vilag="sotet" egyediPeldany />)

    expect(feliratok()).toContain("További WYSIWYG példányok")
    expect(feliratok()).not.toContain("Hasonló termékek")
  })

  it("sötét világban, NEM egyedi példánynál a WYSIWYG felirat NEM áll", () => {
    render(<LapVaz vilag="sotet" />)

    expect(feliratok()).not.toContain("További WYSIWYG példányok")
    expect(feliratok()).not.toContain("további egyedi példányok")
    expect(feliratok()).toContain("Hasonló termékek")
  })

  /**
   * A FOTO VARAKOZOJA UGYANEZ AZ ALLITAS, MASIK DOBOZON (acrobot dontese,
   * msg 14947): a "Saját fotó: ez a példány" KIJELENTI, hogy a kep ezt a
   * darabot mutatja.
   *
   * MERVE, ES A LELET BELSO, NEM VEVOI: a sotet vilag 161 termeke kozul
   * NULLANAK nincs kepe (a bolt vegpontjan merve, mind az 1492 termeken; kep
   * nelkul osszesen negy termek all, mind a vilagos vilagban). A foto doboz
   * tehat elo sotet lapon SOHA nem ures, vagyis ez a mondat ma egyetlen vevoi
   * lapon sem jelenik meg -- csak vaz-allapotban. A javitas ettol ugyanugy
   * kell, de a kartyan a helyes allitas fog allni.
   */
  it("sötét világban, EGYEDI példánynál a saját fotó felirat áll", () => {
    render(<LapVaz vilag="sotet" egyediPeldany />)

    expect(feliratok()).toContain("Saját fotó: ez a példány")
    expect(feliratok()).not.toContain("Termékfotó")
  })

  it("sötét világban, NEM egyedi példánynál a saját fotó felirat NEM áll", () => {
    render(<LapVaz vilag="sotet" />)

    expect(feliratok()).not.toContain("Saját fotó: ez a példány")
    expect(feliratok()).toContain("Termékfotó")
  })

  /**
   * ES A TOBBI SOTET FELIRAT NEM MOZDUL VELUK. Enelkul egy olyan valtozat is
   * zold maradna, ami nem-egyedi peldanynal az EGESZ sotet listat eldobja --
   * es akkor a korall lapon ujra a muszaki feliratok allnanak.
   *
   * A NEVE 2026-09-08-IG "CSAK a hasonlo doboz feliratat" volt, es a foto
   * felteteles kotesevel HAMISSA valt: ma KET doboz mozdul. Nem a szamot
   * irtam at benne, hanem a mondatot -- egy allitas, aminek a neve mast mond,
   * mint amit mer, ugyanolyan makacs, mint egy elavult komment.
   */
  it("a nem egyedi példány CSAK a két állító feliratot mozdítja", () => {
    render(<LapVaz vilag="sotet" />)

    expect(feliratok()).toContain("Elhelyezés-segéd")
    expect(feliratok()).toContain("Kérdezd a boltot")
    expect(feliratok()).toContain("Kötegajánlat")
  })

  /** ISMERT POZITÍV KONTROLL: világos világban ugyanez a keresés a lámpást találja. */
  it("világos világban a műszaki felirat áll", () => {
    render(<LapVaz vilag="vilagos" />)

    expect(feliratok()).toContain("Hasonló termékek")
    expect(feliratok()).not.toContain("További WYSIWYG példányok")
  })
})

/**
 * A JOBB OSZLOP PANEL-SZERKEZETE, A TERVBOL MERVE (2026-09-08).
 *
 * === A MERES, ES MIERT NEM AZ VOLT, AMIT ATVETTEM ===
 *
 * Ugy kaptam tovabb, hogy a jobb oszlop "egyetlen dobozban tartja az arat, a
 * keszletet, az atvetel-valasztot, a Kosarba gombot es a Kotegajanlatot". A
 * tervlap jelolojen, pontos tag-parositassal visszamerve ez NEM egy doboz: a
 * jobb oszlopnak HAROM kozvetlen, keretes gyereke van.
 *
 *   1. ar + brutto/cikkszam + keszlet + szallitas + atvetel + Kosarba + DOA
 *   2. Kotegajanlat        -- KULON panel, nem az arral egyutt
 *   3. Kerdezd a boltot    -- KULON panel
 *
 * A mi vazunk ugyanezt HAT kulon keretes dobozkent rajzolta. A negy vasarlasi
 * szakasz mostantol egy kozos panelbe kerul, a masik ketto marad onalloan.
 *
 * === AMIT EZ MER, ES AMIT NEM ===
 *
 * A panelek SZAMAT es a szakaszok csoportositasat meri. NEM meri a festett
 * kepet: a jsdom nem oldja fel a CSS-valtozokat, es media-lekerdezest sem
 * ertekel.
 */
describe("a jobb oszlop panel-szerkezete", () => {
  const jobbPanelek = () =>
    Array.from(document.querySelectorAll('[data-vaz-oszlop="jobb"]'))

  /**
   * ISMERT POZITIV KONTROLL: a vaz tenyleg megrajzolodik, es all benne jobb
   * oszlop. Enelkul a lenti darabszam-allitas egy URES lapon is zold lenne.
   */
  it("a váz megrajzolódik, és van jobb oszlopa", () => {
    render(<LapVaz />)

    expect(jobbPanelek().length).toBeGreaterThan(0)
    expect(screen.getByTestId("muszaki-lap-vaz")).toBeTruthy()
  })

  it("a jobb oszlopban HÁROM panel áll, nem hat", () => {
    render(<LapVaz />)

    expect(jobbPanelek()).toHaveLength(3)
  })

  it("a közös panel a négy vásárlási szakaszt tartja, ebben a sorrendben", () => {
    render(<LapVaz />)

    const kozos = document.querySelector('[data-vaz-csoport="vasarlas"]')
    expect(kozos).toBeTruthy()

    const bent = Array.from(kozos!.querySelectorAll("[data-vaz-szakasz]")).map(
      (e) => e.getAttribute("data-vaz-szakasz"),
    )

    expect(bent).toEqual(["ar", "elerhetoseg", "valaszto", "mennyiseg"])
  })

  /**
   * A KOTEGAJANLAT ES A KERDEZD KULON PANEL, es ez nem reszletkerdes: eppen ez
   * az, amiben az atvett mondat tevedett.
   */
  it("a csomagajánlat és a kérdezd NEM a közös panelben áll", () => {
    render(<LapVaz />)

    const kozos = document.querySelector('[data-vaz-csoport="vasarlas"]')
    for (const kulcs of ["csomagajanlat", "kerdezd"]) {
      expect(kozos!.querySelector(`[data-vaz-szakasz="${kulcs}"]`)).toBeNull()
      expect(
        document.querySelector(`[data-vaz-szakasz="${kulcs}"]`),
      ).toBeTruthy()
    }
  })

  /**
   * A HORGONYOK TULELIK A CSOPORTOSITAST, es ez nem kozmetika: a ragados sav
   * gombja a `#vaz-mennyiseg` cimre ugrik. Ha a csoportositas elvinne a
   * szakaszt, a gomb egy nem letezo horgonyra mutatna -- es NEM hibazna, csak
   * nem csinalna semmit.
   */
  /**
   * A PANEL BELSO RITMUSA A TERVBOL JON, NEM KEREKITESBOL.
   *
   * A tervben a negy szakasz hatarain egyseges 18 pixel all (a 6, a 10 es a 16
   * a szakaszokon BELUL van, mas komponensek tulajdona). Korabban 16 allt itt,
   * kerekitve -- ket pixel, de a kulonbseg nem a merete, hanem hogy a 16
   * valasztas volt, a 18 meres.
   *
   * A jsdom nem oldja fel a CSS-valtozokat, de ez KONKRET ertek, tehat itt a
   * mert szam allithato, nem csak egy nev.
   */
  it("a közös panel belső térköze a tervbeli 18 pixel", () => {
    render(<LapVaz />)

    const kozos = document.querySelector(
      '[data-vaz-csoport="vasarlas"]',
    ) as HTMLElement

    expect(kozos.style.gap).toBe("18px")
  })

  it("minden vásárlási szakasz megtartja a saját horgonyát", () => {
    render(<LapVaz />)

    for (const kulcs of ["ar", "elerhetoseg", "valaszto", "mennyiseg"]) {
      expect(document.getElementById(`vaz-${kulcs}`)).toBeTruthy()
    }
  })
})

/**
 * A CSOPORTOSITO MAGA, TISZTA FUGGVENYKENT.
 *
 * A renderelt allitasok a MAI szakasz-listan allnak. Ezek a szabalyt merik,
 * fuggetlenul attol, mi all ma a listaban.
 */
/**
 * A TORESPONT KET OLDALA -- ES EGY KORLAT, AMIT KI KELL MONDANI.
 *
 * === A TORESPONT NEM A TERVBOL JON, MERT A TERVBEN NINCS ===
 *
 * A feltoltott tervlap EGYETLEN szelessegen all: nulla `@media`, nulla
 * `min-width` (merve 2026-09-08). Egy fix szelessegu rendereles szerkezetileg
 * nem hordozhat torespontot. A `lg` (1024 px) tehat DONTES, a repo sajat
 * konvencioja szerint, nem mert ertek -- es azert all itt kiirva, hogy senki ne
 * hivatkozzon ra ugy, mintha a tervbol jonne.
 *
 * AMI VISZONT A TERVBOL JON, es merve van: a ket oszlop merteke (856 es 452,
 * koztuk 44), es hogy a jobb oszlop egy FIX szelessegu savot kap
 * (`minmax(0,1fr) 452px`), nem aranyost.
 *
 * EZ A BEKEZDES KORABBAN MEGNEVEZTE A RESt, ES A KOD MEGSEM KOVETTE: a fix sav
 * itt le volt irva, a racs pedig `856fr 452fr` aranyt hasznalt. 2026-09-08 ota
 * a kod a mert alakot viseli. Egy megnevezett res nem vedelem, csak leiras.
 *
 * === AMIT EZ AZ ALLITAS MER, ES AMIT NEM ===
 *
 * A jsdom nem ertekel media-lekerdezest, tehat ez az OSZTALYNEVEKET meri, nem a
 * festett elrendezest. Ugyanaz az alak, mint a tokeneknel: a nev fele a lanc,
 * a masik felet (hogy a `lg` tenyleg 1024) a keret adja.
 */
describe("a törésponti elrendezés", () => {
  const vaz = () => screen.getByTestId("muszaki-lap-vaz")

  /**
   * A TORESPONT FOLOTTI FELET NEM IROM MEG UJRA.
   *
   * Ezt mar meri az "az asztali ket oszlopos racs ki van teve" allitas
   * ugyanebben a fajlban: `lg:grid`, a fix jobb sav, `lg:gap-x-[44px]`. Egy
   * masodik, ugyanolyan allitas nem ad fedest, csak ket helyen kellene
   * karbantartani -- es a kalibraciokor ket pirosat adna egy hibara, amitol az
   * ember azt hiszi, ket dolog romlott el.
   *
   * AMI HIANYZOTT, az a torespont ALATTI fele: arra egyetlen allitas sem allt.
   * Ezert ez a szakasz EGY allitast tesz hozza, nem harmat.
   */
  /**
   * A TORESPONT ALATT EGY OSZLOP ALL -- ES EZ MOSTANTOL KET ELEMEN MULIK.
   *
   * A kulso taroló mar nem racs (a racs a ketoszlopos futamba kerult), tehat
   * az egy-oszlopos viselkedes ket helyen dol el: a kulso taroló FUGGOLEGES
   * halom, es a ketoszlopos futam a torespont ALATT szinten az.
   *
   * MIERT MER MIND A KETTORE: ha csak a kulsot nezne, a futam barmikor
   * ketoszloposra valthatna mobilon anelkul, hogy barmi szolna -- es a mobil
   * sorrend epp az, amit a mostani atalakitas VALTOZATLANUL hagyott.
   */
  it("a töréspont ALATT egy oszlop áll", () => {
    render(<LapVaz />)

    expect(vaz().className).toContain("flex-col")
    expect(vaz().className).not.toContain("grid-cols-2")

    const futam = screen.getByTestId("vaz-ket-oszlop").className
    expect(futam).toContain("max-lg:flex")
    expect(futam).toContain("max-lg:flex-col")
    expect(futam).not.toContain("max-lg:grid")
  })
})

describe("a szakaszok csoportokba vonása", () => {
  const sz = (kulcs: string, csoport?: string, oszlop = "jobb") =>
    ({ kulcs, cim: "", varakozo: "", oszlop, csoport }) as never

  it("csoport nélküli szakaszokból egyelemű csoportok lesznek", () => {
    const ki = csoportokba([sz("a"), sz("b")])

    expect(ki.map((cs) => cs.length)).toEqual([1, 1])
  })

  it("az egymás után álló, azonos csoportúak összevonódnak", () => {
    const ki = csoportokba([sz("a", "v"), sz("b", "v"), sz("c")])

    expect(ki.map((cs) => cs.map((x) => x.kulcs))).toEqual([["a", "b"], ["c"]])
  })

  /**
   * A SORREND SZAMIT, ES EZ SZANDEKOS. Ha egy harmadik szakasz kozejuk kerul,
   * KET panel lesz belole, nem egy osszevont: a lap sorrendjet a szakasz-lista
   * adja, nem a csoportosito.
   */
  it("a megszakított csoportból KÉT panel lesz, nem egy összevont", () => {
    const ki = csoportokba([sz("a", "v"), sz("kozbe"), sz("b", "v")])

    expect(ki.map((cs) => cs.map((x) => x.kulcs))).toEqual([
      ["a"],
      ["kozbe"],
      ["b"],
    ])
  })

  it("a más oszlopban álló azonos csoport NEM vonódik össze", () => {
    const ki = csoportokba([sz("a", "v"), sz("b", "v", "bal")])

    expect(ki.map((cs) => cs.length)).toEqual([1, 1])
  })
})

/**
 * A LAP SOTET FELULETE, NEM EGY DOBOZ BENNE (picasso atnezese, 2026-09-08).
 *
 * A korabbi alakban a sotet hatter a KOZEPRE IGAZITOTT, 1352 pixelre
 * korlatozott dobozon allt, tehat egy sotet kartya lebegett feher lapon.
 *
 * AMIT EZ MER: hogy van teljes szelessegu felulet, hogy AZ viszi a hattert, es
 * hogy a vilag jelolot O IS hordozza (enelkul a sajat hattere a VILAGOS
 * ertekbol oldodna fel).
 *
 * AMIT NEM MER: a festett szint. A jsdom nem oldja fel a CSS-valtozokat, tehat
 * itt a token NEVE merheto. Es NEM meri a fejlecet meg a lablecet: azok a
 * `(main)` elrendezesben allnak, a lap folott, kulon tetelkent.
 */
describe("a lap teljes szélességű sötét felülete", () => {
  const teljes = () => screen.getByTestId("lap-teljes-szelesseg")

  /** ISMERT POZITIV KONTROLL: a vaz tovabbra is megrajzolodik alatta. */
  it("a teljes szélességű felület és a váz is megjelenik", () => {
    render(<LapVaz vilag="sotet" />)

    expect(teljes()).toBeTruthy()
    expect(screen.getByTestId("muszaki-lap-vaz")).toBeTruthy()
  })

  it("a teljes szélességű felület viseli a világ jelölőjét", () => {
    render(<LapVaz vilag="sotet" />)

    expect(teljes().getAttribute("data-vilag")).toBe("sotet")
  })

  it("a hátteret a teljes szélességű felület viszi, tokenből", () => {
    render(<LapVaz vilag="sotet" />)

    expect(teljes().style.background).toBe("var(--terv-hatter)")
  })

  /**
   * EZ A LENYEG: a felulet NEM lehet szelessegre korlatozva. A regi hiba
   * pontosan az volt, hogy a sotet felulet 1352 pixelnel veget ert.
   *
   * A merteket a BELSO doboz tartja, es arra kulon allitas all.
   */
  /**
   * A VIZSZINTES MARGO A KULSO BURKON ALL, A BELSO DOBOZON NEM -- ES EZ 32
   * PIXELT ERT (merve 2026-09-08).
   *
   * A belso doboz maxWidth-je 1352, ami a terv 1440 pixeles oldalmargoibol jon
   * (1440 - 2*44). Ha ezen BELUL is all egy vizszintes margo, a TARTALOM 1320
   * lesz, es a bal oszlop a tervbeli 856 helyett 824-et kap. A stagingen ez
   * merve is igy allt: 835,047 + 44 + 440,953 = 1320,000.
   *
   * A HIANY-ALLITAS MELLE POZITIV KONTROLL JAR: a fuggoleges margo megmarad,
   * kulonben egy "nincs benne semmilyen margo" allapot is kielegitene.
   */
  it("a vízszintes margót a külső burok viszi, a belső doboz nem", () => {
    render(<LapVaz vilag="sotet" />)

    const belso = screen.getByTestId("muszaki-lap-vaz")

    /*
      OSZTALY-LISTARA MERUNK, NEM RESZSZORA. Az elso alakom
      `not.toContain("p-4 ")` volt, szokozzel -- az a sor VEGEN allo `p-4`
      osztalyt csendben atengedne. Ugyanaz a fajta tul szuk kereses, amitol
      ma delelott egy allitas azert lett zold, mert a keresett szovegbol
      hianyzott egy karakter.
    */
    const osztalyok = (e: Element) => e.className.split(/\s+/)

    expect(osztalyok(teljes())).toContain("px-4")
    expect(osztalyok(belso)).toContain("py-4")
    expect(osztalyok(belso)).not.toContain("px-4")
    expect(osztalyok(belso)).not.toContain("p-4")
  })

  it("a morzsamenü sávja sem visz saját vízszintes margót", () => {
    render(<LapVaz vilag="sotet" morzsa={<span>Korallok</span>} />)

    const sav = screen.getByTestId("lap-morzsa-sav")

    const osztalyok = sav.className.split(/\s+/)

    expect(osztalyok).toContain("pt-4")
    expect(osztalyok).not.toContain("px-4")
    expect(osztalyok).not.toContain("p-4")
  })

  it("a teljes szélességű felület NINCS szélességre korlátozva", () => {
    render(<LapVaz vilag="sotet" />)

    expect(teljes().style.maxWidth).toBe("")
    expect(screen.getByTestId("muszaki-lap-vaz").style.maxWidth).toBe("1352px")
  })
})

/**
 * A PANEL ES A LAP KET KULONBOZO TOKENEN ALL, ES EDDIG EGYIKET SEM MERTE SEMMI.
 *
 * MIERT KERULT IDE (sajat meres, 2026-09-08): a csere elott a panel a
 * `--terv-hatter-lap` tokent viselte, aminek a sotet erteke 0.17 -- az a terv
 * LAP-erteke. A panel igy SOTETEBB volt a lapnal, holott a tervben
 * VILAGOSABB. A viszony meg volt forditva, es a teljes spec fajlban egyetlen
 * allitas sem erintette a panel hatteret: a csere barmelyik iranyban nemán
 * ment volna at.
 *
 * AMIT MER: a token NEVET, mind a ket feluleten, es hogy a KETTO KULONBOZIK.
 *
 * AMIT NEM MER: a festett szint. A jsdom nem oldja fel a CSS-valtozokat, tehat
 * azt, hogy 0.205 all-e a 0.17 helyett, a `terv-tokenek.spec.ts` allitja a
 * stiluslapon. A ket meres egyutt ad teljes lancot: itt a HIVAS, ott az ERTEK.
 *
 * A LAP TONUSA AZOTA A HELYERE KERULT, ES EZ A BEKEZDES EZERT AT VAN IRVA.
 * Az allt itt, hogy a lap sotetben 0.235-on all es a javitas dontesre var. A
 * `--terv-hatter` sotet erteke azota 0.17, vagyis a sotet tervlap sajat
 * hattere -- es a valtozas EGYETLEN masik hivohelyet sem mozditott, mert ezt a
 * tokent csak a lap viseli.
 *
 * A ket felulet viszonya ezzel megfordult a helyes iranyba: a panel (0.205)
 * mostantol VILAGOSABB a lapnal (0.17), ahogy a terv keri.
 */
describe("a panel és a lap tónusa", () => {
  const kozosPanel = () =>
    document.querySelector('[data-vaz-csoport="vasarlas"]') as HTMLElement

  it("a közös panel a tervvel betűre egyező tokent viseli", () => {
    render(<LapVaz vilag="sotet" />)

    expect(kozosPanel().style.background).toBe("var(--terv-hatter-halvany)")
  })

  /**
   * A DOBOZNAK TARTALOM KELL, ES EZT EGY SAJAT PIROS TANITOTTA MEG.
   *
   * Eloszor tartalom nelkul kerdeztem le, es a teszt elbukott: az URES szakasz
   * hattere szandekosan `transparent`, ott a szaggatott keret a jel. A pirosat
   * tehat nem a kod adta, hanem a kerdesem -- a token csak a TARTALMAS agon
   * jelenik meg, es epp az az ag valtozott.
   */
  it("a csoportba nem vont doboz ugyanazt a tokent viseli", () => {
    render(
      <LapVaz
        vilag="sotet"
        tartalom={{ csomagajanlat: <span>Két korall együtt</span> }}
      />,
    )

    const doboz = document.querySelector(
      '[data-vaz-szakasz="csomagajanlat"]',
    ) as HTMLElement

    expect(doboz.getAttribute("data-vaz-ures")).toBe("nem")
    expect(doboz.style.background).toBe("var(--terv-hatter-halvany)")
  })

  /**
   * ES A MASIK AG IS ALLITVA VAN, kulonben a fenti allitas nem mondana meg,
   * hogy a `transparent` valasztas tulelte-e a cseret. Ez az ismert pozitiv
   * kontroll parja: ott a token JELENIK MEG, itt NEM SZABAD megjelennie.
   */
  it("az üres doboz továbbra is áttetsző marad", () => {
    render(<LapVaz vilag="sotet" />)

    const doboz = document.querySelector(
      '[data-vaz-szakasz="csomagajanlat"]',
    ) as HTMLElement

    expect(doboz.getAttribute("data-vaz-ures")).toBe("igen")
    expect(doboz.style.background).toBe("transparent")
  })

  /**
   * A KULONBSEG ALLITASA MELLE MIND A KET KONKRET ERTEK ODAKERUL.
   *
   * Egy magaban allo `not.toBe` parost egy URES stilus is kielegitene: ha
   * egyik elem sem kapna hattert, a ket ures string kulonbozne... nem, epp
   * hogy EGYEZNE -- de ha csak az egyik lenne ures, a teszt zold maradna, es
   * pont azt nem venne eszre, hogy az egyik felulet elvesztette a tokenjet.
   */
  it("a panel és a lap NEM ugyanazt a tokent viseli", () => {
    render(<LapVaz vilag="sotet" />)

    const lap = screen.getByTestId("lap-teljes-szelesseg")

    expect(lap.style.background).toBe("var(--terv-hatter)")
    expect(kozosPanel().style.background).toBe("var(--terv-hatter-halvany)")
    expect(kozosPanel().style.background).not.toBe(lap.style.background)
  })
})

/**
 * A MORZSAMENU A SOTET FELULETEN BELUL ALL, NEM FOLOTTE.
 *
 * AMIT MER: a BEFOGLALAST. Nem azt, hogy letezik a slot, hanem hogy a tartalma
 * a teljes szelessegu felulet LESZARMAZOTTJA. Ez a kulonbseg a lenyeg: a
 * morzsamenu eddig is megjelent a lapon, csak a felulet FOLOTT, a vilagos
 * savban.
 *
 * AMIT NEM MER: a festett szint, es azt sem, hogy a morzsamenu maga tokenbol
 * veszi-e a szineit -- azt a `product-breadcrumb.component.spec` allitja, a
 * #210 ota. A ketto egyutt ad teljes lancot: ott a SZIN, itt a HELY.
 */
describe("a morzsamenü helye a sötét felületen", () => {
  it("a morzsamenü a teljes szélességű felület LESZÁRMAZOTTJA", () => {
    render(<LapVaz vilag="sotet" morzsa={<span>Korallok</span>} />)

    const felulet = screen.getByTestId("lap-teljes-szelesseg")
    const sav = screen.getByTestId("lap-morzsa-sav")

    expect(felulet.contains(sav)).toBe(true)
    expect(sav.textContent).toContain("Korallok")
  })

  /**
   * A MASIK AG. Enelkul az elso allitas nem mondana meg, hogy a sav a MORZSA
   * miatt all ott, vagy mindig. Egy `getByTestId`, ami mindig talal, nem meri
   * a feltetelt -- csak azt, hogy a lap felepul.
   */
  it("morzsamenü nélkül nincs sáv", () => {
    render(<LapVaz vilag="sotet" />)

    expect(screen.queryByTestId("lap-morzsa-sav")).toBeNull()
  })

  /**
   * A SAV SZELESSEGE A RACSEVAL EGYEZIK, es ez nem kozmetika: ha a morzsamenu
   * a burok szelere futna ki, a lap teteje mas margoval indulna, mint a
   * tartalom alatta.
   */
  it("a sáv ugyanazt az 1352 pixeles mértéket tartja, mint a rács", () => {
    render(<LapVaz vilag="sotet" morzsa={<span>x</span>} />)

    expect(screen.getByTestId("lap-morzsa-sav").style.maxWidth).toBe("1352px")
    expect(screen.getByTestId("muszaki-lap-vaz").style.maxWidth).toBe("1352px")
  })
})
