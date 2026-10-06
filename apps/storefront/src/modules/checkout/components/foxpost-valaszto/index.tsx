"use client"

import { useCallback, useState } from "react"

import { searchFoxpostPickupPoints } from "@lib/data/csomagpont"
import {
  type FoxpostCsomagpont,
  foxpostPontReszletek,
  foxpostPontTipus,
} from "@lib/util/csomagpont"
import CsomagpontValaszto from "@modules/checkout/components/csomagpont-valaszto"
import FoxpostKereso from "@modules/checkout/components/foxpost-kereso"
import FoxpostLogo from "@modules/checkout/components/foxpost-logo"

export type FoxpostKivalasztott = {
  name?: string
  address?: string
  variant?: string
  services?: string[]
  payment_options?: string[]
  /** A tipus hivatalos ikonja; a hatter csak cdn.foxpost.hu https cimet ir ide. */
  icon_url?: string | null
}

/** A tartalek lista szovegei a Figma allapotai szerint (486:346). */
export const FOXPOST_LISTA_SZOVEGEK = {
  ures: "Keress irányítószámra vagy városra.",
  nincs: "Nem találtunk átvételi pontot. Próbáld irányítószámmal.",
  hiba: "Nem sikerült betölteni a FOXPOST pontokat.",
}

/**
 * A FOXPOST ATVETELI PONT KIVALASZTASA (Figma 486:3, mobil 486:123, tartalek
 * 486:191 / 486:285, allapotok 486:346).
 *
 * PRIMARY a Foxpost hivatalos terkepes keresoje (`FoxpostKereso`). A
 * foxplus.json alapu lista csak tartalek: ha a kereso nem tolt be, vagy a
 * vevo kifejezetten azt keri. A ket ut ugyanazt kuldi a hatternek: a pont
 * azonositojat, a tobbit a hatter a sajat listajabol irja.
 *
 * A kivalasztott pont a kosarbol jon (a hatter altal irt adat), igy frissites
 * es visszalepes utan is ugyanaz latszik; a "Másik pont választása" ujra a
 * keresot nyitja.
 */
export default function FoxpostValaszto({
  kivalasztott,
  onValaszt,
}: {
  kivalasztott?: FoxpostKivalasztott | null
  /** `forras`: a hivatalos kereso (`finder`) vagy a tartalek lista (`fallback`). */
  onValaszt: (
    pont: FoxpostCsomagpont,
    forras: "finder" | "fallback",
  ) => void | Promise<void>
}) {
  const [mod, setMod] = useState<"kereso" | "lista" | null>(
    kivalasztott?.name ? null : "kereso",
  )

  const valaszt = useCallback(
    async (pont: FoxpostCsomagpont, forras: "finder" | "fallback") => {
      await onValaszt(pont, forras)
      setMod(null)
    },
    [onValaszt],
  )
  const keresobol = useCallback(
    (pont: FoxpostCsomagpont) => valaszt(pont, "finder"),
    [valaszt],
  )
  const listabol = useCallback(
    (pont: FoxpostCsomagpont) => valaszt(pont, "fallback"),
    [valaszt],
  )
  const tartalek = useCallback(() => setMod("lista"), [])

  const mutatPontot = kivalasztott?.name && mod === null

  return (
    <div className="flex flex-col gap-4 pb-8" data-testid="foxpost-valaszto">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h3 className="text-[18px] font-medium text-acr-ink">
            Átvételi pont kiválasztása
          </h3>
          <FoxpostLogo className="h-[34px] w-auto" />
        </div>
        <p className="text-[13px] leading-[18px] text-acr-slate">
          A FOXPOST hivatalos térképes keresője nyílik meg. A hálózat FOXPOST
          automatákat, Z-BOX automatákat és Z-Pont átvevőhelyeket is tartalmaz.
        </p>
      </div>

      {mutatPontot ? (
        <div
          className="flex flex-col gap-1 border border-acr-line bg-acr-white px-4 py-3"
          data-testid="foxpost-kivalasztott"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acr-heritage">
            Kiválasztott átvételi pont
          </p>
          {kivalasztott?.variant ? (
            <p
              className="flex items-center gap-2 text-[12px] text-acr-slate"
              data-testid="foxpost-kivalasztott-tipus"
            >
              {kivalasztott.icon_url ? (
                // a Foxpost sajat tipus-ikonja (a hatter szuri), mint a listaban
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={kivalasztott.icon_url}
                  alt=""
                  className="h-5 w-5 shrink-0 object-contain"
                  data-testid="foxpost-kivalasztott-ikon"
                />
              ) : null}
              {foxpostPontTipus(kivalasztott.variant)}
            </p>
          ) : null}
          <p className="min-w-0 break-words text-[15px] font-medium text-acr-ink">
            {kivalasztott?.name}
          </p>
          {kivalasztott?.address ? (
            <p className="min-w-0 break-words text-[13px] text-acr-slate">
              {kivalasztott.address}
            </p>
          ) : null}
          {foxpostPontReszletek(kivalasztott ?? {}) ? (
            <p
              className="text-[12px] text-acr-slate"
              data-testid="foxpost-kivalasztott-reszletek"
            >
              {foxpostPontReszletek(kivalasztott ?? {})}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setMod("kereso")}
            className="mt-1 self-start text-[13px] text-acr-heritage underline underline-offset-2"
            data-testid="foxpost-masik-pont"
          >
            Másik pont választása
          </button>
        </div>
      ) : null}

      {mod === "kereso" ? (
        <FoxpostKereso onValaszt={keresobol} onTartalek={tartalek} />
      ) : null}

      {mod === "lista" ? (
        <CsomagpontValaszto
          szolgaltato="FOXPOST"
          kereso={(kereses: string) => searchFoxpostPickupPoints(kereses)}
          kivalasztott={null}
          onValaszt={listabol}
          szovegek={FOXPOST_LISTA_SZOVEGEK}
        />
      ) : null}
    </div>
  )
}
