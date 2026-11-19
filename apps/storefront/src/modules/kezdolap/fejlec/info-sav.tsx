import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { Szovegek } from "@modules/kezdolap/szovegek"

/**
 * A FEJLEC FELETTI INFO-SAV (kartya 409ba396, 2026-11-19): negy rovid szoveg, az OS szerkeszti (`fejlec.sav.1-4`). A bal oldalon az
 * elso ketto, a jobb oldalon a harmadik es a negyedik.
 *
 * AZ URES SZOVEG NEM RAJZOL SEMMIT: egy kifejezetten uresre mentett sor (az OS szerkeszto donteset, nem hianyt jelent) nem hagy
 * ures helyet, es ha MIND A NEGY ures, a sav sincs. Eddig minden sor mindig kirajzolodott, tehat egy kiuritett szoveg is egy
 * sotet savot es kozoket hagyott. A "MINTA ADAT" jelzo csak akkor all, ha valamelyik MEGJELENO sor meg a kitalalt kezdoertek.
 */
export const SAV_KULCSOK = [
  "fejlec.sav.1",
  "fejlec.sav.2",
  "fejlec.sav.3",
  "fejlec.sav.4",
] as const

export function InfoSav({ s }: { s: Szovegek }) {
  const szoveg = (kulcs: (typeof SAV_KULCSOK)[number]) => s.szoveg(kulcs).trim()
  const [egy, ketto, harom, negy] = SAV_KULCSOK.map(szoveg)
  if (!egy && !ketto && !harom && !negy) return null
  const mintaSav = SAV_KULCSOK.some((k) => szoveg(k) !== "" && s.minta(k))

  return (
    <div
      className="hidden text-[13px] tracking-[0.01em] small:block"
      style={{ background: "var(--kl-navy-mely)", color: "#DCE7EF" }}
      data-testid="kl-info-sav"
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-16 py-[10px]">
        <div className="flex gap-7">
          {egy ? <span>{egy}</span> : null}
          {ketto ? <span>{ketto}</span> : null}
        </div>
        <div className="flex items-center gap-6">
          {harom ? <span>{harom}</span> : null}
          {negy ? (
            <span className="font-semibold" style={{ color: "var(--kl-lap)" }}>
              {negy}
            </span>
          ) : null}
          {mintaSav ? <MintaJelzo mit="infoBar" /> : null}
        </div>
      </div>
    </div>
  )
}
