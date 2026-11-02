import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"

import {
  SHOP_ADDRESS,
  SHOP_HOURS,
  SPLIT_LEAD,
  SPLIT_PAYMENT,
  SPLIT_PICKUP,
  SPLIT_REASON,
  SPLIT_TITLE,
  type SplitFizetes,
} from "./pickup-notice"

/**
 * A KÉT RENDELÉS SÁVJA A KOSÁRBAN (P4-2). A mondatok és a döntések a
 * `pickup-notice.ts`-ben állnak; itt a kirajzolás van, a szövegek kulcsok.
 */
export default function SplitNotice({
  lines,
  visible = true,
  fizetes = null,
  countryCode,
}: {
  lines: readonly string[]
  visible?: boolean
  fizetes?: SplitFizetes
  countryCode: string
}) {
  if (!visible) return null
  const t = translator(localeOf(countryCode))

  return (
    <section
      className="flex flex-col gap-2 border border-acr-line bg-acr-mist p-[18px]"
      data-testid="split-notice"
    >
      <span className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-ocean">
        {t(SPLIT_TITLE)}
      </span>
      <p
        className="text-[16px] font-medium leading-[26px] text-acr-ink"
        data-testid="split-notice-lead"
      >
        {t(SPLIT_LEAD)}
      </p>
      <p className="text-[14px] leading-[22px] text-acr-slate">
        {t(SPLIT_REASON)} {t(SPLIT_PICKUP)}
      </p>
      <p
        className="text-[14px] leading-[22px] text-acr-slate"
        data-testid="split-notice-payment"
      >
        {t(SPLIT_PAYMENT[fizetes ?? "nincs"])}
      </p>
      {lines.length > 0 && (
        <ul
          className="list-disc pl-5 text-[14px] leading-[22px] text-acr-slate"
          data-testid="split-notice-lines"
        >
          {lines.map((cim) => (
            <li key={cim}>{t("cartPage.splitLine", { name: cim })}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-x-7 gap-y-1 text-[14px] leading-[22px] text-acr-ink">
        <span>{SHOP_ADDRESS}</span>
        <span>{t(SHOP_HOURS)}</span>
      </div>
    </section>
  )
}
