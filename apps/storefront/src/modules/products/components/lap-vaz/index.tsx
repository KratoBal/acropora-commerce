import React from "react"

/**
 * A MUSZAKI TERMEKLAP VAZA -- A DOBOZOK A HELYUKON, TARTALOM NELKUL.
 *
 * === MIERT VAN KULON VAZ-KOMPONENS ===
 *
 * Balazs kerese (2026-09-07, acrobot atadasaban, szo szerint): "ha ugy epul fel
 * ahogy a tervben van de meg nem mukodik a funkcio engem az se zavar! sot!
 * annak orulnek a legjobban".
 *
 * Vagyis a lap ALLJON OSSZE ugy, ahogy a terv mutatja, es ami mogott nincs kesz
 * funkcio, az legyen ott URESEN. Ez FELULIRJA a korabbi szabalyt, hogy ures
 * doboz ne jelenjen meg -- az egy MUKODO boltra szolt, ez vazra.
 *
 * === A SORREND MERESBOL JON, NEM EMLEKEZETBOL ===
 *
 * A tervfajl (`exchange/design-balazs/termeklap-1b-es-2a-2026-09-07.html`) nem
 * statikus HTML: 846 872 bajtbol 844 134 egy `<script>` belsejeben all, es a
 * valodi jelolo 562 karakter. A jelolo escape-elt sztringkent van a kotegben;
 * kibontva 839 528 karakter olvashato HTML, es abbol jon az alabbi sorrend.
 *
 * A tervben hat lap-valtozat all (harom az elo allat, harom a muszaki); ez a
 * vaz a legteljesebb MUSZAKI valtozatot koveti.
 *
 * === MIERT SLOTOK, ES NEM KESZ TARTALOM ===
 *
 * A vaz azt rogziti, MI HOL ALL. Hogy egy dobozban valodi adat legyen-e (nev,
 * ar, kep a Medusabol) vagy semleges jelzes, az KULON dontes, es a tartalom
 * retegehez tartozik. Igy barmelyik valasz eseten csak a tartalom valtozik, a
 * szerkezet nem.
 *
 * ES AMI KIKOTES: ide NEM KERUL KITALALT ADAT. A tervben minden szam kitalalt
 * (289 900 Ft, PAR 380, 41 ertekeles); egy uresen hagyott doboz becsuletes, egy
 * kitalalt ertekkel feltoltott doboz kesobb tenynek olvasodik.
 */

/**
 * MELYIK OSZLOPBA KERUL EGY DOBOZ.
 *
 * A tervbol merve, fejeless bongeszoben, 1440 pixeles nezetben:
 *
 *     tartalom-oszlop   1352 px, x=100-tol
 *     BAL                856 px  (x=100)
 *     koz                 44 px
 *     JOBB               452 px  (x=1000)
 *
 *     856 + 44 + 452 = 1352, tehat a szamok zarnak.
 *
 * EGY CSAPDA, AMIT KULON MEGNEZTEM: a tervben allnak dobozok x=1520-nal is, ami
 * ELSORE jobb oszlopnak latszik. Nem az: a nezeten KIVUL vannak, tehat egy
 * MASIK lap-valtozathoz tartoznak. Ha azokat vettem volna a jobb oszlopnak, a
 * szamok nem zartak volna.
 */
type Oszlop = "teljes" | "bal" | "jobb"

type VazSzakasz = {
  /** A doboz azonositoja, a tervbeli sorrend szerint. */
  kulcs: string
  /** A cim, ahogy a tervben all. Ures sztring: a doboznak nincs kiirt cime. */
  cim: string
  /** Mit mondunk, amig nincs mogotte tartalom. */
  varakozo: string
  /** Melyik oszlopba kerul az asztali nezetben. */
  oszlop: Oszlop
}

