"use client"

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
 * === EGY BEKEZDES, AMI ELAVULT, ES EZERT AT VAN IRVA ===
 *
 * Itt korabban az allt, hogy a tervlap elso csempejenek NARANCS KERETE
 * (a kivalasztott kep jelolese) szandekosan nem epul meg, mert a galeria nem
 * interaktiv, es egy kivalasztas-keret mukodo valtas nelkul rosszabb a
 * hianyanal.
 *
 * AZ AKKOR IGAZ VOLT, MA MAR NEM: a sor 2026-09-09 ota cserel nagy kepet
 * (#297), es a keret vele egyutt bekerult -- mind a ket kep-uton. Az indok
 * tehat nem dolt meg, hanem TELJESULT: eloszor a valtas keszult el, es utana
 * a jeloles.
 *
 * Ami a listabol MEGMARADT: az utolso csempe "VIDEO" felirata. Ahhoz video-
 * forras kell, es olyan mezonk nincs.
 */
/** A nagy kep ASZTALI aranya a tervlaprol, kiirva a helyorzore. */
export const KEP_ARANY = "16 / 10"

/**
 * A NAGY KEP ARANYA TELEFONON NEGYZETES, ASZTALIN 16:10.
 *
 * A tervlap mobil kerete (390 pixel) `aspect-ratio:1` erteket ad a fotonak,
 * az asztali 16:10 helyett. picasso leirasa szerint ez az EGYETLEN szerkezeti
 * mobil-sajatossag a lapon: minden mas mobil elem egy-egy asztali elem
 * tomoritett vagy atfogalmazott valtozata.
 *
 * === MIERT OSZTALY, ES NEM BEAGYAZOTT STILUS ===
 *
 * A beagyazott `style` nem ismer torespontot -- ugyanaz a korlat, amit a
 * `tailwind.config.js` a lebegtetett szoveg-szineknel mar leir. Egy
 * torespont-fuggo ertek tehat CSAK osztalykent irhato le.
 *
 * === A TORESPONT NEM TALALGATAS ===
 *
 * `lg` (1024 pixel): ott valt MAGA A TERMEKLAP egy oszlopbol kettobe
 * (`lap-vaz/index.tsx`). Ugyanaz a hatar, amit a lap mar hasznal, nem egy
 * masodik "mobil" fogalom.
 *
 * === A KEP MAGA NEM VAGODIK ===
 *
 * A foto `objectFit: contain` modban all (Balazs dontese, 2026-09-09), tehat
 * a negyzetes doboz NEM vag bele a kepbe: a kep beleillik, es a maradek sav
 * a lap foldjet viseli. A negyzetes arany telefonon tehat tobb FUGGOLEGES
 * helyet ad ugyanannak a kepnek, nem kevesebb kepet.
 */
export const KEP_ARANY_OSZTALY = "aspect-square lg:aspect-[16/10]"

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
/**
 * A KIVALASZTOTT CSEMPE KERETE A TERVBOL JON.
 *
 * A tervlapon a sor ELSO csempeje `border:2px solid <rez>` erteket visel, a
 * tobbi keret nelkul all -- vagyis a KIVALASZTOTT allapot ki van rajzolva.
 * Nem dontes kerdese tehat, hogy legyen-e valasztas: a terv mutatja.
 *
 * A rez itt FELULET-szerepben all (keret), nem szovegben, ezert a
 * `--terv-kiemel` a helyes token, nem a `-tinta`.
 */
const KIVALASZTOTT_KERET = "2px solid var(--terv-kiemel)"
const KERET = "1px solid var(--terv-keret)"

export const TovabbiKepek = ({
  kepek,
  kivalasztott,
  onValaszt,
}: {
  kepek: HttpTypes.StoreProductImage[]
  /** Melyik csempe all kivalasztva. Kezelo nelkul nincs ertelme. */
  kivalasztott?: number
  /**
   * HA NINCS KEZELO, A SOR UGYANAZ MARAD, AMI EDDIG VOLT.
   *
   * A MASIK kep-ut (`Foto` a `lap-vaz/valodi-tartalom.tsx`-ben) SZERVER
   * komponens, es nem tud fuggvenyt atadni. Ott a sor egyelore nem
   * kattinthato -- az indoklas a `image-gallery/index.tsx` fejleceben all,
   * es kulon tetel.
   */
  onValaszt?: (index: number) => void
}) => {
  if (kepek.length === 0) return null

  return (
    <div
      className="grid grid-cols-3 gap-2.5 lg:grid-cols-6"
      data-testid="tovabbi-kepek"
    >
      {kepek.map((kep, i) => {
        if (!kep.url) return null

        const kivalasztva = kivalasztott === i
        const kepElem = (
          <img
            src={kep.url}
            alt=""
            className="aspect-square w-full object-cover"
            data-testid="tovabbi-kep"
          />
        )

        return onValaszt ? (
          <button
            key={kep.id ?? i}
            type="button"
            onClick={() => onValaszt(i)}
            aria-label={`${i + 1}. fotó megjelenítése`}
            aria-current={kivalasztva ? "true" : undefined}
            className="block w-full"
            style={{ border: kivalasztva ? KIVALASZTOTT_KERET : KERET }}
            data-testid="tovabbi-kep-gomb"
          >
            {kepElem}
          </button>
        ) : (
          <span
            key={kep.id ?? i}
            className="block w-full"
            style={{ border: KERET }}
          >
            {kepElem}
          </span>
        )
      })}
    </div>
  )
}
