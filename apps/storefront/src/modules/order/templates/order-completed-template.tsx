import { Heading } from "@modules/common/components/ui"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
  /** P4-2: "Egy leadásból: #13, bolti átvétel", ha a leadás két rendelés lett. */
  kapcsolt?: string | null
}

export default async function OrderCompletedTemplate({
  order,
  kapcsolt,
}: OrderCompletedTemplateProps) {
  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        <div
          className="flex flex-col gap-4 max-w-4xl h-full bg-white w-full py-10"
          data-testid="order-complete-container"
        >
          <Heading
            level="h1"
            className="flex flex-col gap-y-3 text-ui-fg-base text-3xl mb-4"
          >
            <span>Köszönjük!</span>
            <span>A rendelésedet sikeresen leadtad.</span>
          </Heading>
          <OrderDetails order={order} />
          {kapcsolt ? (
            <p
              className="text-base-regular text-ui-fg-base"
              data-testid="order-kapcsolt"
            >
              {kapcsolt}. A két rendelést egyszerre adtad le; a fiókodban
              mindkettőt látod.
            </p>
          ) : null}
          <Heading level="h2" className="flex flex-row text-3xl-regular">
            Összegzés
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          <Help />
        </div>
      </div>
    </div>
  )
}
