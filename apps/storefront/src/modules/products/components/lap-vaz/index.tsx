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

type VazSzakasz = {
  /** A doboz azonositoja, a tervbeli sorrend szerint. */
  kulcs: string
  /** A cim, ahogy a tervben all. Ures sztring: a doboznak nincs kiirt cime. */
  cim: string
  /** Mit mondunk, amig nincs mogotte tartalom. */
  varakozo: string
}

/**
 * A TIZENNEGY DOBOZ, A TERVBELI SORRENDBEN.
 *
 * A `varakozo` szoveg SEMLEGES: megmondja, mi jon ide, es nem allit semmit a
 * termekrol. Ez a kulonbseg a "meg nem kesz" es a "kitalalt adat" kozott.
 */
export const MUSZAKI_LAP_SZAKASZAI: VazSzakasz[] = [
  { kulcs: "cimsor", cim: "", varakozo: "A termek neve es a fejlec-muveletek" },
  { kulcs: "foto", cim: "", varakozo: "Termekfoto" },
  { kulcs: "meretezes-seged", cim: "Meretezes-seged", varakozo: "Ide jon a meretezes-seged" },
  { kulcs: "fulek", cim: "", varakozo: "Muszaki adatok, Leiras, Spektrum, Ertekelesek, Letoltesek" },
  { kulcs: "muszaki-adatok", cim: "Muszaki adatok", varakozo: "Ide jonnek a termek muszaki adatai" },
  { kulcs: "ar", cim: "", varakozo: "Ide jon az ar" },
  { kulcs: "elerhetoseg", cim: "", varakozo: "Keszlet, szallitas, bolti atvetel" },
  { kulcs: "valaszto", cim: "", varakozo: "Valtozat-valaszto" },
  { kulcs: "mennyiseg", cim: "", varakozo: "Mennyiseg es kosarba tetel" },
  { kulcs: "csomagajanlat", cim: "Csomagajanlat", varakozo: "Ide jon a csomagajanlat" },
  { kulcs: "kerdezd", cim: "Kerdezd minket", varakozo: "Kapcsolatfelvetel" },
  { kulcs: "kiegeszitok", cim: "Ami meg kellhet hozza", varakozo: "Ide jonnek a tartozekok" },
  { kulcs: "hasonlo", cim: "Hasonlo lampak", varakozo: "Ide jonnek a hasonlo termekek" },
  { kulcs: "ragados-sav", cim: "", varakozo: "A lap aljan futo sav" },
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

type LapVazProps = {
  /** Szakasz-kulcs szerint a tartalom. Ami hianyzik, az uresen jelenik meg. */
  tartalom?: Partial<Record<string, React.ReactNode>>
}

/**
 * A LAP VAZA. Egyetlen oszlop, a tervbeli sorrendben.
 *
 * A KET OSZLOPOS ELRENDEZES KESOBB JON, es ezt kimondom: a tervben a fo blokk
 * `grid-template-columns: 1fr 1fr` alakban all, 26px koz mellett -- de az
 * oszlopokba valo BESOROLAS csak akkor donthető el, ha a dobozok tartalma is
 * megvan. Egy sorrend, ami helyes, tobbet er egy elrendezesnel, ami talalgat.
 */
const LapVaz = ({ tartalom = {} }: LapVazProps) => {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4"
      style={{
        background: "var(--terv-hatter)",
        fontFamily: "var(--terv-betu-fo-lanc)",
      }}
      data-testid="muszaki-lap-vaz"
    >
      {MUSZAKI_LAP_SZAKASZAI.map((szakasz) => (
        <VazDoboz key={szakasz.kulcs} szakasz={szakasz}>
          {tartalom[szakasz.kulcs]}
        </VazDoboz>
      ))}
    </div>
  )
}

export default LapVaz
