"use client"

import { createContext, useContext, useState } from "react"

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
  const [elfogadva, beallit] = useState(false)
  return (
    <AszfContext.Provider value={{ elfogadva, beallit }}>
      {children}
    </AszfContext.Provider>
  )
}

export const ASZF_SZOVEG =
  "Elolvastam és elfogadom az ÁSZF-et és az adatkezelési tájékoztatót."

export default function AszfNegyzet() {
  const { elfogadva, beallit } = useAszf()
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
      <span>{ASZF_SZOVEG}</span>
    </label>
  )
}
