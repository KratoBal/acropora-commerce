"use client"

import { createContext, useContext, useState } from "react"

import { useTranslate } from "@lib/i18n/use-translate"
import { ADATKEZELES_CIM, ASZF_CIM } from "@lib/util/aszf"
import { jogiKapuTesztMod } from "@lib/util/jogi-kapu"
import { ASZF_PIPA_SZOVEG, aszfPipaReszek } from "@lib/util/megrendeles"

/**
 * AZ ASZF ELFOGADASA A FIZETESI OLDALON (Figma 209:3 / 209:133, "Rendelés
 * véglegesítése"): kotelezo pipa, a leado gomb es a gyors fizetes addig
 * tiltva.
 *
 * MA CSAK A FELULET. A pipa NEM kerul rogzitesre: barracuda merese szerint
 * (kartya 4a2b252d, 5370-es komment) az ASZF-elfogadast ma csak a regisztracio
 * rogziti, a penztar semmit, es vegyes kosarnal a bolti kosar a metaadatot sem
 * orokli. A rogzites (ugyanaz a rekord a rendelesre, vegyesnel mindkettore)
 * kulon PR (acrobot 26317).
 *
 * Provider nelkul (a tobbi lepes, a regi tesztek) az ertek "elfogadva": a
 * meglevo utakon semmi nem valtozik.
 */
type AszfAllapot = { elfogadva: boolean; beallit: (ertek: boolean) => void }

export const AszfContext = createContext<AszfAllapot>({
  elfogadva: true,
  beallit: () => {},
})

export const useAszf = () => useContext(AszfContext)

export function AszfProvider({ children }: { children: React.ReactNode }) {
  // Teszt-modban nincs pipa (nincs mit elfogadtatni, sajat szoveget nem irunk): a
  // gomb nem var ra. A hatter a rekordot teszt-modban jelolve irja.
  const [elfogadva, beallit] = useState(jogiKapuTesztMod())
  return (
    <AszfContext.Provider value={{ elfogadva, beallit }}>
      {children}
    </AszfContext.Provider>
  )
}

/**
 * A PIPA SZOVEGE SZO SZERINT AZ UNAS-E (commerce-audit-p0, P0-1; lasd
 * `lib/util/megrendeles.ts`): a ket kifejezes hivatkozas, a masodik mondat a
 * fizetesi kotelezettseget mondja ki, mert a gomb felirata „Megrendel”.
 */
export const ASZF_SZOVEG = ASZF_PIPA_SZOVEG

const HIVATKOZAS = "underline underline-offset-2 hover:text-acr-heritage"

export default function AszfNegyzet() {
  const t = useTranslate()
  const reszek = aszfPipaReszek(t)
  const { elfogadva, beallit } = useAszf()
  if (jogiKapuTesztMod())
    return (
      <p
        className="border border-acr-ink px-4 py-3 text-[14px] leading-[20px] text-acr-ink"
        data-testid="jogi-teszt-figyelmeztetes"
        role="note"
      >
        {t("checkoutPayment.legalTest")}
      </p>
    )
  return (
    <label
      className="flex cursor-pointer items-start gap-3 text-[14px] leading-[20px] text-acr-ink"
      data-testid="aszf-negyzet"
    >
      <input
        type="checkbox"
        checked={elfogadva}
        onChange={(e) => beallit(e.target.checked)}
        className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-acr-ink"
        data-testid="aszf-pipa"
        required
      />
      <span>
        {reszek.elso}
        <a
          href={ASZF_CIM}
          target="_blank"
          rel="noreferrer"
          className={HIVATKOZAS}
        >
          {reszek.aszf}
        </a>
        {reszek.koztes}
        <a
          href={ADATKEZELES_CIM}
          target="_blank"
          rel="noreferrer"
          className={HIVATKOZAS}
        >
          {reszek.adatkezeles}
        </a>
        {reszek.vege}
      </span>
    </label>
  )
}
