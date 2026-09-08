import { UNIQUE_PIECE_PROMISE } from "../stock-state/availability"

/**
 * "1 DB · EGYEDI PÉLDÁNY" -- A WYSIWYG-ÍGÉRET, KIMONDVA.
 *
 * E nélkül a vevő nem tudja, hogy a fotó pontosan azt a példányt mutatja, amit
 * kap. Ez az élő állat lapjának a lényege, és csendben romlik el nélküle: a lap
 * ugyanúgy néz ki, csak az ígéret nem hangzik el.
 *
 * A jelvény a kép BAL FELSŐ sarkában áll (picasso rajza szerint), tehát a
 * befoglaló elemnek `relative`-nek kell lennie. A tervben ugyanez all,
 * abszolut poziciovall a kepen (top/left 18px) -- vagyis a jelveny
 * SZERKEZETILEG a kephez tartozik, nem a vasarlasi reszhez.
 *
 * === SZOGLETES, NEM PIRULA -- ES EZ MERES ===
 *
 * A `rounded-full` a starter szokasa volt, nem a terve. Nautilus a tervfajlbol
 * merte (2026-09-07): a teljes tervben HUSZONEGY `border-radius` all, ebbol 16
 * darab `50%` (valodi korok), 2 darab `8px`, 1 darab `6px` -- es a jelveny
 * EGYIKBEN SINCS BENNE. A tervbeli jelvenyen nincs lekerekites egyaltalan.
 *
 * (A "pirula stimmel a terv tizenhat korehez" ervet ez cafolja: az a tizenhat
 * MASHOL van, es a jelveny nem tartozik hozzajuk.)
 *
 * === AMI MEG NEM VALTOZOTT, ES MIERT ===
 *
 * A tervben a jelveny REZ hatteren all, SOTET szoveggel
 * (`--terv-kiemel-szoveg`, merve mind az ot rez-hatteru elemen). A mai
 * valtozat sotet pirulan all, borostyan szoveggel.
 *
 * A ketto EGYUTT mozdul vagy sehogy: a sotet szoveg a mai sotet hatteren
 * olvashatatlan lenne.
 *
 * ES A "MELYIK REZ-TOKEN" KERDES AZOTA MEGSZUNT, NEM MEGOLDODOTT. Itt korabban
 * az allt, hogy ez ma nem eldontheto, mert ket rez-valtozo letezett, es a
 * `globals.css` kommentje az egyikrol mast sugallt, mint amit a sotet blokk
 * tett ra. A ket valtozo 2026-09-08-tol EGY: a sotet blokkban a `--terv-kiemel`
 * erteke `oklch(0.62 0.13 45)`, ami PONTOSAN a tervbeli jelveny hattere.
 *
 * Vagyis a jelveny a helyes szint kapna anelkul, hogy barmi kulonlegeset
 * kellene ra irni -- de a valtas MAGA meg nem tortent meg, mert a hatter es a
 * szoveg egyutt mozdul, es az acrobot dontese.
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
        "absolute left-3 top-3 z-10 bg-neutral-900/85 px-3 py-1 " +
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