/**
 * A TIZENNEGY DOBOZ, A TERVBELI SORRENDBEN.
 *
 * A `varakozo` szoveg SEMLEGES: megmondja, mi jon ide, es nem allit semmit a
 * termekrol. Ez a kulonbseg a "meg nem kesz" es a "kitalalt adat" kozott.
 *
 * === HONNAN JOTT A LISTA, ES MIERT SZAMIT ===
 *
 * A tervfajl (`exchange/design-balazs/termeklap-1b-es-2a-2026-09-07.html`)
 * MUSZAKI (1b) valtozatabol. A sotet (2a) valtozat ugyanezt a doboz-sort
 * hasznalja, mas ertek-keszlettel.
 *
 * Ezt azert kell kiirni, mert a tervfajl TOBB valtozatot tartalmaz, es egy
 * "hianyzo doboz" bejelentesnel az elso kerdes az, hogy ugyanabbol a
 * valtozatbol nezzuk-e.
 *
 * === EGY KONKRET ESET, AMI EBBOL MAR ELOJOTT: A VIDEO ===
 *
 * Murena a terv dobozlistajat kiolvasva talalt egy VIDEO elemet a foto es a
 * meretezes-seged kozott, ami ebbol a tizennegybol hianyzik. Helyesen NEM
 * nevezte hibanak, hanem ket magyarazatot adott melle.
 *
 * A valasz egy HARMADIK volt, es meressel dolt el. A tervfajlban a "VIDEÓ"
 * szo haromszor all (ekezettel; ekezet nelkul nullaszor), es MINDHAROM
 * BOLYEGKEP, nem doboz:
 *
 *   a befoglalo racs ketszer `grid-template-columns: repeat(6,1fr)`
 *   mindegyik `aspect-ratio:1`, tobb ugyanilyen testverrel
 *   az egyik szomszedja a "NAPPALI FÉNY" felirat -- szinten bolyegkep
 *
 * Vagyis a video a KEPGALERIA hatos bolyegkep-savjanak eleme. Ha valaha
 * megepul, a galeriaban a helye (az a `fotoResz` sloton at erkezik), NEM egy
 * tizenotodik dobozkent.
 *
 * ES A MERESI TANULSAG: egy doboz-lista kinyerese NEM kulonbozteti meg a
 * bolyegkepet a doboztol -- a kulonbseg csak a BEFOGLALO RACSBOL latszik. Aki
 * legkozelebb "hianyzo dobozt" talal, elobb a racsot nezze meg.
 */
/**
 * MINDEN SZOVEG ITT A VEVONEK SZOL, TEHAT MAGYAR HELYESIRASSAL ALL.
 *
 * Ez a lista 2026-09-07-ig EKEZET NELKUL allt, es ugy is jelent meg az elo
 * lapon -- mind a tizennegy dobozon. Nem allvanyzat volt: Balazs epp azt a
 * lapot nyitotta meg.
 *
 * AZ OK ERDEKESEBB A HIBANAL: mi egesz nap ekezet nelkul irunk EGYMASNAK, mert
 * a csatorna-kapu es a parancssor miatt ez lett a szokas. Az a SAJAT kozegunk
 * szabalya. A kodban allo felirat viszont nem nekunk szol. A szokas atlepett
 * egy hatart, es senki nem vette eszre, mert nekunk termeszetesnek latszott.
 *
 * A HATAR: ami a VEVOHOZ megy, az magyar helyesirassal all. A valtozonevek, a
 * kulcsok es a kommentek maradhatnak ekezet nelkul -- azokat mi olvassuk.
 *
 * Orzo all ra: `lap-vaz.component.spec.tsx`, "a vevonek szant szoveg magyarul".
 */
export const MUSZAKI_LAP_SZAKASZAI: VazSzakasz[] = [
  {
    kulcs: "cimsor",
    cim: "",
    varakozo: "A termék neve és a fejléc-műveletek",
    oszlop: "teljes",
  },
  { kulcs: "foto", cim: "", varakozo: "Termékfotó", oszlop: "bal" },
  {
    kulcs: "meretezes-seged",
    cim: "Méretezés-segéd",
    varakozo: "Ide jön a méretezés-segéd",
    oszlop: "bal",
  },
  {
    kulcs: "fulek",
    cim: "",
    varakozo: "Leírás és műszaki adatok",
    oszlop: "bal",
  },
  {
    kulcs: "muszaki-adatok",
    cim: "Műszaki adatok",
    varakozo: "Ide jönnek a termék műszaki adatai",
    oszlop: "bal",
  },
  { kulcs: "ar", cim: "", varakozo: "Ide jön az ár", oszlop: "jobb" },
  {
    kulcs: "elerhetoseg",
    cim: "",
    varakozo: "Készlet, szállítás, bolti átvétel",
    oszlop: "jobb",
  },
  { kulcs: "valaszto", cim: "", varakozo: "Változat-választó", oszlop: "jobb" },
  {
    kulcs: "mennyiseg",
    cim: "",
    varakozo: "Mennyiség és kosárba tétel",
    oszlop: "jobb",
  },
  {
    kulcs: "csomagajanlat",
    cim: "Csomagajánlat",
    varakozo: "Ide jön a csomagajánlat",
    oszlop: "jobb",
  },
  {
    kulcs: "kerdezd",
    cim: "Kérdezd minket",
    varakozo: "Kapcsolatfelvétel",
    oszlop: "jobb",
  },
  {
    kulcs: "kiegeszitok",
    cim: "Ami még kellhet hozzá",
    varakozo: "Ide jönnek a tartozékok",
    oszlop: "teljes",
  },
  {
    kulcs: "hasonlo",
    cim: "Hasonló termékek",
    varakozo: "Ide jönnek a hasonló termékek",
    oszlop: "teljes",
  },
  {
    kulcs: "ragados-sav",
    cim: "",
    varakozo: "A lap alján futó sáv",
    oszlop: "teljes",
  },
]

