"use client"

import { useCallback, useState } from "react"

import { searchGlsPickupPoints } from "@lib/data/csomagpont"
import type { FoxpostCsomagpont } from "@lib/util/csomagpont"
import {
  GLS_LOGO,
  type GlsPont,
  glsInfoSor,
  glsNyitvatartas,
  glsTipusLogo,
} from "@lib/util/gls"
import CsomagpontValaszto from "@modules/checkout/components/csomagpont-valaszto"
import GlsKereso from "@modules/checkout/components/gls-kereso"

/** A tartalek lista szovegei, szo szerint a Figma allapotaibol (508:426). */
export const GLS_LISTA_SZOVEGEK = {
  ures: "Keress irányítószámra vagy városra.",
  nincs: "Nem találtunk átvételi pontot. Próbáld irányítószámmal.",
  hiba: "Nem sikerült betölteni a GLS pontokat.",
}

/** A kosarban allo, a hatter altal irt pont (`gls_pickup_point`). */
export type GlsKivalasztott = Partial<GlsPont> & {
  name?: string
  address?: string
  street?: string
}

/**
 * A GLS ATVETELI PONT KIVALASZTASA (Figma 508:3, mobil 508:143, tartalek
 * 508:231 / 508:345, allapotok 508:426), a FOXPOST-valaszto mintajara.
 *
 * PRIMARY a GLS hivatalos keresoje (`GlsKereso`); a hatter listaja csak
 * tartalek, automatikusan, ha a kereso nem tolt be (hibauzenet nelkul), vagy
 * ha a vevo keri. Mindket ut csak az azonositot kuldi; a hatter a sajat
 * listajabol ellenoriz es ir.
 */
export default function GlsValaszto({
  optionId,
  nehez,
  kivalasztott,
  onValaszt,
}: {
  optionId: string
  nehez: boolean
  kivalasztott?: GlsKivalasztott | null
  onValaszt: (
    pontId: string,
    forras: "finder" | "fallback",
  ) => void | Promise<void>
}) {
  const [mod, setMod] = useState<"kereso" | "lista" | null>(
    kivalasztott?.name ? null : "kereso",
  )

  const valasztKeresobol = useCallback(
    async (pont: { id: string }) => {
      await onValaszt(pont.id, "finder")
      setMod(null)
    },
    [onValaszt],
  )
  const valasztListabol = useCallback(
    async (pont: FoxpostCsomagpont) => {
      await onValaszt(pont.id, "fallback")
      setMod(null)
    },
    [onValaszt],
  )
  const tartalek = useCallback(() => setMod("lista"), [])
  const mutatPontot = kivalasztott?.name && mod === null

  const nyitva = glsNyitvatartas(kivalasztott?.hours)
  const cim = kivalasztott?.address
    ? [kivalasztott.address, nyitva].filter(Boolean).join(" · ")
    : null

  return (
    <div className="flex flex-col gap-4 pb-8" data-testid="gls-valaszto">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h3 className="text-[18px] font-medium text-acr-ink">
            Átvételi pont kiválasztása
          </h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GLS_LOGO.csomagpont}
            alt="GLS Csomagpont"
            className="h-[22px] w-auto"
          />
        </div>
        <p className="text-[13px] leading-[18px] text-acr-slate">
          {nehez
            ? "A GLS hivatalos térképes keresője. Nehézárut GLS ParcelShopba küldünk."
            : "A GLS hivatalos térképes keresője. A hálózat GLS ParcelShopokat és GLS Automatákat tartalmaz."}
        </p>
      </div>
      {mutatPontot ? (
        <div
          className="flex flex-col gap-1 border border-acr-line bg-acr-white px-4 py-3"
          data-testid="gls-kivalasztott"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-acr-heritage">
              Kiválasztott átvételi pont
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={glsTipusLogo(kivalasztott?.type)}
              alt=""
              className="h-[14px] w-auto"
              data-testid="gls-kivalasztott-logo"
            />
          </div>
          <p className="text-[15px] font-medium text-acr-ink">
            {kivalasztott?.name}
          </p>
          {cim ? <p className="text-[13px] text-acr-slate">{cim}</p> : null}
          <p
            className="text-[12px] text-acr-slate"
            data-testid="gls-kivalasztott-info"
          >
            {glsInfoSor(kivalasztott ?? {})}
          </p>
          <button
            type="button"
            onClick={() => setMod("kereso")}
            className="mt-1 self-start text-[13px] text-acr-heritage underline underline-offset-2"
            data-testid="gls-masik-pont"
          >
            Másik pont választása
          </button>
        </div>
      ) : null}
      {mod === "kereso" ? (
        <GlsKereso
          nehez={nehez}
          onValaszt={valasztKeresobol}
          onTartalek={tartalek}
        />
      ) : null}
      {mod === "lista" ? (
        <div className="flex flex-col gap-2" data-testid="gls-lista">
          <p className="text-[15px] font-medium text-acr-ink">
            GLS átvételi pontok
          </p>
          <CsomagpontValaszto
            szolgaltato="GLS"
            kereso={(kereses: string) =>
              searchGlsPickupPoints(kereses, optionId)
            }
            kivalasztott={null}
            onValaszt={valasztListabol}
            szovegek={GLS_LISTA_SZOVEGEK}
            keresoCimke="Irányítószám, város vagy a pont neve"
          />
        </div>
      ) : null}
    </div>
  )
}
