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
        style={{ color: "var(--terv-kiemel)" }}
      >
        {PICKUP_TITLE}
      </span>
      <p className="text-[15px] font-semibold">{PICKUP_LEAD}</p>
      <p
        className="text-[12.5px] leading-relaxed"
        style={{ color: "var(--terv-szoveg-halvany)" }}
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

      <p className="text-[12.5px]" style={{ color: "var(--terv-szoveg)" }}>
        {SHOP_ADDRESS} · {SHOP_HOURS}
      </p>
      <p
        className="text-[11px]"
        style={{ color: "var(--terv-szoveg-halvany)" }}
      >
        {HOLD_PROMISE}
      </p>
    </section>
  )
}
