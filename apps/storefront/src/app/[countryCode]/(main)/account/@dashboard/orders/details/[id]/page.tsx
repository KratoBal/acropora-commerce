import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveOrder, retrieveOrderBusinessStatus } from "@lib/data/orders"
import { retrieveOwnWithdrawalState } from "@lib/data/own-withdrawal"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import {
  kapcsoltFelirat,
  kapcsoltRendeles,
  rendelesSzam,
} from "@lib/util/rendelesek"
import RendelesReszletek from "@modules/account/components/rendeles-reszletek"

type Props = {
  params: Promise<{ id: string; countryCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    notFound()
  }

  // the page's title and description follow its language (`hu`, `en-hu`)
  const t = translator(localeOf(params.countryCode))
  return {
    title: t("account.orderDetails.metaTitle", {
      number: rendelesSzam(order.display_id),
    }),
    description: t("account.orderDetails.metaDescription"),
  }
}

/** A RENDELES RESZLETEI (P5, 249:96). */
export default async function OrderDetailPage(props: Props) {
  const params = await props.params
  const locale = localeOf(params.countryCode)
  const t = translator(locale)
  const [order, allapot, elallas] = await Promise.all([
    retrieveOrder(params.id).catch(() => null),
    retrieveOrderBusinessStatus(params.id),
    retrieveOwnWithdrawalState(params.id),
  ])

  if (!order) {
    notFound()
  }

  // P4-2: ha a rendelés egy vegyes kosár egyik fele, a párja is megjelenik.
  const par = kapcsoltRendeles(order.metadata)
  const parRendeles = par ? await retrieveOrder(par.id).catch(() => null) : null

  return (
    <RendelesReszletek
      rendeles={order}
      allapot={allapot}
      t={t}
      locale={locale}
      elallas={elallas}
      par={
        par && parRendeles
          ? {
              id: par.id,
              felirat: kapcsoltFelirat(parRendeles.display_id, par.bolti, t),
            }
          : null
      }
    />
  )
}
