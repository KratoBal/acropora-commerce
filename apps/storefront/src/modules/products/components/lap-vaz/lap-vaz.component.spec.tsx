import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LapVaz, { ELO_ALLAT_LAP_SZAKASZAI, MUSZAKI_LAP_SZAKASZAI } from "./index"

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
  it("az asztali két oszlopos rács ki van téve", () => {
    render(<LapVaz />)

    const vaz = screen.getByTestId("muszaki-lap-vaz")
    const osztalyok = vaz.className

    expect(osztalyok).toContain("lg:grid")
    expect(osztalyok).toContain("856fr_452fr")
    expect(osztalyok).toContain("lg:gap-x-[44px]")
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
    expect(doboz("meretezes-seged")?.varakozo).toBe("Hová tedd ezt a példányt?")
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
   * MERVE (murena, 2026-09-08): a 160 sotet lapbol HAROM egyedi peldany, tehat
   * 157 lapon a "tovabbi" szo valotlant allitott.
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
   * ES A TOBBI SOTET FELIRAT NEM MOZDUL VELE. Enelkul egy olyan valtozat is
   * zold maradna, ami nem-egyedi peldanynal az EGESZ sotet listat eldobja --
   * es akkor a korall lapon ujra a muszaki feliratok allnanak.
   */
  it("a nem egyedi példány CSAK a hasonló doboz feliratát mozdítja", () => {
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
