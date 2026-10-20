import type { ReactNode } from "react"

/**
 * A KEZDOLAP TARTALOM-KONTEINERE (Balazs, 2026-10-20: "tul szeles"): a terv
 * 1440 pixeles kerete es 64 pixeles oldalmargoja szerint, hogy a tartalom egy
 * szeles kepernyon se fusson ki. A sav HATTERE maradhat teljes szelessegu (a
 * `section` kapja), a tartalom ebben all.
 *
 * `className` a belso elemre kerul (elrendezes), a szelesseg-hatart nem lehet
 * felulirni: egy sav, ami sajat max-width-et ker, ujra kifutna.
 */
const Konteiner = ({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) => (
  <div
    data-testid="kl-konteiner"
    className={`mx-auto w-full max-w-[1440px] px-4 small:px-16 ${className}`}
  >
    {children}
  </div>
)

export default Konteiner
