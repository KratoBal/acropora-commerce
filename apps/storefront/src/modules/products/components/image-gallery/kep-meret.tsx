import { HttpTypes } from "@medusajs/types"

/**
 * A NAGY KEP SZELESSEGE, ES A TOBBI KEP ALATTA -- EGY HELYEN, KET HIVONAK.
 *
 * Balazs kerese (2026-09-09): "a kep meretezese? a tobbi kep a nagy kep ala
 * kicsiben?"
 *
 * === A MERES, AMIBOL A SZAM JON ===
 *
 * A kitelepitett termeklapon, 1440 pixeles ablakban (2026-09-09 12:09):
 *
 *     bal oszlop           856 px szeles
 *     jobb panel           452 x 496
 *     nagy kep (elo allat) 694 x 814   -- 318 pixellel MAGASABB az EGESZ panelnal
 *     nagy kep (technikai) 822 x 514
 *
 * A panaszt ez a ket sor mondja ki: a kep egymaga nagyobb, mint a mellette allo
 * teljes vasarlasi panel.
 *
 * === A SZAM VALASZTOTT, DE NEM TALALGATOTT: 452 ===
 *
 * A jobb panel szelessege. Ezzel a ket oszlop fo eleme AZONOS szeles, es a
 * magassaguk is egymas melle kerul:
 *
 *     elo allat   452 x 530   (29/34 arany)   a panel 496
 *     technikai   452 x 283   (16/10 arany)
 *
 * MIERT NEM A TERVBOL VETTEM: megneztem, es a terv az ELLENKEZOT mutatja. A
 * tervlapon a nagy foto meg szelesebb (kb. 780 pixel a 1440-es vasznon), tehat
 * a terv ezt a kerest nem tamogatja -- Balazs mast ker, mint ami ott all. Ezert
 * a szam nem meres eredmenye, hanem VALASZTAS, egyetlen mert horgonnyal: a
 * panel szelessege. Ha rossz, egyetlen szam cserelodik.
 *
 * === MOBILON NEM KOT ===
 *
 * `w-full max-w-[452px]`: a toresrpont alatt a kep TOVABBRA IS teljes
 * szelessegu (egy 375 pixeles telefonon 375), mert a korlat csak akkor lep
 * eletbe, ha van hova. A bolyegkep-sor tord, nem gorget.
 */
export const NAGY_KEP_MAX = 452

/** A bolyegkep oldala. Nyolc fer ki a 452 pixeles savba, 8 pixeles kozzel. */
export const BOLYEGKEP = 48

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
      className="flex flex-wrap gap-2"
      style={{ maxWidth: `${NAGY_KEP_MAX}px` }}
      data-testid="tovabbi-kepek"
    >
      {kepek.map((kep, i) =>
        kep.url ? (
          <img
            key={kep.id ?? i}
            src={kep.url}
            alt=""
            width={BOLYEGKEP}
            height={BOLYEGKEP}
            className="border object-cover"
            style={{
              width: `${BOLYEGKEP}px`,
              height: `${BOLYEGKEP}px`,
              borderColor: "var(--terv-keret)",
            }}
            data-testid="tovabbi-kep"
          />
        ) : null,
      )}
    </div>
  )
}
