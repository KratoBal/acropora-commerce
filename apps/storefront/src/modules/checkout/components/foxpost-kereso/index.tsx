"use client"

import { useEffect, useRef, useState } from "react"

import {
  type FoxpostCsomagpont,
  foxpostPontUzenetbol,
} from "@lib/util/csomagpont"

/** A Foxpost hivatalos terkepes keresoje (2in1, iframe). */
export const FOXPOST_KERESO_URL = "https://cdn.foxpost.hu/apt-finder/v1/app/"
export const FOXPOST_KERESO_ORIGIN = "https://cdn.foxpost.hu"

/** Ennyi ido utan, ha a kereso nem toltott be, a lista jon helyette. */
export const FOXPOST_KERESO_IDOKORLAT_MS = 15_000

/**
 * A HIVATALOS FOXPOST KERESO (PRIMARY). A Foxpost sajat alkalmazasa, nem
 * rajzoljuk ujra: mi csak a keretet adjuk, a betoltest, es a valasztott pont
 * atvetelet. Az uzenet alakja a kereso kodjabol mert (`foxpostPontUzenetbol`).
 *
 * CSAK A FOXPOST ABLAKABOL JOVO UZENET SZAMIT: a forras-cim
 * (`https://cdn.foxpost.hu`) es a kuldo ablak (ez az iframe) is egyezik.
 * Mas ablak uzenete, vagy egy rossz alaku pont, semmit nem allit.
 *
 * A TARTALEK: ha a kereso az idokorlaton belul nem tolt be, vagy a vevo
 * maga keri, a foxplus.json alapu lista jon (`onTartalek`).
 */
export default function FoxpostKereso({
  onValaszt,
  onTartalek,
  idokorlatMs = FOXPOST_KERESO_IDOKORLAT_MS,
}: {
  onValaszt: (pont: FoxpostCsomagpont) => void | Promise<void>
  onTartalek: (ok: "idokorlat" | "kezi") => void
  idokorlatMs?: number
}) {
  const keret = useRef<HTMLIFrameElement>(null)
  const [betoltve, setBetoltve] = useState(false)
  const betoltveRef = useRef(false)

  useEffect(() => {
    const figyel = (esemeny: MessageEvent) => {
      if (esemeny.origin !== FOXPOST_KERESO_ORIGIN) return
      if (keret.current && esemeny.source !== keret.current.contentWindow)
        return
      const pont = foxpostPontUzenetbol(esemeny.data)
      if (pont) void onValaszt(pont)
    }
    window.addEventListener("message", figyel)
    return () => window.removeEventListener("message", figyel)
  }, [onValaszt])

  useEffect(() => {
    const ora = window.setTimeout(() => {
      if (!betoltveRef.current) onTartalek("idokorlat")
    }, idokorlatMs)
    return () => window.clearTimeout(ora)
  }, [idokorlatMs, onTartalek])

  return (
    <div className="flex flex-col gap-2" data-testid="foxpost-kereso">
      <div className="relative w-full overflow-hidden border border-acr-line bg-acr-white">
        {!betoltve && (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center text-[13px] text-acr-slate"
            data-testid="foxpost-kereso-betolt"
          >
            A FOXPOST térképes kereső betöltése…
          </p>
        )}
        <iframe
          ref={keret}
          src={FOXPOST_KERESO_URL}
          title="FOXPOST térképes átvételipont-kereső"
          allow="geolocation"
          onLoad={() => {
            betoltveRef.current = true
            setBetoltve(true)
          }}
          className="block h-[75vh] max-h-[640px] min-h-[480px] w-full border-0"
          data-testid="foxpost-kereso-keret"
        />
      </div>
      <button
        type="button"
        onClick={() => onTartalek("kezi")}
        className="self-start text-[13px] text-acr-heritage underline underline-offset-2"
        data-testid="foxpost-kereso-lista"
      >
        Nem töltődik be a térkép? Keress listában.
      </button>
    </div>
  )
}
