import { UNIQUE_PIECE_PROMISE } from "../stock-state/availability"

/**
 * "1 DB · EGYEDI PÉLDÁNY" -- A WYSIWYG-ÍGÉRET, KIMONDVA.
 *
 * E nélkül a vevő nem tudja, hogy a fotó pontosan azt a példányt mutatja, amit
 * kap. Ez az élő állat lapjának a lényege, és csendben romlik el nélküle: a lap
 * ugyanúgy néz ki, csak az ígéret nem hangzik el.
 *
 * A jelvény a kép BAL FELSŐ sarkában áll (picasso rajza szerint), tehát a
 * befoglaló elemnek `relative`-nek kell lennie.
 *
 * TISZTA MEGJELENÍTÉS: nincs adatlekérése és nem tudja, melyik lapon áll --
 * ezért használható a műszaki lapon is, ha ott valaha kell.
 */
export default function UniquePieceBadge({
  className = "",
}: {
  className?: string
}) {
  return (
    <span
      data-testid="unique-piece-badge"
      className={
        "absolute left-3 top-3 z-10 rounded-full bg-neutral-900/85 px-3 py-1 " +
        "text-xs font-semibold uppercase tracking-wide text-amber-200 " +
        "shadow-sm backdrop-blur-sm " +
        className
      }
    >
      1 db · Egyedi példány
    </span>
  )
}

/**
 * A JELVÉNY MELLÉ TARTOZÓ MONDAT, A KÉP ALATT (picasso terve, 2026-09-07).
 *
 * Külön komponens, mert MÁSHOL áll: a jelvény a képen belül, ez a kép alatt.
 * Egy komponensbe téve az egyik a másik pozicionálását örökölné.
 *
 * "Ha ez az egy mondat lemarad, a jelvény önmagában félreérthető marad."
 */
export function UniquePiecePromise({ className = "" }: { className?: string }) {
  return (
    <p
      data-testid="unique-piece-promise"
      className={"text-xs leading-relaxed " + className}
      style={{ color: "var(--terv-szoveg-halvany)" }}
    >
      {UNIQUE_PIECE_PROMISE}
    </p>
  )
}
