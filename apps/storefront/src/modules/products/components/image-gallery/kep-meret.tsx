import { HttpTypes } from "@medusajs/types"

/**
 * A KEP-BLOKK MERETEZESE, ES A SZAMOK A TERVLAPROL JONNEK.
 *
 * === ITT KORABBAN EGY VALASZTOTT SZAM ALLT (452), ES AZT LECSERELTE A TERV ===
 *
 * Az elso valtozatomban a nagy kepet 452 pixelre korlatoztam, a jobb panel
 * szelessegere. Ki is mondtam, hogy az VALASZTAS, nem meres: nem volt tervlap,
 * amire hivatkozhattam volna. Azota Balazs KULDOTT egyet
 * (`exchange/tervlap-kepblokk-2026-09-09.png`), es az mast mond. A tervlap
 * dont, nem az en horgonyom.
 *
 * === AMIT A TERVLAP MOND, ES MIERT NEM BECSLES ===
 *
 * A kepen a helyorzo KOZEPERE oda van irva: "SAJAT FOTO -- EZ A PELDANY,
 * 16:10". Az aranyt tehat nem meregettem, ki van irva.
 *
 * A GEOMETRIAT viszont megmertem a kepen, es kiderult, hogy a mai
 * elrendezesunkkel BETURE egyezik. A tervlapon a tartalom szelessegehez kepest:
 *
 *     nagy kep      63.4 %        nalunk a bal oszlop   856 / 1352 = 63.3 %
 *     koz            3.3 %        nalunk                 44 / 1352 =  3.3 %
 *     jobb panel    33.3 %        nalunk                452 / 1352 = 33.4 %
 *
 * Vagyis a nagy kep NEM kisebb doboz a bal oszlopon belul: KITOLTI a bal
 * oszlopot, es a "kisebb" az ARANYBOL jon. Ma az elo allat galeriaja 29/34
 * allo kepet rajzol, 814 pixel magasat; 16:10-ben ugyanaz a szelesseg 535
 * pixelt ad. Ez 279 pixellel alacsonyabb, es a panel (496) melle kerul.
 *
 * === A BOLYEGKEP-SOR ===
 *
 * A tervlapon HAT csempe all egy sorban, EGYENLO szelesseggel, es a sor a nagy
 * kep szelesseget tolti ki. A csempek majdnem negyzetesek: a kepen merve
 * 195 x 186 pixel, vagyis 1.048 arany -- ezert `aspect-square`, ami ezen belul
 * van, es nem hoz be egy uj, hamis pontossagu szamot.
 *
 * MOBILON HAROM OSZLOP, nem hat: egy 375 pixeles telefonon hat csempe
 * egyenkent 55 pixel lenne, ami mar nem mutat meg semmit a kepbol. A sor tehat
 * NEM gorget es NEM zsugorodik olvashatatlanra, hanem kevesebb oszlopot hasznal.
 *
 * === AMI A TERVLAPON LATSZIK, ES SZANDEKOSAN NEM EPUL MEG ===
 *
 * Az elso csempen NARANCS KERET all (a kivalasztott kep jelolese), az
 * utolson pedig "VIDEO" felirat. Mind a ketto INTERAKCIOT iger: hogy a
 * csempere kattintva valt a nagy kep. A galeria ma nem interaktiv, es acrobot
 * kikotese szerint ez a kor a MERETEZESROL szol.
 *
 * Egy kivalasztas-keret mukodo valtas nelkul rosszabb a hianyanal: kattinthatonak
 * latszik, es nem tortenik semmi. Ezert nem kerult be -- nem felejtes.
 */
/** A nagy kep aranya a tervlaprol, kiirva a helyorzore. */
export const KEP_ARANY = "16 / 10"

/** Hany csempe all egy sorban: asztalon hat (tervlap), telefonon harom. */
export const BOLYEGKEP_OSZLOP = 6
export const BOLYEGKEP_OSZLOP_MOBIL = 3

/**
 * A TOBBI KEP, A NAGY ALATT, KICSIBEN.
 *
 * URES LISTANAL NEM RENDEL SEMMIT, es ez nem apro reszlet: a teszt bolton
 * merve a szaz termekbol HATVANEGYNEK pontosan EGY kepe van. Vagyis a
 * termekek tobbsegen ez a sor MEG SEM JELENIK MEG -- egy ures, de meglevo sav
 * ott helyet foglalna es semmit nem mondana.
 */
export const TovabbiKepek = ({
  kepek,
}: {
  kepek: HttpTypes.StoreProductImage[]
}) => {
  if (kepek.length === 0) return null

  return (
    <div
      className="grid grid-cols-3 gap-2 lg:grid-cols-6"
      data-testid="tovabbi-kepek"
    >
      {kepek.map((kep, i) =>
        kep.url ? (
          <img
            key={kep.id ?? i}
            src={kep.url}
            alt=""
            className="aspect-square w-full border object-cover"
            style={{ borderColor: "var(--terv-keret)" }}
            data-testid="tovabbi-kep"
          />
        ) : null,
      )}
    </div>
  )
}
