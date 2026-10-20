import type { CSSProperties } from "react"

/**
 * A KEZDOLAP SZINEI A CLAUDE DESIGN TERVBOL (2026-10-20, Kezdolap.dc.html).
 *
 * A terv egyetlen, vilagos palettat hasznal, es a kezdolap savjai ezt egy
 * KOZOS burkolon (`page.tsx`) kapjak, nem a `globals.css`-ben: a stiluslap
 * `--terv-*` tokenjeit sok allitas szamolja (rez-szerepek, vilag-kovetes), es a
 * kezdolap uj szinei nem tartoznak a regi terv tokenkeszletebe. A fejlec es a
 * lablec tovabbra is a regi tokeneket koveti.
 *
 * A terv NEM ir elo sotet valtozatot, ezert a burkolon belul a lap vilagos
 * marad akkor is, ha a latogato sotet modot kert.
 */
export const KL_TOKENEK = {
  "--kl-lap": "#FBFBF9",
  "--kl-lap-halvany": "#EFEEEA",
  "--kl-szoveg": "#0D1A28",
  "--kl-halvany": "#4A5866",
  "--kl-navy": "#0F2338",
  "--kl-navy-mely": "#0A1726",
  "--kl-kek": "#1D5B87",
  "--kl-narancs": "#D5782F",
  // narancs SZOVEGHEZ: a #D5782F 3,09:1 a lapon, a #A8561A 5,05:1 (WCAG AA 4,5:1)
  "--kl-narancs-tinta": "#A8561A",
  "--kl-keret": "#E3E1DC",
  "--kl-feher": "#FFFFFF",
} as CSSProperties
