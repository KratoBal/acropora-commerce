import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveOrder, retrieveOrderBusinessStatus } from "@lib/data/orders"
import { rendelesSzam } from "@lib/util/rendelesek"
import RendelesReszletek from "@modules/account/components/rendeles-reszletek"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    notFound()
  }

  return {
    title: `Rendelés ${rendelesSzam(order.display_id)}`,
    description: "A rendelésed részletei.",
  }
}

/** A RENDELES RESZLETEI (P5, 249:96). */
export default async function OrderDetailPage(props: Props) {
  const params = await props.params
  const [order, allapot] = await Promise.all([
    retrieveOrder(params.id).catch(() => null),
    retrieveOrderBusinessStatus(params.id),
  ])

  if (!order) {
    notFound()
  }

  return <RendelesReszletek rendeles={order} allapot={allapot} />
}
