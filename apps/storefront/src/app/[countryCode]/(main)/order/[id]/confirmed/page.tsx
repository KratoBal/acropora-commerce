import { getRendelesMegtekintes } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { retrieveOrder } from "@lib/data/orders"
import { megtekintesEngedelyezett } from "@lib/util/rendeles-megtekintes"
import { kapcsoltRendeles } from "@lib/util/rendelesek"
import OrderCompletedMinimal from "@modules/order/templates/order-completed-minimal"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"

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

  // A hatter 404-et ad annak, aki nem tulajdonos es nincs alairt sutije (audit
  // A6b), es ugyanazt egy nem letezo rendelesre is: mindkettonek ugyanaz a
  // minimalis oldal jar, szam nelkul, hogy az oldal se arulja el, melyik
  // azonosito letezik.
  if (!order) {
    return <OrderCompletedMinimal displayId={null} />
  }

  // A LAP NEM MUTATJA A SZEMELYES ADATOKAT (nev, cim, telefon, e-mail) CSAK
  // AZ AZONOSITO BIRTOKABAN (audit P1/5): a leadaskor kapott alairt suti
  // nevezi meg a rendelest, vagy a bejelentkezett vevo a rendeles tulajdonosa.
  // A hatter ugyanezt ellenorzi (audit A6b, order-read-guard.ts): a rendelest
  // csak a tulajdonosnak vagy ennek a sutinek az ertekevel adja ki. Ez a lap
  // masodik vedovonal, es a hatter 404-et nem kulonbozteti meg itt.
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
