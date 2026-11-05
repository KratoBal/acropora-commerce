"use client"

import DeleteButton from "@modules/common/components/delete-button"

/**
 * A "KIVESZEM A KOSARBOL" GOMB AZ ELKELT DARAB ERTESITESEBEN (V2.5 kovetes, barracuda #675 kerdese): az elkelt darab a kosarban
 * marad, es az ujabb penztar ugyanoda vezetne vissza. A gomb a MEGLEVO sor-torlo muvelettel veszi ki a tetelt (a kosar sora is ezt
 * hivja), a vevo keze ad kivetelt. Kulon kliens-komponens, mert a torlo gomb allapotot hasznal, az ertesites pedig szerver-komponens.
 */
export default function ElkeltKivetel({
  lineId,
  title,
  label,
}: {
  lineId: string
  title: string
  /** a felirat a szerver-komponens nyelvén (az ertesites a kosar oldal orszagkodjabol forditja), nem a bongeszo sajat nyelvfelismeresebol */
  label: string
}) {
  return (
    <DeleteButton id={lineId} data-testid={`cart-sold-remove-${lineId}`}>
      {label}
      <span className="sr-only">: {title}</span>
    </DeleteButton>
  )
}
