import type { ReactNode } from "react"

import EgyediKorallok from "@modules/kezdolap/components/egyedi-korallok"
import Boltunk from "@modules/kezdolap/components/boltunk"
import HeroCsuszka from "@modules/kezdolap/components/hero-csuszka"
import KezdoEsHalado from "@modules/kezdolap/components/kezdo-es-halado"
import Markak from "@modules/kezdolap/components/markak"
import MitKeresel from "@modules/kezdolap/components/mit-keresel"
import Szolgaltatasok from "@modules/kezdolap/components/szolgaltatasok"
import Velemenyek from "@modules/kezdolap/components/velemenyek"
import { megjeleno, type BlokkKulcs } from "./blokkok"
import { kezdolapAdat, type KezdolapTartalom } from "./tartalom"

/**
 * A SAVOK SORRENDBEN, A KOZOS ALAKBAN. A valodi kezdolap es az OS elo elonezete
 * UGYANEZT a listat hasznalja; egyetlen kulonbseg az "Egyedi korallok" sav
 * csomopontja (`egyedi`): a valodi lap szerveroldalon kerdezi le a termekeket,
 * az elonezet kliensoldalon.
 */
export function savokElemei(
  tartalom: KezdolapTartalom | null,
  egyedi: ReactNode,
): ReactNode[] {
  const adat = kezdolapAdat(tartalom)
  const { szoveg, minta, diak } = adat
  const tenyek = [1, 2, 3].map((n) => ({
    cim: szoveg(`hero.tenyek.${n}.cim`),
    szoveg: szoveg(`hero.tenyek.${n}.szoveg`),
    minta: minta(`hero.tenyek.${n}.cim`) || minta(`hero.tenyek.${n}.szoveg`),
  }))

  const savok: Record<BlokkKulcs, ReactNode> = {
    hero: <HeroCsuszka diak={diak} tenyek={tenyek} />,
    "mit-keresel": <MitKeresel s={adat} />,
    "kezdo-es-halado": <KezdoEsHalado s={adat} />,
    "egyedi-korallok": egyedi,
    szolgaltatasok: <Szolgaltatasok s={adat} />,
    markak: <Markak s={adat} />,
    velemenyek: <Velemenyek s={adat} />,
    boltunk: <Boltunk s={adat} />,
  }

  return megjeleno(tartalom?.blocks).map((kulcs) => (
    <div key={kulcs} data-homepage-block={kulcs}>
      {savok[kulcs]}
    </div>
  ))
}

/**
 * A KEZDOLAP SAVJAI A REKORDBOL, SZERVEROLDALON. A sorrend es a lathatosag az
 * OS-bol jon (`blocks`, nautilus 36013): a lista sorrendje a megjelenes
 * sorrendje, a `visible: false` blokk nem rajzolodik; `null`/hiany: a terv
 * sorrendje, minden latszik. Minden blokk sajat gyokerelemen viszi a
 * `data-homepage-block` jelolot, amire az elo elonezet kattintasa es a
 * kijeloles epul. Az elo elonezet (kliensoldal) a `savokElemei`-t hasznalja.
 */
export async function KezdolapSavok({
  tartalom,
  countryCode,
}: {
  tartalom: KezdolapTartalom | null
  countryCode: string
}) {
  const adat = kezdolapAdat(tartalom)
  return (
    <>
      {savokElemei(
        tartalom,
        <EgyediKorallok
          s={adat}
          handles={tartalom?.featured_handles ?? []}
          countryCode={countryCode}
        />,
      )}
    </>
  )
}
