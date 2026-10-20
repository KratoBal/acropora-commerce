"use client"

import { useCallback, useEffect, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { HeroDia } from "@modules/kezdolap/tartalom"

export type HeroTeny = { cim: string; szoveg: string; minta?: boolean }

/** Az automatikus leptetes ritmusa (a terv: 6 masodperc). */
const LEPTETES_MS = 6000

/**
 * A KEZDOLAP HERO-CSUSZKAJA, A CLAUDE DESIGN TERV SZERINT (2026-10-20).
 *
 * === AMI A TERVBOL JON, ES AMI NEM ===
 *
 * A diak (szoveg, gombok, kep, kepalairas) az OS-bol jonnek, es szerkeszthetok;
 * a komponensben egyetlen mondat sincs beegetve. A harom "tenyt" (Szemelyes
 * atvetel, Szakmai tanacsadas, ertekeles) a szovegkatalogus kulcsai adjak.
 *
 * === AZ AUTOMATIKUS LEPTETES (Balazs, 2026-10-20: a tervben van) ===
 *
 * Hat masodpercenkent lep, es MEGALL, es nem indul ujra:
 *   - ha a latogato mozgas-csokkentest kert (`prefers-reduced-motion`),
 *     akkor mar az elejetol nem lep, es menet kozben is megall, ha bekapcsolja;
 *   - az elso kattintasra vagy erintesre a csuszkan (a pontokon, a nyilakon, a
 *     kepen, barhol), mert aki hozanyult, az maga akarja vezetni;
 *   - az elso billentyunyomasra a csuszkan.
 * Rejtett lapon (masik fulon) nem lep, hogy a hatterben ne pereguljon.
 *
 * Ez a mai komponens korabbi dontesevel (nincs automata mozgas) utkozott, es
 * a tervbeli viselkedes nyert (acrobot 33330).
 *
 * === A SZOVEG SIMA SZOVEG ===
 *
 * Minden szoveg React szovegcsomopontkent jelenik meg, soha nem HTML-kent: az
 * OS a gazdaja, de egy `dangerouslySetInnerHTML` ezt a vegpontot XSS-uttva
 * tenne (barracuda, #551).
 */
const HeroCsuszka = ({
  diak,
  tenyek,
}: {
  diak: HeroDia[]
  tenyek: HeroTeny[]
}) => {
  const [allas, setAllas] = useState(0)
  const [megallitva, setMegallitva] = useState(false)
  const darab = diak.length

  const lep = useCallback(
    (merre: number) => {
      setAllas((mostani) => (mostani + merre + darab) % darab)
    },
    [darab],
  )

  /*
    A MOZGAS-CSOKKENTES KAPCSOLOJA: az elejen es menet kozben is. Ha a bongeszo
    nem ismeri a `matchMedia`-t, a leptetes nem indul (a biztonsagos iranyt
    valasztjuk, nem a mozgo iranyt).
  */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setMegallitva(true)
      return
    }
    const kerdes = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (kerdes.matches) setMegallitva(true)
    const valtozas = (e: MediaQueryListEvent) => {
      if (e.matches) setMegallitva(true)
    }
    kerdes.addEventListener("change", valtozas)
    return () => kerdes.removeEventListener("change", valtozas)
  }, [])

  useEffect(() => {
    if (megallitva || darab < 2) return
    const idozito = window.setInterval(() => {
      if (document.hidden) return
      lep(1)
    }, LEPTETES_MS)
    return () => window.clearInterval(idozito)
  }, [megallitva, darab, lep])

  /*
    A BILLENTYUZET A SAVON BELUL HAT, NEM AZ EGESZ LAPON: a `section` kap
    fokuszt, es csak akkor figyel a nyilakra. Egy dokumentum-szintu figyelo
    elvenne a nyilakat a lap gorgetesetol.
  */
  const billentyu = (e: React.KeyboardEvent) => {
    setMegallitva(true)
    if (e.key === "ArrowLeft") lep(-1)
    if (e.key === "ArrowRight") lep(1)
  }

  if (darab === 0) return null
  const dia = diak[Math.min(allas, darab - 1)]

  return (
    <section
      id="hero-csuszka"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Kiemelt ajánlatok"
      data-testid="hero-csuszka"
      data-automata={megallitva ? "all" : "lep"}
      aria-live="off"
      onPointerDown={() => setMegallitva(true)}
      onFocus={() => setMegallitva(true)}
      onKeyDown={billentyu}
      className="relative"
      style={{ background: "var(--kl-lap)", color: "var(--kl-szoveg)" }}
    >
      <div className="grid small:grid-cols-[600px_minmax(0,1fr)]">
        <div className="flex flex-col gap-12 px-4 py-10 small:pl-16 small:pr-14">
          <div>
            <div
              className="text-[13px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--kl-kek)" }}
            >
              {dia.eyebrow}
            </div>
            <h1
              className="mt-7 font-kiemelt text-5xl font-normal leading-[1.02] tracking-[-0.02em] small:min-h-[302px] small:text-[74px]"
              style={{
                color: "var(--kl-navy)",
                textWrap: "pretty",
              }}
            >
              {dia.title}
            </h1>
            <p
              className="mt-7 max-w-[470px] text-[19px] leading-[1.6] small:min-h-[91px]"
              style={{ color: "var(--kl-halvany)", textWrap: "pretty" }}
            >
              {dia.text}
            </p>
            <div className="mt-10 flex flex-wrap gap-[14px]">
              {dia.cta && dia.cta_href ? (
                <LocalizedClientLink
                  href={dia.cta_href}
                  className="rounded-[28px] px-[26px] py-4 text-[15px] font-semibold"
                  style={{
                    background: "var(--kl-navy)",
                    color: "var(--kl-lap)",
                  }}
                >
                  {dia.cta}
                </LocalizedClientLink>
              ) : null}
              {dia.cta2 && dia.cta2_href ? (
                <LocalizedClientLink
                  href={dia.cta2_href}
                  className="rounded-[28px] border px-[26px] py-[15px] text-[15px] font-semibold"
                  style={{
                    borderColor: "var(--kl-navy)",
                    color: "var(--kl-navy)",
                  }}
                >
                  {dia.cta2}
                </LocalizedClientLink>
              ) : null}
            </div>
          </div>
          <div
            className="flex flex-wrap gap-8 border-t pt-[22px] text-[14px]"
            style={{
              borderColor: "var(--kl-keret)",
              color: "var(--kl-halvany)",
            }}
          >
            {tenyek.map((teny, i) => (
              <div key={i}>
                <div
                  className="font-semibold"
                  style={{ color: "var(--kl-szoveg)" }}
                >
                  {teny.cim}
                </div>
                <div>{teny.szoveg}</div>
                {teny.minta ? (
                  <div className="mt-1">
                    <MintaJelzo mit="értékelés" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[320px] px-4 pb-10 small:min-h-0 small:p-0">
          <div className="absolute bottom-10 left-4 right-4 top-0 small:bottom-10 small:left-0 small:right-16 small:top-10">
            {dia.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dia.image_url}
                alt={dia.image_alt}
                data-testid="hero-kep"
                className="h-full w-full rounded-md object-cover"
                fetchPriority={allas === 0 ? "high" : undefined}
              />
            ) : (
              <div
                data-testid="hero-kep-hely"
                className="flex h-full w-full items-center justify-center rounded-md px-6 text-center text-sm"
                style={{
                  background: "var(--kl-lap-halvany)",
                  color: "var(--kl-halvany)",
                }}
              >
                {dia.image_alt}
              </div>
            )}
          </div>
          {dia.minta ? (
            <div className="absolute right-6 top-14 z-10 small:right-20">
              <MintaJelzo mit="képaláírás, ár, ígéretek" />
            </div>
          ) : null}
          {dia.caption || dia.caption2 ? (
            <div
              className="pointer-events-none absolute bottom-16 left-6 flex items-center gap-[18px] rounded px-[18px] py-[14px] text-[14px]"
              style={{ background: "var(--kl-lap)" }}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded"
                style={{ background: "var(--kl-narancs)" }}
              />
              <div>
                <div className="font-semibold">{dia.caption}</div>
                <div style={{ color: "var(--kl-halvany)" }}>{dia.caption2}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {darab > 1 ? (
        <div className="flex flex-col items-center gap-[14px] px-4 pb-6 small:px-16">
          <div
            className="flex items-center gap-[6px]"
            role="tablist"
            aria-label="Diák"
          >
            {diak.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === allas}
                aria-label={`${i + 1}. dia`}
                onClick={() => setAllas(i)}
                data-testid="hero-pont"
                className="flex h-6 min-w-6 items-center justify-center"
                style={{ width: i === allas ? 36 : 24 }}
              >
                {/*
                  A KATTINTHATO TERULET 24 PIXEL MAGAS (WCAG 2.2, 2.5.8 Target
                  Size): a gomb nagy, a lathato pont benne kicsi marad. A CI
                  akadalymentesseg-ellenorzese (`target-size`, serious) a 4
                  pixeles gombot elbuktatta (acrobot 33376).
                */}
                <span
                  aria-hidden="true"
                  className="block h-1 rounded-sm transition-[width]"
                  style={{
                    width: i === allas ? 28 : 8,
                    background:
                      i === allas ? "var(--kl-navy)" : "var(--kl-keret)",
                  }}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-[6px]">
            <button
              type="button"
              onClick={() => lep(-1)}
              aria-label="Előző dia"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border"
              style={{
                borderColor: "var(--kl-keret)",
                background: "var(--kl-feher)",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 14 14"
                fill="none"
                stroke="var(--kl-navy)"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M8.5 3L4.5 7l4 4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => lep(1)}
              aria-label="Következő dia"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
              style={{ background: "var(--kl-navy)" }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 14 14"
                fill="none"
                stroke="var(--kl-lap)"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M5.5 3l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default HeroCsuszka
