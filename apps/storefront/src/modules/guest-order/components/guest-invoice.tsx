"use client"

import { requestGuestInvoice } from "@lib/data/guest-invoice"
import { translator } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import type { GuestOrder } from "@lib/util/guest-order"
import {
  invoiceTypeKey,
  safeInvoiceUrl,
  type GuestInvoiceDocument,
} from "@lib/util/guest-invoice"
import { Button } from "@modules/common/components/ui"
import { useState, useTransition } from "react"

type State =
  | { state: "idle" }
  | { state: "none" }
  | { state: "error" }
  | { state: "ready"; documents: GuestInvoiceDocument[] }

/**
 * THE INVOICE BUTTON UNDER AN ORDER (V1.1). A click asks the shop for the order's invoice links (the shop identifies the order
 * with the pair the customer already typed, and the OS gives single-use links); an invoice that exists is a link per document,
 * none yet is one plain sentence, a failure is another. Nothing is stored: a link is single use, so the page never keeps one
 * for later.
 */
export default function GuestInvoice({
  order,
  email,
}: {
  order: GuestOrder
  email: string
}) {
  const locale = useLocale()
  const t = translator(locale)
  const [result, setResult] = useState<State>({ state: "idle" })
  const [pending, startTransition] = useTransition()

  const ask = () =>
    startTransition(async () => {
      const answer = await requestGuestInvoice({
        orderNumber: String(order.display_id),
        email,
      })
      if (!answer.ok) setResult({ state: "error" })
      else if (answer.documents.length === 0) setResult({ state: "none" })
      else
        setResult({
          state: "ready",
          documents: answer.documents.filter((d) => safeInvoiceUrl(d.url)),
        })
    })

  return (
    <div
      className="flex flex-col gap-y-2"
      data-testid={`invoice-${order.display_id}`}
    >
      <Button
        type="button"
        variant="secondary"
        onClick={ask}
        disabled={pending}
        data-testid={`invoice-open-${order.display_id}`}
      >
        {pending
          ? t("guestOrder.invoice.searching")
          : t("guestOrder.invoice.button")}
      </Button>
      {result.state === "none" && (
        <p
          className="text-[14px] text-acr-slate"
          data-testid={`invoice-none-${order.display_id}`}
        >
          {t("guestOrder.invoice.none")}
        </p>
      )}
      {result.state === "error" && (
        <p
          role="alert"
          className="text-[14px] text-acr-ink"
          data-testid={`invoice-error-${order.display_id}`}
        >
          {t("guestOrder.invoice.error")}
        </p>
      )}
      {result.state === "ready" && (
        <ul
          className="flex flex-col gap-y-1"
          data-testid={`invoice-links-${order.display_id}`}
        >
          {result.documents.map((document) => (
            <li key={document.url}>
              <a
                href={document.url}
                className="underline"
                rel="noopener noreferrer"
              >
                {document.invoice_number
                  ? t("guestOrder.invoice.download", {
                      type: t(invoiceTypeKey(document.document_type)),
                      number: document.invoice_number,
                    })
                  : t("guestOrder.invoice.downloadNoNumber", {
                      type: t(invoiceTypeKey(document.document_type)),
                    })}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
