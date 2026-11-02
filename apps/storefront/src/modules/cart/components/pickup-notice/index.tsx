import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"

import {
  HOLD_PROMISE,
  PICKUP_LEAD,
  PICKUP_REASON,
  PICKUP_TITLE,
  SHOP_ADDRESS,
  SHOP_HOURS,
} from "./pickup-notice"

/**
 * A BOLTI ÁTVÉTEL SÁVJA A KOSÁRBAN. A tartalmi döntések a `pickup-notice.ts`
 * fejlécében állnak; itt csak a kirajzolás van: a kezdőlap és a kategórialap
 * világos stílusában (`acr-` tokenek), a szövegek szótár-kulcsok.
 */
export default function PickupNotice({
  lines,
  visible = true,
  countryCode,
}: {
  lines: readonly string[]
  visible?: boolean
  countryCode: string
}) {
  if (!visible) return null
  const t = translator(localeOf(countryCode))

  return (
    <section
      className="flex flex-col gap-2 border border-acr-line bg-acr-mist p-[18px]"
      data-testid="pickup-notice"
    >
      <span
        className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-ocean"
        data-testid="pickup-notice-cimke"
      >
        {t(PICKUP_TITLE)}
      </span>
      <p className="text-[16px] font-medium leading-[26px] text-acr-ink">
        {t(PICKUP_LEAD)}
      </p>
      <p
        className="text-[14px] leading-[22px] text-acr-slate"
        data-testid="pickup-notice-indok"
      >
        {t(PICKUP_REASON)}
      </p>
      {lines.length > 0 && (
        <ul
          className="list-disc pl-5 text-[14px] leading-[22px] text-acr-slate"
          data-testid="pickup-notice-lines"
        >
          {lines.map((cim) => (
            <li key={cim}>{t("cartPage.pickupLine", { name: cim })}</li>
          ))}
        </ul>
      )}
      <div
        className="flex flex-wrap gap-x-7 gap-y-1 text-[14px] leading-[22px] text-acr-ink"
        data-testid="pickup-notice-sor"
      >
        <span>{SHOP_ADDRESS}</span>
        <span>{t(SHOP_HOURS)}</span>
        <span>{t(HOLD_PROMISE)}</span>
      </div>
    </section>
  )
}
