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
 */
export const MUSZAKI_LAP_SZAKASZAI: VazSzakasz[] = [
  { kulcs: "cimsor", cim: "", varakozo: "A termek neve es a fejlec-muveletek", oszlop: "teljes" },
  { kulcs: "foto", cim: "", varakozo: "Termekfoto", oszlop: "bal" },
  { kulcs: "meretezes-seged", cim: "Meretezes-seged", varakozo: "Ide jon a meretezes-seged", oszlop: "bal" },
  { kulcs: "fulek", cim: "", varakozo: "Muszaki adatok, Leiras, Spektrum, Ertekelesek, Letoltesek", oszlop: "bal" },
  { kulcs: "muszaki-adatok", cim: "Muszaki adatok", varakozo: "Ide jonnek a termek muszaki adatai", oszlop: "bal" },
  { kulcs: "ar", cim: "", varakozo: "Ide jon az ar", oszlop: "jobb" },
  { kulcs: "elerhetoseg", cim: "", varakozo: "Keszlet, szallitas, bolti atvetel", oszlop: "jobb" },
  { kulcs: "valaszto", cim: "", varakozo: "Valtozat-valaszto", oszlop: "jobb" },
  { kulcs: "mennyiseg", cim: "", varakozo: "Mennyiseg es kosarba tetel", oszlop: "jobb" },
  { kulcs: "csomagajanlat", cim: "Csomagajanlat", varakozo: "Ide jon a csomagajanlat", oszlop: "jobb" },
  { kulcs: "kerdezd", cim: "Kerdezd minket", varakozo: "Kapcsolatfelvetel", oszlop: "jobb" },
  { kulcs: "kiegeszitok", cim: "Ami meg kellhet hozza", varakozo: "Ide jonnek a tartozekok", oszlop: "teljes" },
  { kulcs: "hasonlo", cim: "Hasonlo lampak", varakozo: "Ide jonnek a hasonlo termekek", oszlop: "teljes" },
  { kulcs: "ragados-sav", cim: "", varakozo: "A lap aljan futo sav", oszlop: "teljes" },
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
      {MUSZAKI_LAP_SZAKASZAI.map((szakasz) => (
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
