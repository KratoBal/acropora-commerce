"use client"

import { useEffect, useState } from "react"

/**
 * AZ AKCIO VISSZASZAMLALOJA.
 *
 * === MIERT KULON, KLIENS OLDALI KOMPONENS ===
 *
 * A kezdolap tobbi resze a szerveren all ossze es gyorsitotarazodik. Egy
 * szerveren kiszamolt "04 nap 12:38" a gyorsitotar elso masodpercenek az
 * allapotat mutatna minden latogatonak, oraszam pontossaggal hibasan. Ezert
 * csak EZ a par szo kliens oldali.
 *
 * === A HIDRATACIOS CSAPDA, ES AMIERT AZ ELSO KEP URES ===
 *
 * Ha a szerver kiirna egy idot es a bongeszo masodpercre mast szamolna, a React
 * hidratacios eltereserol panaszkodna. Ezert az elso megjelenes szandekosan
 * ures, es az ertek a bongeszoben all be. A helyet foglalja, tehat a sor nem
 * ugrik meg.
 */
const Visszaszamlalo = ({ hatralevoOra }: { hatralevoOra: number }) => {
  const [szoveg, setSzoveg] = useState<string | null>(null)

  useEffect(() => {
    const hatarido = Date.now() + hatralevoOra * 60 * 60 * 1000

    const frissit = () => {
      const maradt = Math.max(0, hatarido - Date.now())
      const perc = Math.floor(maradt / 60000)
      const nap = Math.floor(perc / (60 * 24))
      const ora = Math.floor((perc % (60 * 24)) / 60)
      const p = perc % 60
      setSzoveg(
        `${String(nap).padStart(2, "0")} nap ${String(ora).padStart(2, "0")}:${String(p).padStart(2, "0")}`,
      )
    }

    frissit()
    const idozito = setInterval(frissit, 30000)
    return () => clearInterval(idozito)
  }, [hatralevoOra])

  return (
    <span
      data-testid="akcio-visszaszamlalo"
      className="inline-flex min-w-[9.5rem] items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide tabular-nums"
      style={{
        background: "var(--terv-kiemel)",
        color: "var(--terv-kiemel-szoveg)",
      }}
    >
      Az akció vége
      <span>{szoveg ?? ""}</span>
    </span>
  )
}

export default Visszaszamlalo
