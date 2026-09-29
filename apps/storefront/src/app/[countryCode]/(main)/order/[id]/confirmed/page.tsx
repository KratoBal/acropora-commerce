import { retrieveOrder } from "@lib/data/orders"
import { kapcsoltFelirat, kapcsoltRendeles } from "@lib/util/rendelesek"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  // P4-2: egy vegyes kosár két rendelés lett; a visszaigazolás megnevezi a párt.
  const par = kapcsoltRendeles(order.metadata)
  const parRendeles = par
    ? await retrieveOrder(par.id).catch(() => null)
    : null

  return (
    <OrderCompletedTemplate
      order={order}
      kapcsolt={
        par && parRendeles
          ? kapcsoltFelirat(parRendeles.display_id, par.bolti)
          : null
      }
    />
  )
}
