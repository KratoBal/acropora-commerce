import {
  HOLD_PROMISE,
  PICKUP_LEAD,
  PICKUP_REASON,
  PICKUP_TITLE,
  SHOP_ADDRESS,
  SHOP_HOURS,
} from "./pickup-notice"

/**
 * AZ ÁTVÉTELI SÁV (Balázs terve, kosar-2026-09-07).
 *
 * A HANGNEME TÉNYKOZLÉS, NEM TILTÁS, és ez nem stílus: a vevő nem hibázott,
 * amikor élő állatot tett a kosárba. Egy piros figyelmeztető sáv azt üzenné,
 * hogy valamit rosszul csinált.
 *
 * ÉS MEGNEVEZI A TÉTELT. A terv kikötése szerint nem szabad csendben elszürkíteni
 * a másik két szállítási módot: a vevő lássa, MELYIK tétel miatt van így. Ezért
 * kap a doboz nevet, nem darabszámot.
 */
export default function PickupNotice({
  lines,
  visible = true,
}: {
  lines: readonly string[]
  /**
   * MEGJELENJEN-E EGYALTALAN.
   *
   * Kulon a `lines` listatol, es ez a hataresetrol szol: ha a hatteroldal
   * PICKUP_ONLY osztalyt mond, de a sort nem talaljuk a kosarban, a korlatozas
   * akkor is VALOS -- csak a megnevezes hianyzik. A savot ilyenkor is
   * megmutatjuk, mert egy elhallgatott korlatozas a fizetesnel derulne ki.
   */
  visible?: boolean
}) {
  if (!visible) return null

  return (
    <section
      className="flex flex-col gap-2 p-4 border"
      style={{
        borderColor: "var(--terv-keret-meleg)",
        background: "var(--terv-hatter-lap)",
      }}
      data-testid="pickup-notice"
    >
      <span
        className="text-[10.5px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--terv-kiemel-tinta)" }}
        data-testid="pickup-notice-cimke"
      >
        {PICKUP_TITLE}
      </span>
      <p className="text-[15px] font-semibold">{PICKUP_LEAD}</p>
      {/*
        A SZERIF FELTETEL NELKUL ALL -- ugyanaz a meres es ugyanaz a fenntartas,
        mint a `line-state` egyedi-igeretenel, es a ket hely EGYUTT mozdul.

        A terv 3a lapjan ez a bekezdes ketszer all: a 390-es mobil kereten
        belul orokolt betuvel 13.5px-en, az 1440-es asztalin Newsreaderrel
        17px-en.

        KORABBAN `small:` TORESPONTHOZ VOLT KOTVE, ket olvasat kozott valasztva:
        (A) szandekos, mert keskeny hasabban a dolt szerif rosszul olvas, vagy
        (B) elavult, mert a 3a mobil kerete a legkorabbi nezet. A toresponthoz
        kotes mind a ketto alatt helyes volt.

        PICASSO CAFOLTA AZ (A)-T, MERESSEL: a tervben van egy MASODIK 390 pixeles
        keret is, az "Ures kosar" allapote (796470-802959), es abban Newsreader
        szerif fut UGYANEBBEN A SZEREPBEN (dolt, leiro bekezdes, h1 alatt,
        16,5px). Ha a keskeny hasab olvashatosaga lenne az ok, annak is kerulnie
        kellene a szerifet. Nem keruli.

        A CAFOLAT HATARA, ES EZT KI KELL MONDANI: ez azt zarja ki, hogy a
        SZELESSEG lenne az ok. Azt NEM bizonyitja, miert maradt le a frissites a
        3a mobil kereterol -- csak azt, hogy nem a hasab szelessege miatt.

        A MERETET NEM VESZEM AT ebben a korben, es ezt kimondom: nalunk 12.5px
        all, ami sem a mobil 13.5-nek, sem az asztali 17-nek nem felel meg. Az
        kulon mert elteres, kulon kerdessel (melyik nezet a mienk), es egy
        betu-bekotes ne vigye el csendben.
      */}
      <p
        className="text-[12.5px] leading-relaxed font-kiemelt"
        style={{
          color: "var(--terv-szoveg-halvany)",
        }}
        data-testid="pickup-notice-indok"
      >
        {PICKUP_REASON}
      </p>

      {/*
        A TETELEK NEVVEL. Egy darabszam ("2 tetel miatt") nem elég: a vevo abbol
        nem tudja, MIT kellene kivennie, ha meg akarja kapni postan a tobbit.
      */}
      {/*
        A LISTA ELMARAD, HA NINCS MIT MEGNEVEZNI -- de a sav marad. Egy ures
        felsorolas ugy nezne ki, mintha elfelejtettuk volna kitolteni.
      */}
      {lines.length > 0 && (
        <ul
          className="text-[12.5px] leading-relaxed list-disc pl-5"
          style={{ color: "var(--terv-szoveg-halvany)" }}
          data-testid="pickup-notice-lines"
        >
          {lines.map((cim) => (
            <li key={cim}>{cim} · élő állat, csak boltban adjuk át</li>
          ))}
        </ul>
      )}

      {/*
        A HAROM ELEM EGY SORBAN, EGYFORMA SULLYAL (acrobot dontese, msg 15411).

        === MI VOLT ELOTTE, ES MIERT NEM CSAK MERET-KERDES ===

        A cim es a nyitvatartas egy 12.5 pixeles bekezdesben allt `--terv-szoveg`
        szinnel, a tartas-mondat kulon, 11 pixelen, HALVANY szinnel. Nalunk tehat
        a tartas HALKABB volt a masik kettonel.

        A tervben mind a harom EGY SOR harom egyenrangu eleme (13.5px, 28 pixel
        koz, egyetlen szin). Vagyis ma azt uzentuk, hogy a tartas mellekes
        reszlet; a terv szerint ugyanolyan fontos, mint hogy HOL vagyunk es
        MIKOR. Egy elo allatot vasarlo vevonek az utobbi a helyes.

        === A MERET A TERV UGYANAZON ELEMEBOL JON, MINT A KEZELES ===

        13.5 pixel, es nem a mi 11-unk vagy 12.5-unk. A kikotes acrobote volt, es
        az indoka all: ha csak a meret megy at es a kezeles marad a mienk, egy
        hibrid keletkezik, ami egyikre sem hasonlit.

        A tervbeli HAROM elofordulasbol ezt valasztottuk, mert a HELY dont, nem a
        meret: ez az egyetlen, ami a fo (856 pixeles) oszlopban all. A masik
        ketto a jobb oldali osszegzo panelben es a keskeny valtozatban.

        === AMIT SZANDEKOSAN NEM VESZUNK AT: A SZIN ===

        A terv itt `oklch(0.42 0.012 60)` erteket ad, a mi `--terv-szoveg-halvany`
        tokenunk 0.5. Merve a vilagos lap masodlagos szoveg-csaladjan: 0.42
        kilencszer, 0.45 tizenegyszer, 0.46 tizenketszer, 0.48 hatszor, 0.5
        TIZENHETSZER. A mi ertekunk a csalad MODUSZA, a 0.42 egy tagja.

        Egy uj token ebbol a terv SZORASAT masolna at, nem a tervet.
      */}
      <div
        className="flex flex-wrap gap-x-7 gap-y-1 text-[13.5px]"
        style={{ color: "var(--terv-szoveg-halvany)" }}
        data-testid="pickup-notice-sor"
      >
        <span>{SHOP_ADDRESS}</span>
        <span>{SHOP_HOURS}</span>
        <span>{HOLD_PROMISE}</span>
      </div>
    </section>
  )
}
