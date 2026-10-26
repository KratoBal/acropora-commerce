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
 * A KEZDOLAP SAVJAI A REKORDBOL, EGY HELYEN. A valodi kezdolap es az OS elo
 * elonezete UGYANEZT a komponenst rajzolja (elonezet-protokoll v1: "ugyanazt
 * a kezdolap-komponenst rajzolja, mint a valodi kezdolap, a kapott rekordbol"),
 * ezert nem lehet a ketto kozott elteres.
 *
 * A SORREND ES A LATHATOSAG AZ OS-BOL JON (`blocks`, nautilus 36013): a lista
 * sorrendje a megjelenes sorrendje, a `visible: false` blokk nem rajzolodik.
 * `null`/hiany: a terv sorrendje, minden latszik. Minden blokk sajat
 * gyokerelemen viszi a `data-homepage-block` jelolot, amire az elo elonezet
 * kattintasa es a kijeloles epul.
 */
export async function KezdolapSavok({
  tartalom,
  countryCode,
}: {
  tartalom: KezdolapTartalom | null
  countryCode: string
}) {
  const adat = kezdolapAdat(tartalom)
  const { szoveg, minta, diak } = adat
  const tenyek = [1, 2, 3].map((n) => ({
    cim: szoveg(`hero.tenyek.${n}.cim`),
    szoveg: szoveg(`hero.tenyek.${n}.szoveg`),
    minta: minta(`hero.tenyek.${n}.cim`) || minta(`hero.tenyek.${n}.szoveg`),
  }))

  const savok: Record<BlokkKulcs, React.ReactNode> = {
    hero: <HeroCsuszka diak={diak} tenyek={tenyek} />,
    "mit-keresel": <MitKeresel s={adat} />,
    "kezdo-es-halado": <KezdoEsHalado s={adat} />,
    "egyedi-korallok": (
      <EgyediKorallok
        s={adat}
        handles={tartalom?.featured_handles ?? []}
        countryCode={countryCode}
      />
    ),
    szolgaltatasok: <Szolgaltatasok s={adat} />,
    markak: <Markak s={adat} />,
    velemenyek: <Velemenyek s={adat} />,
    boltunk: <Boltunk s={adat} />,
  }

  return (
    <>
      {megjeleno(tartalom?.blocks).map((kulcs) => (
        <div key={kulcs} data-homepage-block={kulcs}>
          {savok[kulcs]}
        </div>
      ))}
    </>
  )
}
