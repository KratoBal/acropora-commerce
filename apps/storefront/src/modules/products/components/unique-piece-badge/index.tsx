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