type VazDobozProps = {
  szakasz: VazSzakasz
  children?: React.ReactNode
}

/**
 * EGY DOBOZ. Ha kap tartalmat, azt mutatja; ha nem, a varakozo szoveget.
 *
 * A szaggatott keret SZANDEKOS: megkulonbozteti a meg ures dobozt a kesztol,
 * tehat aki a lapot nezi, latja, mi all mar es mi csak a helyet foglalja. Egy
 * ures doboz, ami kesznek latszik, rosszabb a hianyzonal.
 */
export const VazDoboz = ({ szakasz, children }: VazDobozProps) => {
  /**
   * A JSX gyerek-atadasnal a `children` akkor is letezhet, ha nincs benne semmi
   * (ures kifejezes, `undefined` a terkepbol). Ezert nem a MEZO meglétét
   * nezzuk, hanem hogy van-e MIT kirajzolni.
   */
  const uresE =
    children === undefined ||
    children === null ||
    children === false ||
    (Array.isArray(children) && children.length === 0)

  return (
    <section
      /**
       * HORGONY-AZONOSITO MINDEN DOBOZON, NEM CSAK AZON, AMIRE MA MUTATUNK.
       *
       * A ragados sav gombja a vasarlo oszlopra ugrik (acrobot dontese,
       * 2026-09-07). Egyetlen dobozra tenni azonositot kivetel lenne, es a
       * kovetkezo horgonynal valaki ujra eldontene, hova. Igy a szabaly egy
       * sor: minden doboz elerheto `#vaz-<kulcs>` alakban.
       */
      id={`vaz-${szakasz.kulcs}`}
      data-vaz-szakasz={szakasz.kulcs}
      data-vaz-ures={uresE ? "igen" : "nem"}
      className="p-4"
      style={{
        border: uresE
          ? "1px dashed var(--terv-keret)"
          : "1px solid var(--terv-keret)",
        background: uresE ? "transparent" : "var(--terv-hatter-lap)",
        color: "var(--terv-szoveg)",
      }}
    >
      {szakasz.cim && (
        <h2
          className="mb-2 text-base font-semibold"
          style={{ fontFamily: "var(--terv-betu-fo-lanc)" }}
        >
          {szakasz.cim}
        </h2>
      )}
      {uresE ? (
        <p
          className="text-sm"
          style={{ color: "var(--terv-szoveg-halvany)" }}
          data-testid="vaz-varakozo"
        >
          {szakasz.varakozo}
        </p>
      ) : (
        children
      )}
    </section>
  )
}

/**
 * A KET VILAG. Nem izles es nem latogatoi beallitas: a TERMEK FAJTAJA donti el.
 * A `globals.css` `[data-vilag="sotet"]` blokkja irja felul ugyanazokat a
 * valtozokat, tehat a vaz szerkezete valtozatlan marad -- ugyanaz a doboz,
 * masik ertek-keszlet.
 */
