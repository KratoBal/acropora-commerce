import { getRendelesMegtekintes } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { retrieveOrder } from "@lib/data/orders"
import { megtekintesEngedelyezett } from "@lib/util/rendeles-megtekintes"
import { kapcsoltRendeles } from "@lib/util/rendelesek"
import OrderCompletedMinimal from "@modules/order/templates/order-completed-minimal"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
export const metadata: Metadata = {
  title: "Rendelés visszaigazolása",
  description: "A rendelésedet sikeresen leadtad.",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  // A SZEMELYES ADATOK (nev, cim, telefon, e-mail) CSAK ANNAK, AKI LEADTA
  // (audit P1/5): a leadaskor kapott alairt suti nevezi meg a rendelest, vagy
  // a bejelentkezett vevo a rendeles tulajdonosa. Az azonosito egyedul nem
  // elég: abból, hogy valaki ismeri az URL-t, nem következik, hogy övé.
  const suti = await getRendelesMegtekintes()
  const vevo = await retrieveCustomer().catch(() => null)
  const sajat = (rendeles: { id: string; customer_id?: string | null }) =>
    megtekintesEngedelyezett(suti, rendeles.id) ||
    (!!vevo?.id && rendeles.customer_id === vevo.id)

  if (!sajat(order)) {
    return <OrderCompletedMinimal displayId={order.display_id} />
  }

  // P4-2: egy vegyes kosár két rendelés lett; a visszaigazolás megnevezi a párt.
  // A pár is csak akkor, ha az is a látogatóé.
  const par = kapcsoltRendeles(order.metadata)
  const talaltPar = par ? await retrieveOrder(par.id).catch(() => null) : null
  const parRendeles = talaltPar && sajat(talaltPar) ? talaltPar : null

  return (
    <OrderCompletedTemplate
      order={order}
      par={parRendeles}
      parBolti={par?.bolti ?? false}
    />
  )
}
