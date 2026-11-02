"use client"

import { useTranslate } from "@lib/i18n/use-translate"
import { clx } from "@modules/common/components/ui"

import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import type { FizetesiSzerepValasz } from "@lib/data/payment"

const Review = ({
  cart,
  fizetesiSzerep,
}: {
  cart: HttpTypes.StoreCart
  /** Amivel a kosar fizet, a hatter szavaval. Lasd a gomb propjanak fejlecet. */
  fizetesiSzerep?: FizetesiSzerepValasz
}) => {
  const t = useTranslate()
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])
      ?.length > 0 &&
    cart?.total === 0
  )

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <section className="border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6">
      <div className="mb-4 flex flex-row items-center justify-between">
        <h2
          className={clx(
            "flex flex-row items-center gap-x-2 text-[22px] font-normal leading-[28px] text-acr-ink small:text-[26px] small:leading-[32px]",
            {
              "pointer-events-none select-none opacity-50": !isOpen,
            },
          )}
        >
          {t("checkoutPayment.reviewHeading")}
        </h2>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <p className="mb-6 text-[14px] leading-[22px] text-acr-ink">
            {t("checkoutPayment.reviewConfirm")}
          </p>
          <PaymentButton
            cart={cart}
            fizetesiSzerep={fizetesiSzerep}
            stripeKozos={searchParams.get("fizetes") === "stripe"}
            data-testid="submit-order-button"
          />
        </>
      )}
    </section>
  )
}

export default Review
