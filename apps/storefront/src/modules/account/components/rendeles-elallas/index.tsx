"use client"

import { submitOwnWithdrawal } from "@lib/data/own-withdrawal"
import { translator } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import type { GuestWithdrawal } from "@lib/util/guest-order"
import { withdrawableItems } from "@lib/util/withdrawal"
import WithdrawalForm, {
  type WithdrawalItem,
} from "@modules/guest-order/components/withdrawal-form"
import WithdrawalList from "@modules/guest-order/components/withdrawal-list"
import { Button } from "@modules/common/components/ui"
import { useState } from "react"

/**
 * THE SIGNED-IN CUSTOMER'S WITHDRAWAL (V0.3): the same two-step form as the guest page, sent with the session to the
 * customer's own order route.
 *
 * `liveAnimal`: the order holds a live animal (the shop's answer). Whether the right applies to a live animal is the
 * owner's and the lawyer's question, so the legal placeholder stands instead of the button, as on the guest page.
 * The declarations come from the shop when the page is drawn and from its answer to each new one.
 */
export default function RendelesElallas({
  orderId,
  orderNumber,
  items,
  liveAnimal,
  initialWithdrawals = [],
}: {
  orderId: string
  orderNumber: string
  items: WithdrawalItem[]
  liveAnimal: boolean
  /** the declarations the shop already holds for the order (read when the page was drawn) */
  initialWithdrawals?: GuestWithdrawal[]
}) {
  const t = translator(useLocale())
  const [open, setOpen] = useState(false)
  const [withdrawals, setWithdrawals] =
    useState<GuestWithdrawal[]>(initialWithdrawals)
  if (items.length === 0) return null
  const offered = withdrawableItems({ items, withdrawals })
  return (
    <section
      className="flex flex-col gap-3 border border-acr-line bg-acr-white p-[14px] small:p-[18px]"
      data-testid="rendeles-elallas"
    >
      <WithdrawalList
        orderNumber={orderNumber}
        withdrawals={withdrawals}
        items={items}
      />
      {liveAnimal ? (
        <p
          className="text-[13px] text-acr-slate"
          data-testid="rendeles-elallas-elo-allat"
        >
          {t("guestOrder.withdrawal.liveAnimal")}
        </p>
      ) : open ? (
        <WithdrawalForm
          orderNumber={orderNumber}
          items={offered}
          submit={(declaration) =>
            submitOwnWithdrawal({ orderId, ...declaration })
          }
          onFiled={(list) => list && setWithdrawals(list)}
          onClose={() => setOpen(false)}
        />
      ) : offered.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen(true)}
          data-testid="rendeles-elallas-nyito"
        >
          {t("guestOrder.withdrawal.openButton")}
        </Button>
      ) : null}
    </section>
  )
}
