"use client"

import { translator } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import type { GuestWithdrawal } from "@lib/util/guest-order"

/**
 * THE ORDER'S WITHDRAWAL DECLARATIONS (V0.3), as the shop gives them back: the lines' titles, the day and the
 * reference. No name and no stage: nothing is promised about what follows. Empty list: nothing is drawn.
 */
export default function WithdrawalList({
  orderNumber,
  withdrawals,
  items,
}: {
  orderNumber: string
  withdrawals: GuestWithdrawal[]
  items: { id: string; title: string }[]
}) {
  const locale = useLocale()
  const t = translator(locale)
  if (withdrawals.length === 0) return null
  const day = new Intl.DateTimeFormat(locale === "hu" ? "hu-HU" : "en-GB", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: locale === "hu" ? "numeric" : "short",
    day: "numeric",
  })
  return (
    <div
      className="flex flex-col gap-y-1 text-[14px] text-acr-ink"
      data-testid={`withdrawals-${orderNumber}`}
    >
      <p className="text-[11px] font-bold tracking-[0.08em] text-acr-slate">
        {t("guestOrder.withdrawal.listTitle")}
      </p>
      <ul className="flex flex-col gap-y-2">
        {withdrawals.map((withdrawal) => (
          <li key={withdrawal.id} className="flex flex-col">
            <span>
              {withdrawal.item_ids
                .map((id) => items.find((item) => item.id === id)?.title)
                .filter(Boolean)
                .join(", ")}{" "}
              · {day.format(new Date(withdrawal.created_at))}
            </span>
            <span className="text-[13px] text-acr-slate">
              {t("guestOrder.withdrawal.listRef", { id: withdrawal.id })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
