"use client"

import { kosarAllapot, type KosarAllapot } from "@lib/data/kosar-allapot"
import { usePathname } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { KOSAR_VALTOZOTT } from "./kosar-esemeny"

type Allapot = KosarAllapot & {
  /** Megjott-e mar az elso valasz: elotte a kosar `null`, de nem "ures". */
  betoltve: boolean
}

const URES: Allapot = {
  customer: null,
  cart: null,
  shippingOptions: [],
  betoltve: false,
}

const KosarAllapotContext = createContext<Allapot>(URES)

/**
 * A KOSAR ES A VEVO KLIENSOLDALON (FE-7). A publikus lap szerveroldalon nem
 * olvas sutit, tehat gyorsitotarazhato; a latogato sajat allapota itt jon, a
 * betoltes utan. Ujratolt: utvonal-valtaskor (a penztarbol, a fiokbol jovet)
 * es a `kosarValtozott()` jelzesre (kosarba tetel, modositas, torles).
 */
export function KosarAllapotProvider({ children }: { children: ReactNode }) {
  const [allapot, setAllapot] = useState<Allapot>(URES)
  const pathname = usePathname()

  const betolt = useCallback(() => {
    kosarAllapot()
      .then((friss) => setAllapot({ ...friss, betoltve: true }))
      .catch(() => setAllapot((elozo) => ({ ...elozo, betoltve: true })))
  }, [])

  useEffect(() => {
    betolt()
  }, [betolt, pathname])

  useEffect(() => {
    window.addEventListener(KOSAR_VALTOZOTT, betolt)
    return () => window.removeEventListener(KOSAR_VALTOZOTT, betolt)
  }, [betolt])

  return (
    <KosarAllapotContext.Provider value={allapot}>
      {children}
    </KosarAllapotContext.Provider>
  )
}

export function useKosarAllapot(): Allapot {
  return useContext(KosarAllapotContext)
}
