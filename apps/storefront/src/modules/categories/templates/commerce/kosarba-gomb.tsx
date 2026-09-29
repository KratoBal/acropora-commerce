"use client"

import { useParams } from "next/navigation"
import { useState } from "react"

import { addToCart } from "@lib/data/cart"

type Allapot = "kesz" | "folyamatban" | "sikerult" | "hiba"

const FELIRAT: Record<Allapot, string> = {
  kesz: "Kosárba",
  folyamatban: "Kosárba teszem…",
  sikerult: "Kosárba került",
  hiba: "Nem sikerült, próbáld újra",
}

/**
 * A KARTYA "KOSARBA" GOMBJA (137:2), acrobot dontese (2026-09-29 09:02): ha a
 * termek egyvaltozatos es kaphato, a gomb TENYLEG kosarba tesz, ugyanazzal a
 * muvelettel, amit a termeklap hasznal (`addToCart`), es visszajelez. A
 * mennyiseget a hivo adja, a termeklap szabalyabol (`gyorsKosar`).
 */
export default function KosarbaGomb({
  variantId,
  quantity,
  termekNev,
}: {
  variantId: string
  quantity: number
  termekNev: string
}) {
  const countryCode = useParams().countryCode as string
  const [allapot, setAllapot] = useState<Allapot>("kesz")

  const kosarba = async () => {
    setAllapot("folyamatban")
    try {
      await addToCart({ variantId, quantity, countryCode })
      setAllapot("sikerult")
    } catch {
      setAllapot("hiba")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={kosarba}
        disabled={allapot === "folyamatban"}
        aria-label={`${termekNev} kosárba`}
        className="flex h-[44px] w-full items-center justify-center bg-acr-heritage text-[14px] font-medium text-acr-white disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--acr-color-heritage)]"
        data-testid="kartya-kosarba"
      >
        {FELIRAT[allapot]}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {allapot === "sikerult" || allapot === "hiba" ? FELIRAT[allapot] : ""}
      </span>
    </>
  )
}
