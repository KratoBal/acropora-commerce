import Script from "next/script"

import {
  FOGYASZTOBARAT_ID,
  FOGYASZTOBARAT_WIDGET_SRC,
  fogyasztobaratBekapcsolva,
} from "@lib/util/fogyasztobarat"

/**
 * A FOGYASZTOBARAT WIDGETJE, MINDEN OLDALON (a gyokér layoutban). A bolt
 * eredeti beagyazasa egy `id="fbarat"` es `data-id` attributumu szkriptet szur
 * be; ez ugyanazt a ket attributumot adja, `next/script`-tel, a lap
 * interaktivva valasa utan (`afterInteractive`), hogy a betoltest ne lassitsa.
 */
export default function FogyasztobaratWidget({
  bekapcsolva = fogyasztobaratBekapcsolva(),
}: {
  bekapcsolva?: boolean
}) {
  // KIKAPCSOLVA SEMMI: se szkript, se hivas (acrobot 26244)
  if (!bekapcsolva) return null
  return (
    <Script
      id="fbarat"
      src={FOGYASZTOBARAT_WIDGET_SRC}
      data-id={FOGYASZTOBARAT_ID}
      strategy="afterInteractive"
    />
  )
}
