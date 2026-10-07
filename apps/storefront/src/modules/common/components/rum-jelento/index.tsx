"use client"

import { useReportWebVitals } from "next/web-vitals"

import {
  RUM_MAX_BAJT,
  RUM_MEROSZAMOK,
  rumArany,
  rumErtek,
  rumLaptipus,
  type RumErtekeles,
  type RumMeroszam,
} from "@lib/util/rum"

/** Amit a `useReportWebVitals` atad, abbol amit hasznalunk. */
export interface RumMetrika {
  name: string
  value: number
  rating?: string
}

/**
 * Egy meres elkuldese. Tiszta fuggveny a kuldo es az utvonal beinjektalasaval,
 * hogy a teszt a bongeszo nelkul merje: mi megy ki, es mi nem.
 */
export function rumKuldes(
  metrika: RumMetrika,
  utvonal: string,
  kuld: (torzs: string) => void,
): boolean {
  if (!RUM_MEROSZAMOK.includes(metrika.name as RumMeroszam)) return false
  const nev = metrika.name as RumMeroszam
  const torzs = JSON.stringify({
    n: nev,
    v: rumErtek(nev, metrika.value),
    r: (metrika.rating ?? "good") as RumErtekeles,
    t: rumLaptipus(utvonal),
  })
  if (torzs.length > RUM_MAX_BAJT) return false
  kuld(torzs)
  return true
}

/** A beacon a lap elhagyasakor is kimegy; ha nincs, egy `keepalive` fetch. */
function beacon(torzs: string) {
  const blob = new Blob([torzs], { type: "application/json" })
  if (navigator.sendBeacon?.("/api/rum", blob)) return
  void fetch("/api/rum", {
    method: "POST",
    body: torzs,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  }).catch(() => undefined)
}

// a mintavetel lapletoltesenkent egyszer dol el, nem meroszamonkent
const mintaban =
  typeof window !== "undefined" &&
  Math.random() < rumArany(process.env.NEXT_PUBLIC_RUM_ARANY)

/**
 * A CORE WEB VITALS JELENTOJE (FE-7 RUM). A gyoker-elrendezesben all, minden
 * lapon. Nem rajzol semmit. A kuldott sor: meroszam, ertek, ertekeles, es az
 * oldal TIPUSA, URL nelkul (az indok a `lib/util/rum` fejleceben).
 */
export default function RumJelento() {
  useReportWebVitals((metrika) => {
    if (!mintaban) return
    rumKuldes(metrika, window.location.pathname, beacon)
  })
  return null
}
