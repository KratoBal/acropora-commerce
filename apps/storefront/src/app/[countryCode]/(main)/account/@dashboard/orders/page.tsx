import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listOrderBusinessStatuses, listOrders } from "@lib/data/orders"
import Rendelesek from "@modules/account/components/rendelesek"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: "Rendeléseim",
  description: "Aktuális és korábbi rendeléseid egy helyen.",
}

/**
 * A RENDELESEIM (P5, 249:3). Az utolso 50 rendeles; a keret lapozast nem
 * mutat. A vendegkent leadott rendeles atvetele (`TransferRequestForm`) a
 * keretben nincs, de a fiok funkcioja: a lista alatt marad.
 */
export default async function Orders() {
  const [orders, allapotok] = await Promise.all([
    listOrders(50),
    listOrderBusinessStatuses(),
  ])

  if (!orders) {
    notFound()
  }

  return (
    <div
      className="flex w-full flex-col gap-10"
      data-testid="orders-page-wrapper"
    >
      <Rendelesek rendelesek={orders} allapotok={allapotok} />
      <TransferRequestForm />
    </div>
  )
}
