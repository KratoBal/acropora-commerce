import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { Szovegek } from "@modules/kezdolap/szovegek"

/**
 * A FEJLEC FELETTI INFO-SAV (kartya 409ba396, 2026-11-19): negy rovid szoveg. A bal oldalon az elso ketto (marketing-szoveg, az OS szerkeszti: `fejlec.sav.1-2`), a jobb
 * oldalon a harmadik es a negyedik (nyitvatartas es telefon, a CEG adata: nem szerkesztheto, lasd lent).
 *
 * AZ URES SZOVEG NEM RAJZOL SEMMIT: egy kifejezetten uresre mentett sor (az OS szerkeszto donteset, nem hianyt jelent) nem hagy
 * ures helyet, es ha MIND A NEGY ures, a sav sincs (a 3. es 4. sor szotarbol jon, ures csak akkor lehet, ha a CEG adata lenne ures). Eddig minden sor mindig kirajzolodott, tehat egy kiuritett szoveg is egy
 * sotet savot es kozoket hagyott. A "MINTA ADAT" jelzo csak akkor all, ha valamelyik MEGJELENO sor meg a kitalalt kezdoertek.
 */
export const SAV_KULCSOK = [
  "fejlec.sav.1",
  "fejlec.sav.2",
  "fejlec.sav.3",
  "fejlec.sav.4",
] as const

/**
 * A HARMADIK ES A NEGYEDIK SOR NEM AZ OS REKORDBOL JON (acrobot 57149, barracuda 57155, 2026-11-19): a nyitvatartas es a telefon a bolt
 * CEG adata (`@lib/ceg`), ugyanaz az egyetlen forras, mint a lableceben (Balazs, 2026-10-27: "ha valtozik, mi irjuk at"). A szotar
 * (`headerText.bar3`, `.bar4`) a CEG-bol epul, magyarul es angolul is. Az OS katalogusa ezt a ket kulcsot nem ismeri (nem szerkesztheto), de
 * a kirakat ezt NEM erre bizza: egy rekordban valaha mar allo vagy kesobb mas uton bekerulo `fejlec.sav.3/4` ertek sem irhatja felul,
 * mert a sor a rekordot meg sem nezi.
 */
export function InfoSav({ s }: { s: Szovegek }) {
  const rekordbol = (kulcs: "fejlec.sav.1" | "fejlec.sav.2") =>
    s.szoveg(kulcs).trim()
  const egy = rekordbol("fejlec.sav.1")
  const ketto = rekordbol("fejlec.sav.2")
  const harom = s.t("headerText.bar3").trim()
  const negy = s.t("headerText.bar4").trim()
  if (!egy && !ketto && !harom && !negy) return null
  // a minta-jelzo csak a megjeleno, rekordbol olvasott minta-sor mellett all (a 3. es 4. sor a CEG valodi adata, sosem minta)
  const mintaSav = (["fejlec.sav.1", "fejlec.sav.2"] as const).some(
    (k) => rekordbol(k) !== "" && s.minta(k),
  )

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
