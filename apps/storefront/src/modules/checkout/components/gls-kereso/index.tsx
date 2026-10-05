"use client"

import { createElement, useEffect, useRef, useState } from "react"

import { glsPontWidgetbol } from "@lib/util/gls"

/** A GLS hivatalos terkepes keresoje (barracuda merese, 2026-10-05: kulcs nem kell). */
export const GLS_KERESO_SZKRIPT =
  "https://map.gls-hungary.com/widget/gls-dpm.js"
/** Ennyi ido utan, ha a kereso nem toltott be, a lista jon helyette, hibauzenet nelkul. */
export const GLS_KERESO_IDOKORLAT_MS = 10_000

type CustomElementsLike = Pick<CustomElementRegistry, "whenDefined">

/**
 * A HIVATALOS GLS KERESO (PRIMARY; a prompt 3. pontja, Figma 508:3): a GLS
 * sajat `<gls-dpm>` eleme, mi csak betoltjuk es atvesszuk a valasztott pontot.
 * Zart Shadow DOM-ban rajzol, tehat a megjelenese a GLS-e.
 *
 * - `filter-saturation="1,2"`: az uzemen kivuli automatat a kereso fel sem
 *   kinalja (a hatter amugy is elutasitja).
 * - nehezarunal `filter-type="parcel-shop"`: csak ParcelShop.
 * - A `change` esemenybol CSAK az azonosito megy tovabb (`glsPontWidgetbol`).
 *
 * A TARTALEK AUTOMATIKUS (acrobot 26531): a betolto hibat nem jelez, ezert ha
 * a szkript elbukik, vagy az elem az idokorlaton belul nem regisztralodik, a
 * lista jon helyette, hibauzenet nelkul. A vevo maga is kerheti.
 */
export default function GlsKereso({
  nehez,
  onValaszt,
  onTartalek,
  idokorlatMs = GLS_KERESO_IDOKORLAT_MS,
  elemek,
}: {
  nehez: boolean
  onValaszt: (pont: { id: string }) => void | Promise<void>
  onTartalek: (ok: "idokorlat" | "hiba" | "kezi") => void
  idokorlatMs?: number
  /** Teszthez: a `customElements` helyett. */
  elemek?: CustomElementsLike
}) {
  const elem = useRef<HTMLElement>(null)
  const [kesz, setKesz] = useState(false)

  // a szkript egyszer kerul a lapra; egy masodik megnyitas ugyanazt hasznalja
  useEffect(() => {
    if (document.querySelector(`script[src="${GLS_KERESO_SZKRIPT}"]`)) return
    const szkript = document.createElement("script")
    szkript.src = GLS_KERESO_SZKRIPT
    szkript.async = true
    szkript.onerror = () => onTartalek("hiba")
    document.head.appendChild(szkript)
  }, [onTartalek])

  useEffect(() => {
    const registry = elemek ?? window.customElements
    let el = false
    const ora = window.setTimeout(() => {
      if (!el) onTartalek("idokorlat")
    }, idokorlatMs)
    void registry.whenDefined("gls-dpm").then(() => {
      el = true
      setKesz(true)
    })
    return () => window.clearTimeout(ora)
  }, [elemek, idokorlatMs, onTartalek])

  useEffect(() => {
    const cel = elem.current
    if (!cel) return
    const figyel = (esemeny: Event) => {
      const pont = glsPontWidgetbol((esemeny as CustomEvent).detail)
      if (pont) void onValaszt(pont)
    }
    cel.addEventListener("change", figyel)
    return () => cel.removeEventListener("change", figyel)
  }, [onValaszt])

  return (
    <div className="flex flex-col gap-2" data-testid="gls-kereso">
      <div className="relative w-full overflow-hidden border border-acr-line bg-acr-white">
        {!kesz && (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center text-[13px] text-acr-slate"
            data-testid="gls-kereso-betolt"
          >
            A GLS térképes kereső betöltése…
          </p>
        )}
        {createElement("gls-dpm", {
          ref: elem,
          country: "hu",
          language: "hu",
          "filter-saturation": "1,2",
          ...(nehez ? { "filter-type": "parcel-shop" } : {}),
          class: "block h-[75vh] max-h-[640px] min-h-[480px] w-full",
          "data-testid": "gls-kereso-elem",
        })}
      </div>
      <button
        type="button"
        onClick={() => onTartalek("kezi")}
        className="self-start text-[13px] text-acr-heritage underline underline-offset-2"
        data-testid="gls-lista-nezet"
      >
        Keresés listában
      </button>
    </div>
  )
}
