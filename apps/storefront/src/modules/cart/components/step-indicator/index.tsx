import { translator, type Key } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"

/** A három lépés szótár-kulcsai, sorrendben: kosár, adatok, fizetés. */
export const CART_STEPS: readonly Key[] = [
  "cartPage.stepCart",
  "cartPage.stepDetails",
  "cartPage.stepPayment",
]

/**
 * A LÉPÉSJELZŐ. Mobilon egy sor ("1 / 3 · Kosár"), asztalon a három lépés
 * egymás mellett; az aktuális lépés sötét, a többi halvány.
 */
export default function StepIndicator({
  active = 0,
  countryCode,
}: {
  active?: number
  countryCode: string
}) {
  const t = translator(localeOf(countryCode))

  return (
    <div className="flex flex-col gap-1" data-testid="cart-step-indicator">
      <span className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate small:hidden">
        {t("cartPage.stepOf", {
          current: active + 1,
          total: CART_STEPS.length,
          name: t(CART_STEPS[active]),
        })}
      </span>
      <ol
        aria-label={t("cartPage.stepsLabel")}
        className="hidden items-center gap-2 small:flex"
      >
        {CART_STEPS.map((lepes, i) => (
          <li key={lepes} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-acr-line">
                /
              </span>
            )}
            <span
              className={
                i === active
                  ? "text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-ink"
                  : "text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate"
              }
              aria-current={i === active ? "step" : undefined}
            >
              {t(lepes)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
