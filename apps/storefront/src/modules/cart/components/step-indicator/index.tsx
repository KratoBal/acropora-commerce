import { clx } from "@modules/common/components/ui"

/**
 * A HÁROM LÉPÉS, AHOGY A TERVBEN ÁLL: KOSÁR — ADATOK — FIZETÉS.
 *
 * A vevő ebből tudja meg, HOL TART, és hogy a fizetés nem a következő
 * kattintás. A tervben a mobil változat egy rövid alakot is mutat
 * („1 / 3 · KOSÁR"), ezért az is itt áll -- ugyanabból az adatból, nem külön
 * beírva, mert két helyre írt lépésszám külön romlik el.
 *
 * TISZTA MEGJELENÍTÉS: nem tudja, melyik oldalon áll, csak azt, hogy hányadik
 * lépés aktív. Így a fizetési menet további lapjai is használhatják.
 */
export const CART_STEPS = ["Kosár", "Adatok", "Fizetés"] as const

export default function StepIndicator({
  active = 0,
}: {
  /** Hányadik lépés aktív, nullától. */
  active?: number
}) {
  return (
    <div className="flex flex-col gap-1" data-testid="cart-step-indicator">
      <span
        className="text-[10.5px] font-semibold uppercase tracking-wide small:hidden"
        style={{ color: "var(--terv-szoveg-halvany)" }}
      >
        {active + 1} / {CART_STEPS.length} · {CART_STEPS[active]}
      </span>
      <ol className="hidden small:flex items-center gap-2">
        {CART_STEPS.map((lepes, i) => (
          <li key={lepes} className="flex items-center gap-2">
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                —
              </span>
            )}
            <span
              className={clx(
                "text-[11px] font-semibold uppercase tracking-wide",
                i === active ? "" : "opacity-60",
              )}
              style={{
                color:
                  i === active
                    ? "var(--terv-szoveg)"
                    : "var(--terv-szoveg-halvany)",
              }}
              aria-current={i === active ? "step" : undefined}
            >
              {lepes}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
