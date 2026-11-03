import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listOrderBusinessStatuses, listOrders } from "@lib/data/orders"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import Rendelesek from "@modules/account/components/rendelesek"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

type Props = { params: Promise<{ countryCode: string }> }

// the page's title and description follow its language (`hu`, `en-hu`)
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return {
    title: t("account.orders.metaTitle"),
    description: t("account.orders.metaDescription"),
  }
}

/**
 * A RENDELESEIM (P5, 249:3). Az utolso 50 rendeles; a keret lapozast nem
 * mutat. A vendegkent leadott rendeles atvetele (`TransferRequestForm`) a
 * keretben nincs, de a fiok funkcioja: a lista alatt marad.
 */
export default async function Orders(props: Props) {
  const { countryCode } = await props.params
  const locale = localeOf(countryCode)
  const t = translator(locale)
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
      <Rendelesek
        rendelesek={orders}
        allapotok={allapotok}
        t={t}
        locale={locale}
      />
      <TransferRequestForm />
    </div>
  )
}