/**
 * AZ ELO ALLAT LAP DOBOZAI -- A TERVBOL MERVE, NEM KITALALVA.
 *
 * A tervfajl HAT lap-valtozatot tartalmaz: harom elo allatot es harom
 * muszakit. A fenti lista a legteljesebb MUSZAKI valtozatot koveti; ez itt a
 * korall valtozat ("2. KOR WYSIWYG korall termekoldal, sotet").
 *
 * === MIERT NEM ELEG UGYANAZ A LISTA ===
 *
 * A ket valtozat SZERKEZETE azonos, a FELIRATAI nem. Egy korall lapon a
 * "Hasonlo lampak" doboz nem uresen allna, hanem TELE lenne -- hamis felirat
 * alatt. Egy ures doboz azt mondja, hogy meg nincs kesz; egy rossz cim azt,
 * hogy lampat nezel.
 *
 * === AMI MERVE VAN, ES AMI NEM ===
 *
 * A tervbol kiolvasva (`exchange/design-balazs/geometria-sorrend-terv.json`,
 * a korall valtozat dobozai):
 *
 *   foto              "SAJAT FOTO -- EZ A PELDANY, 16:10"
 *   meretezes-seged   "ELHELYEZES-SEGED / Hova tedd ezt a peldanyt?"
 *   fulek             Gondozas, Leiras, Vizparameterek, Eloallat-szallitas,
 *                     Ertekelesek
 *   csomagajanlat     "Kotegajanlat"
 *   kerdezd           "Kerdezd a boltot"
 *   hasonlo           "Tovabbi WYSIWYG peldanyok"
 *   kiegeszitok       NINCS ilyen doboz a korall valtozatban -- de a dobozt
 *                     MEGIS meghagyjuk, lasd az indoklast lentebb
 *
 * EGYETLEN CIM NEM A TERVBOL VALO, ES EZT KIMONDOM: a `muszaki-adatok` doboz
 * a tervben MINDKET valtozatban cim NELKUL all (a muszakinal "Teljesitmeny 160 W
 * ...", a korallnal "Nehezseg Halado, Fenyigeny ..."). A "Muszaki adatok" cimet
 * a mi vazunk tette ra. Korallra az szo szerint rossz, ezért a MERT TARTALOMBOL
 * vezettem le: tartasi parameterek. Ha ez nem tetszik, EZ AZ EGY sor cserelendo,
 * es a tobbi a tervbol all.
 */
const ELO_ALLAT_CIMEK: Record<string, { cim?: string; varakozo?: string }> = {
  foto: { varakozo: "Saját fotó: ez a példány" },
  "meretezes-seged": {
    cim: "Elhelyezés-segéd",
    varakozo: "Hová tedd ezt a példányt?",
  },
  "muszaki-adatok": {
    cim: "Tartási paraméterek",
    varakozo: "Nehézség, fényigény, áramlás",
  },
  fulek: {
    varakozo:
      "Gondozás, Leírás, Vízparaméterek, Élőállat-szállítás, Értékelések",
  },
  csomagajanlat: { cim: "Kötegajánlat", varakozo: "Ide jön a kötegajánlat" },
  kerdezd: { cim: "Kérdezd a boltot", varakozo: "Kapcsolatfelvétel" },
  hasonlo: {
    cim: "További WYSIWYG példányok",
    varakozo: "Ide jönnek a további egyedi példányok",
  },
}

/**
 * ES EGY DOBOZ, AMIT A TERV ALAPJAN KI KELLETT VOLNA HAGYNI -- MEGIS BENT MARAD.
 *
 * Merve: a korall valtozatban NINCS "Ami meg kellhet hozza" doboz. Eloszor ki is
 * vettem, es egy MEGLEVO allitas azonnal pirosra valtott:
 *
 *   "a szerkezet mindket vilagban ugyanaz"
 *
 * Az az allitas SZANDEKOS, es a sajat kommentje ki is mondja, mit ved: hogy a
 * ket vilag NEM ket kulon lap, csak ket ertek-keszlet ugyanazon a vazon. Ez
 * szerkezeti dontes, es nem az enyem -- nem irom at azert, hogy az en
 * valtozasom atmenjen.
 *
 * ES A KET BIZONYITEK KOZUL A MASODIK ITT EROSEBB, mert Balazs kikotese pontosan
 * erre az esetre szol: "ami NINCS, ott a doboz alljon a helyen, uresen". Egy
 * uresen allo tartozek-doboz tehat NEM hiba a korall lapon, hanem a kimondott
 * viselkedes. A "Hasonlo lampak" felirat viszont AZ IGEN: az nem ures doboz,
 * hanem rossz allitas -- es a javitas pontosan azt celozza.
 */

/**
 * A LISTA SZARMAZTATVA, NEM MASOLVA.
 *
 * Ha valaki uj dobozt vesz fel a muszaki listaba, az ITT IS megjelenik -- egy
 * masolat eseten csendben kimaradna, es az elteres csak a lapon latszana.
 * A felirat-elteresek egy helyen allnak, fent.
 */
