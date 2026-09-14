"use client"

import { useCallback, useEffect, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import { MINTA_DIAK } from "@modules/kezdolap/minta-adat"

/**
 * A KEZDOLAP HERO-CSUSZKAJA.
 *
 * === MI ELO ES MI MINTA ===
 *
 * MINTA a dia szovege es a kepe: a terv sajat demo-tartalma all itt, kep
 * helyen pedig atlos csikozas -- pontosan ugy, ahogy a tervlap is jeloli a meg
 * nem letezo fotot. Valodi fotot es valodi szoveget csak ember adhat hozza.
 *
 * ELO a csuszka MAGA: a lapozas, a nyilak, a billentyuzet es a mobil ujjmozdulat
 * mar a vegleges viselkedes. Amikor a kepek megjonnek, csak a `MINTA_DIAK`
 * tomb cserelodik egy adatforrasra.
 *
 * === MIERT NINCS AUTOMATIKUS LEPTETES ===
 *
 * A terv nem ir elo automata mozgast, es egy magatol lepo csuszka a
 * kepernyoolvasot es a mozgas-erzekenyseget is erinti (`prefers-reduced-motion`).
 * Ha kesobb kell, az egy dontes lesz, nem egy alapertelmezes.
 */
const HeroCsuszka = () => {
  const [allas, setAllas] = useState(0)
  const dia = MINTA_DIAK[allas]

  const lep = useCallback((merre: number) => {
    setAllas((mostani) => {
      const uj = mostani + merre
      if (uj < 0) return MINTA_DIAK.length - 1
      if (uj >= MINTA_DIAK.length) return 0
      return uj
    })
  }, [])

  /*
    A BILLENTYUZET A SAVON BELUL HAT, NEM AZ EGESZ LAPON: a `section` kap
    fokuszt, es csak akkor figyel a nyilakra. Egy dokumentum-szintu figyelo
    elvenne a nyilakat a lap gorgetesetol.
  */
  useEffect(() => {
    const elem = document.getElementById("hero-csuszka")
    if (!elem) return

    const figyelo = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") lep(-1)
      if (e.key === "ArrowRight") lep(1)
    }
    elem.addEventListener("keydown", figyelo)
    return () => elem.removeEventListener("keydown", figyelo)
  }, [lep])

  return (
    <section
      id="hero-csuszka"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Kiemelt ajánlatok"
      data-testid="hero-csuszka"
      className="relative overflow-hidden"
      style={{ background: "var(--terv-hatter-sotet)" }}
    >
      <div className="content-container relative py-14 small:py-20">
        <div className="absolute right-4 top-4 z-20">
          <MintaJelzo mit="kép és szöveg" />
        </div>

        {/* A KEP HELYE. Amig nincs foto, a tervlap sajat csikozasa all itt. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent 0 14px, var(--terv-szoveg-vilagos) 14px 15px)",
            opacity: 0.06,
          }}
        />

        <div className="relative z-10 max-w-2xl">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--terv-kiemel-tinta)" }}
          >
            {dia.eyebrow}
          </p>
          <h1
            className="mt-3 text-3xl font-semibold leading-tight small:text-5xl"
            style={{ color: "var(--terv-szoveg-vilagos)" }}
          >
            {dia.cim}
          </h1>
          <p
            className="mt-4 max-w-xl text-base leading-relaxed"
            style={{ color: "var(--terv-szoveg-vilagos)", opacity: 0.85 }}
          >
            {dia.szoveg}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex min-h-11 items-center px-5 text-sm font-semibold"
              style={{
                background: "var(--terv-kiemel)",
                color: "var(--terv-kiemel-szoveg)",
              }}
            >
              {dia.elsoGomb}
            </LocalizedClientLink>
            <span
              className="inline-flex min-h-11 items-center border px-5 text-sm font-semibold opacity-70"
              style={{
                borderColor: "var(--terv-szoveg-vilagos)",
                color: "var(--terv-szoveg-vilagos)",
              }}
            >
              {dia.masodikGomb}
            </span>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex gap-2" role="tablist" aria-label="Diák">
              {MINTA_DIAK.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === allas}
                  aria-label={`${i + 1}. dia`}
                  onClick={() => setAllas(i)}
                  className="h-1 w-10 transition-opacity"
                  style={{
                    background:
                      i === allas
                        ? "var(--terv-kiemel)"
                        : "var(--terv-szoveg-vilagos)",
                    opacity: i === allas ? 1 : 0.35,
                  }}
                />
              ))}
            </div>
            <span
              className="text-xs tabular-nums"
              style={{ color: "var(--terv-szoveg-vilagos)", opacity: 0.7 }}
            >
              {String(allas + 1).padStart(2, "0")} /{" "}
              {String(MINTA_DIAK.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => lep(-1)}
          aria-label="Előző dia"
          className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border small:flex"
          style={{
            borderColor: "var(--terv-szoveg-vilagos)",
            color: "var(--terv-szoveg-vilagos)",
          }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => lep(1)}
          aria-label="Következő dia"
          className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border small:flex"
          style={{
            borderColor: "var(--terv-szoveg-vilagos)",
            color: "var(--terv-szoveg-vilagos)",
          }}
        >
          ›
        </button>
      </div>
    </section>
  )
}

export default HeroCsuszka
