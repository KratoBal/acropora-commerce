"use client"

import { useEffect, useRef } from "react"

import {
  FOGYASZTOBARAT_ID,
  fogyasztobaratBekapcsolva,
} from "@lib/util/fogyasztobarat"

/**
 * A "KEPES VASARLOI TAJEKOZTATO" BEAGYAZASA (commerce-audit-p1, lablec). A regi
 * bolt oldala (`shop.acropora.hu/fogyaszto-barat`, a tarolt pillanatkep
 * 2026-09-02-i allapota) egyetlen szkriptet tesz a tartalom-dobozba:
 *
 *   <script id="fbarat-embed" src="//admin.fogyasztobarat.hu/e-api.js"
 *           data-id="JPNFMVH0" data-type="def"></script>
 *
 * Ugyanezt a harom attributumot adjuk (a `src` nem protokoll-relativ, hanem
 * `https:`; a bolt https-en all, ugyanarra oldodna fel). A szkript a SAJAT
 * DOBOZABAN ul, mint a regi oldalon, ezert nem `next/script`: az a fejbe vagy
 * a torzs vegere szur be, nem a dobozba, es ha a widget a szkript helyehez
 * kepest rajzol, ott nem talalna a helyet. A bolt azonositoja ugyanaz, mint a
 * h-api widgete: `FOGYASZTOBARAT_ID`.
 *
 * KIKAPCSOLVA SEMMI (acrobot 26244): amig `NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED`
 * nem `true`, a kirakat nem hiv az admin.fogyasztobarat.hu fele; helyette a
 * jogi lapokkal azonos szoveg all.
 */
export const KEPES_TAJEKOZTATO_SZKRIPT =
  "https://admin.fogyasztobarat.hu/e-api.js"

export default function KepesTajekoztatoBeagyazas({
  bekapcsolva = fogyasztobaratBekapcsolva(),
  azonosito = FOGYASZTOBARAT_ID,
}: {
  bekapcsolva?: boolean
  azonosito?: string
}) {
  const doboz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bekapcsolva || !doboz.current) return
    const hely = doboz.current
    const szkript = document.createElement("script")
    szkript.id = "fbarat-embed"
    szkript.src = KEPES_TAJEKOZTATO_SZKRIPT
    szkript.setAttribute("data-id", azonosito)
    szkript.setAttribute("data-type", "def")
    hely.appendChild(szkript)
    return () => {
      hely.replaceChildren()
    }
  }, [bekapcsolva, azonosito])

  if (!bekapcsolva)
    return (
      <p
        className="txt-medium text-ui-fg-subtle"
        data-testid="kepes-eles-cimen"
      >
        A tájékoztató az éles címen jelenik meg.
      </p>
    )
  return <div ref={doboz} data-testid="kepes-tajekoztato-doboz" />
}
