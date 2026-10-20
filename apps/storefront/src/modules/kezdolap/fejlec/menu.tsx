"use client"

import { useEffect, useRef, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { MenuPont } from "./menu-adat"

/**
 * A DESIGN LENYILO MENUJE (Claude Design, 2026-10-20: `acropora-menu-nyitva-
 * 1440.png`): a fo pontok, alattuk egy teljes szelessegu panel oszlopokkal
 * (csoportcim, alatta a kategoriak) es jobbra egy kiemelt kartya.
 *
 * === VISELKEDES ===
 *
 * Egerrel a pontra allva nyilik, a fejlecbol kimozdulva csukodik; billentyuzettel
 * (es erintessel) a pont GOMB: Enter/szokoz nyitja-zarja, az Escape csukja es a
 * fokuszt visszaadja a gombnak. A panel linkjei zart allapotban `invisible`-ek
 * (nincs fokuszuk, nem olvassa fel a kepernyoolvaso), nyitva szabadon
 * bejarhatok. A mozgas-csokkentest kero latogato nem kap atmenetet.
 *
 * A panel tartalma a szerverrol jon (a valodi kategoriak); ez az elem csak azt
 * dönti el, melyik latszik.
 */
export function KezdolapMenu({ pontok }: { pontok: MenuPont[] }) {
  const [nyitott, setNyitott] = useState<number | null>(null)
  const gyoker = useRef<HTMLDivElement>(null)
  const gombok = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (nyitott === null) return
    const kint = (e: PointerEvent) => {
      if (gyoker.current && !gyoker.current.contains(e.target as Node))
        setNyitott(null)
    }
    document.addEventListener("pointerdown", kint)
    return () => document.removeEventListener("pointerdown", kint)
  }, [nyitott])

  return (
    <div
      ref={gyoker}
      className="flex h-full items-stretch"
      onMouseLeave={() => setNyitott(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && nyitott !== null) {
          const i = nyitott
          setNyitott(null)
          gombok.current[i]?.focus()
        }
      }}
    >
      <ul className="flex items-stretch gap-[26px] text-[15px] font-medium whitespace-nowrap">
        {pontok.map((pont, i) => {
          const nyilik = pont.oszlopok.length > 0
          const aktiv = nyitott === i
          const kozos =
            "flex h-full items-center gap-[6px] border-b-2 transition-colors motion-reduce:transition-none"
          return (
            <li
              key={i}
              className="flex"
              onMouseEnter={() => setNyitott(nyilik ? i : null)}
            >
              {nyilik ? (
                <button
                  type="button"
                  ref={(el) => {
                    gombok.current[i] = el
                  }}
                  aria-expanded={aktiv}
                  aria-controls={`kl-panel-${i}`}
                  onClick={() => setNyitott(aktiv ? null : i)}
                  className={kozos}
                  style={{
                    color: "var(--kl-szoveg)",
                    borderColor: aktiv ? "var(--kl-navy)" : "transparent",
                  }}
                  data-testid={`kl-menu-gomb-${i}`}
                >
                  {pont.felirat}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                    className={
                      aktiv
                        ? "rotate-180 transition-transform"
                        : "transition-transform"
                    }
                  >
                    <path d="M2 3.5l3 3 3-3" />
                  </svg>
                </button>
              ) : (
                <LocalizedClientLink
                  href={pont.href ?? "/"}
                  className={kozos}
                  style={{
                    color: "var(--kl-szoveg)",
                    borderColor: "transparent",
                  }}
                  data-testid={`kl-menu-link-${i}`}
                >
                  {pont.felirat}
                </LocalizedClientLink>
              )}
            </li>
          )
        })}
      </ul>

      {pontok.map((pont, i) =>
        pont.oszlopok.length ? (
          <div
            key={i}
            id={`kl-panel-${i}`}
            data-testid={`kl-panel-${i}`}
            role="region"
            aria-label={pont.felirat}
            className={
              "absolute inset-x-0 top-full border-y shadow-[0_24px_40px_-24px_rgba(13,26,40,0.25)] transition-[opacity,transform] duration-200 motion-reduce:transition-none " +
              (nyitott === i
                ? "visible translate-y-0 opacity-100"
                : "invisible -translate-y-1.5 opacity-0")
            }
            style={{
              background: "var(--kl-lap)",
              borderColor: "var(--kl-keret)",
            }}
          >
            <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-9 small:px-16 small:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid grid-cols-2 gap-x-10 gap-y-8 small:grid-cols-4">
                {pont.oszlopok.map((oszlop, j) => (
                  <div key={j} className="flex flex-col gap-[10px] text-[15px]">
                    <LocalizedClientLink
                      href={oszlop.href}
                      className="mb-[6px] text-[12px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: "var(--kl-halvany)" }}
                    >
                      {oszlop.cim}
                    </LocalizedClientLink>
                    {oszlop.linkek.map((link, k) => (
                      <LocalizedClientLink
                        key={k}
                        href={link.href}
                        className="inline-block transition-[color,transform] hover:translate-x-1 hover:text-[color:var(--kl-kek)] motion-reduce:transition-none motion-reduce:hover:translate-x-0"
                        style={{ color: "var(--kl-szoveg)" }}
                      >
                        {link.nev}
                      </LocalizedClientLink>
                    ))}
                  </div>
                ))}
              </div>
              {pont.kartya ? (
                <aside
                  className="flex flex-col gap-3 rounded p-6"
                  style={{ background: "#F6F4F0" }}
                  data-testid={`kl-kartya-${i}`}
                >
                  <div
                    className="font-kiemelt text-xl"
                    style={{ color: "var(--kl-navy)" }}
                  >
                    {pont.kartya.cim}
                  </div>
                  <p
                    className="text-[15px]"
                    style={{ color: "var(--kl-halvany)" }}
                  >
                    {pont.kartya.szoveg}
                  </p>
                  {pont.kartya.href && pont.kartya.felirat ? (
                    <LocalizedClientLink
                      href={pont.kartya.href}
                      className="text-[15px] font-semibold"
                      style={{ color: "var(--kl-kek)" }}
                    >
                      {pont.kartya.felirat}
                    </LocalizedClientLink>
                  ) : null}
                  {pont.kartya.minta ? <MintaJelzo mit="szöveg" /> : null}
                </aside>
              ) : null}
            </div>
          </div>
        ) : null,
      )}
    </div>
  )
}
