"use client"

import { useParams } from "next/navigation"
import { useState } from "react"

import { addToCart } from "@lib/data/cart"
import { kosarValtozott } from "@modules/layout/components/kosar-allapot/kosar-esemeny"

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
  rendelesiMaximum = null,
}: {
  variantId: string
  quantity: number
  termekNev: string
  /** A termek rendelesi maximuma (kartya 6994c9a3); `null`: nincs. */
  rendelesiMaximum?: number | null
}) {
  const countryCode = useParams().countryCode as string
  const [allapot, setAllapot] = useState<Allapot>("kesz")
  // a rendelesi maximum miatti vagas vagy elutasitas OKA, lathatoan
  const [mondat, setMondat] = useState<string | null>(null)

  const kosarba = async () => {
    setAllapot("folyamatban")
    setMondat(null)
    try {
      const eredmeny = await addToCart({
        variantId,
        quantity,
        countryCode,
        rendelesiMaximum,
      })
      kosarValtozott()
      if (eredmeny.ok) {
        setAllapot("sikerult")
        setMondat(eredmeny.megjegyzes ?? null)
      } else {
        setAllapot("hiba")
        setMondat(eredmeny.uzenet)
      }
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
      {mondat ? (
        <p
          className="mt-2 text-[12px] leading-[16px] text-acr-slate"
          data-testid="kartya-kosar-mondat"
        >
          {mondat}
        </p>
      ) : null}
    </>
  )
}
