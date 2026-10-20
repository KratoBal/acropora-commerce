import type { CSSProperties, ReactNode } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { KezdolapCim } from "@modules/kezdolap/szovegek"

/**
 * EGY SZERKESZTHETO HIVATKOZAS: bolti ut (az orszagkodot megkapja) vagy kulso
 * `http(s)` cim (`noopener noreferrer`, uj lapon). A cimet a `biztonsagosCim`
 * mar megszurte, ide csak az jut, ami `/ut` vagy `https://...` alaku.
 */
const CimLink = ({
  cim,
  className,
  style,
  children,
}: {
  cim: KezdolapCim
  className?: string
  style?: CSSProperties
  children: ReactNode
}) =>
  cim.kulso ? (
    <a
      href={cim.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      {children}
    </a>
  ) : (
    <LocalizedClientLink href={cim.href} className={className} style={style}>
      {children}
    </LocalizedClientLink>
  )

export default CimLink
