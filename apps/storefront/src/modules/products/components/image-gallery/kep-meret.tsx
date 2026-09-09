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
 * A GEOMETRIAT viszont megmertem a kepen -- PIXEL-ESZKOZZEL, a nyers adatbol,
 * nem szemre. A hatter-szinbol kilepo savok hatarai a 800. sorban:
 *
 *     nagy kep      30 .. 1741    1712 pixel
 *     koz                          88 pixel
 *     jobb panel  1830 .. 2733     904 pixel
 *     tartalom      30 .. 2733    2704 pixel
 *
 * A TERVLAP A MI ELRENDEZESUNK PONTOS KETSZERESE:
 *
 *     2704 / 2 = 1352      a mi tartalmunk
 *     1712 / 2 =  856      a bal oszlop
 *       88 / 2 =   44      a koz
 *      904 / 2 =  452      a jobb panel
 *
 * Nem kozelito egyezes: mind a negy szam pontos. Az arany ugyanez:
 * 63.31 %, 3.25 %, 33.43 % -- a mienk betuere ugyanaz.
 *
 * Vagyis a nagy kep NEM kisebb doboz a bal oszlopon belul: KITOLTI a bal
 * oszlopot, es a "kisebb" az ARANYBOL jon. Ma az elo allat galeriaja 29/34
 * allo kepet rajzol, 814 pixel magasat; 16:10-ben ugyanaz a szelesseg 535
 * pixelt ad. Ez 279 pixellel alacsonyabb, es a panel (496) melle kerul.
 *
 * === A BOLYEGKEP-SOR ===
 *
 * A tervlapon HAT csempe all egy sorban, EGYENLO szelesseggel, es a sor a nagy
 * kep szelesseget tolti ki.
 *
 * A SZAMOK PIXEL-ESZKOZZEL, A KEP NYERS ADATABOL (2026-09-09), nem a
 * megjelenitett kockakbol: a hatter-szinbol kilepo savok hatarai a 1500. sorban
 *
 *     30..298, 319..586, 607..875, 896..1164, 1185..1452, 1473..1741
 *
 * Vagyis hat csempe 269 pixel szelessel, 21 pixeles kozokkel, es a sor a
 * 30..1741 savot tolti ki -- pontosan a nagy kep szelesseget.
 *
 * A tervlap a MI elrendezesunk ketszeres nagyitasa (lasd a geometriat lentebb),
 * tehat a koz nalunk 21/2 = 10.5 pixel. A Tailwind `gap-2.5` (10 pixel) ehhez a
 * legkozelebbi lepes; a fel pixel nem all elo egy racsban.
 *
 * A csempek majdnem negyzetesek (269 x 262, vagyis 1.027 arany), ezert
 * `aspect-square` -- ezen belul van, es nem hoz be egy uj, hamis pontossagu
 * szamot.
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
      className="grid grid-cols-3 gap-2.5 lg:grid-cols-6"
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
