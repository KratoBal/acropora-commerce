"use client"

import { createContext, useContext } from "react"

import type { Overrides } from "./dictionary"
import type { Locale } from "./locale"

const VevoiSzovegek = createContext<{
  locale: Locale
  szovegek: Overrides
} | null>(null)

/** A lap nyelvének átírt vevői szövegei a kliens-komponenseknek (a `[countryCode]` keret adja, kártya 7bfca4eb). */
export function VevoiSzovegekProvider({
  locale,
  szovegek,
  children,
}: {
  locale: Locale
  szovegek: Overrides
  children: React.ReactNode
}) {
  return (
    <VevoiSzovegek.Provider value={{ locale, szovegek }}>
      {children}
    </VevoiSzovegek.Provider>
  )
}

/** A megadott nyelv felülírásai, ha a keret azt a nyelvet hozta; más nyelvre (vagy provider nélkül) nincs felülírás. */
export const useVevoiSzovegek = (locale: Locale): Overrides | undefined => {
  const ertek = useContext(VevoiSzovegek)
  return ertek?.locale === locale ? ertek.szovegek : undefined
}