/**
 * === EGY KOR ODA-VISSZA, ES A REKORD KEDVEERT KIIRVA ===
 *
 * A #108-ban ez a ket doboz (`meretezes-seged`, `muszaki-adatok`) LEKERULT a
 * sotet listarol, acrobot dontese alapjan: "ha egy doboznak sem forrasa, sem
 * jelentese nincs azon a vilagon, akkor nem varakozo hely, hanem zaj".
 *
 * Az a dontes az en TALALGATASOMRA epult -- en javasoltam, hogy a ket doboz
 * essen ki --, es a tervbol vett meres CAFOLTA: a korall valtozat MINDKET
 * dobozt tartalmazza, csak MAST kerdez (`ELHELYEZES-SEGED / Hova tedd ezt a
 * peldanyt?`, illetve a nehezseg-fenyigeny-aramlas tabla).
 *
 * Acrobot ezert felulirta a sajat jovahagyasat, es a lista a TERVBOL jon. A ket
 * doboz visszakerult, felirattal egyutt.
 *
 * AMI EBBOL TANULSAG, ES EZERT MARAD ITT: a talalgatasom nem csak pontatlan
 * volt, hanem rossz IRANYBA tevedett -- KEVESEBBET epitett volna, mint amennyi
 * a tervben keszen all. Egy "vegyuk ki, ugysem tudjuk kitolteni" javaslat
 * mindig igy nez ki: ovatosnak latszik, es kozben szegenyebb lapot ad.
 */
export const ELO_ALLAT_LAP_SZAKASZAI: VazSzakasz[] = MUSZAKI_LAP_SZAKASZAI.map(
  (szakasz) => ({
    ...szakasz,
    ...(ELO_ALLAT_CIMEK[szakasz.kulcs] ?? {}),
  }))

/** Melyik vilag melyik dobozlistat kapja. */
export function szakaszokVilagra(vilag: Vilag): VazSzakasz[] {
  return vilag === "sotet" ? ELO_ALLAT_LAP_SZAKASZAI : MUSZAKI_LAP_SZAKASZAI
}

export type Vilag = "vilagos" | "sotet"

type LapVazProps = {
  /** Szakasz-kulcs szerint a tartalom. Ami hianyzik, az uresen jelenik meg. */
  tartalom?: Partial<Record<string, React.ReactNode>>
  /** Alapertelmezes a VILAGOS: a katalogus tulnyomo resze muszaki termek. */
  vilag?: Vilag
}

/**
 * A LAP VAZA, KET OSZLOPBAN.
 *
 * A #66-ban ez a megjegyzes allt itt: "a ket oszlopos elrendezes KESOBB JON --
 * az oszlopokba valo besorolas csak akkor donthető el, ha a dobozok tartalma is
 * megvan". A tartalom azota bekerult, tehat AZ A FELTETEL TELJESULT, es ez a
 * bekezdes ezert lett atirva, nem kiegeszitve.
 *
 * AZ ARANYOK MERTEK, NEM BECSULTEK (1440 pixeles nezet, a tervbol):
 *
 *     BAL   856 px   -- foto, meretezes-seged, fulek, muszaki adatok
 *     koz    44 px
 *     JOBB  452 px   -- ar, elerhetoseg, valaszto, mennyiseg, csomagajanlat, kerdezd
 *     teljes szelesseg: cimsor, tartozekok, hasonlo termekek, ragados sav
 *
 * A ket oszlop aranyat `856fr 452fr` alakban adjuk at, nem kerekitett
 * szazalekban: igy a forras SZAMA all a kodban, es barki visszakeresheti a
 * merésben. Egy "65% / 35%" mar ertelmezes lenne.
 *
 * MOBILON EGY OSZLOP, a tervbeli SORRENDBEN. Ez nem dontes, hanem a sorrend
 * kovetkezmenye: a `flex-col` alatt a dobozok abban a sorrendben allnak, ahogy
 * a `MUSZAKI_LAP_SZAKASZAI` felsorolja oket -- es az a terv sorrendje.
 */
const LapVaz = ({ tartalom = {}, vilag = "vilagos" }: LapVazProps) => {
  return (
    <div
      className="mx-auto w-full p-4 lg:grid lg:grid-cols-[856fr_452fr] lg:gap-x-[44px] lg:gap-y-4 max-lg:flex max-lg:flex-col max-lg:gap-4"
      style={{
        maxWidth: "1352px",
        background: "var(--terv-hatter)",
        fontFamily: "var(--terv-betu-fo-lanc)",
      }}
      data-testid="muszaki-lap-vaz"
      data-vilag={vilag}
    >
      {szakaszokVilagra(vilag).map((szakasz) => (
        <div
          key={szakasz.kulcs}
          data-vaz-oszlop={szakasz.oszlop}
          className={
            szakasz.oszlop === "teljes"
              ? "lg:col-span-2"
              : szakasz.oszlop === "bal"
              ? "lg:col-start-1"
              : "lg:col-start-2"
          }
        >
          <VazDoboz szakasz={szakasz}>{tartalom[szakasz.kulcs]}</VazDoboz>
        </div>
      ))}
    </div>
  )
}

export default LapVaz
