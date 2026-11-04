/**
 * THE GUEST'S INVOICE LINKS: the shapes and the small decisions of the button under an order (V1.1). The links come from the OS
 * through the shop's backend; the page only draws them. A link is single use and short lived, so the page never keeps one
 * longer than the click that asked for it.
 */
export type GuestInvoiceType = "INVOICE" | "ADVANCE_INVOICE" | "FINAL_INVOICE"

export type GuestInvoiceDocument = {
  invoice_number: string | null
  document_type: GuestInvoiceType
  issue_date: string | null
  url: string
}

export type GuestInvoiceResult =
  { ok: true; documents: GuestInvoiceDocument[] } | { ok: false }

/** The dictionary key of a document type's name. */
export const invoiceTypeKey = (type: GuestInvoiceType) =>
  type === "ADVANCE_INVOICE"
    ? ("guestOrder.invoice.typeAdvance" as const)
    : type === "FINAL_INVOICE"
      ? ("guestOrder.invoice.typeFinal" as const)
      : ("guestOrder.invoice.typeInvoice" as const)

/** A link the page may put in front of the customer: the backend vouches for the path, the page checks the scheme. */
export const safeInvoiceUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}
