import type { CSSProperties } from "react"

import type { RovidErtek } from "@modules/kezdolap/rovid"

/**
 * EGY FORMAZOTT ("ROVID") SZOVEG MEGJELENITESE. A `html` ag CSAK a szerveren
 * tisztitott ertekhez jut (`rovidErtek`): ez az egyetlen hely a kezdolapon,
 * ahol `dangerouslySetInnerHTML` all, es ide nem juthat tisztitatlan ertek.
 * A sima szoveg ugyanugy szovegcsomopont, mint eddig. DIV, nem P: a tisztitott
 * HTML maga is tartalmaz bekezdest, es P a P-ben ervenytelen.
 */
export default function RovidSzoveg({
  ertek,
  className,
  style,
  testid,
}: {
  ertek: RovidErtek
  className?: string
  style?: CSSProperties
  testid?: string
}) {
  if ("html" in ertek)
    return (
      <div
        className={`${className ?? ""} flex flex-col gap-y-2 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
        style={style}
        data-testid={testid}
        dangerouslySetInnerHTML={{ __html: ertek.html }}
      />
    )
  return (
    <div className={className} style={style} data-testid={testid}>
      {ertek.szoveg}
    </div>
  )
}
