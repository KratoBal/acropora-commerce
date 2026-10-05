import { HttpTypes } from "@medusajs/types"

import { convertToLocale } from "@lib/util/money"
import {
  GLS_KOVETKEZO_LEPES,
  KOVETKEZO_LEPES,
  type Teljesites,
  sikeroldal,
} from "@lib/util/sikeroldal"
import FoxpostLogo from "@modules/checkout/components/foxpost-logo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
  /** Vegyes kosarnal a masik rendeles (a P4-2 bontas parja), ha betoltheto. */
  par?: HttpTypes.StoreOrder | null
  /** A par a bolti atveteles-e (akkor ez a kiszallitott), vagy forditva. */
  parBolti?: boolean
}

/**
 * A RENDELES-VISSZAIGAZOLAS (Figma 488:2 desktop, 488:55 mobil, valtozatok
 * 488:94). Teljesites: rendelesenkent kulon blokk, a FOXPOST-nal a hivatalos
 * logoval es a valasztott ponttal; vegyes kosarnal a kiszallitott es a bolti
 * resz kulon. Osszesito: rendelesszam, fizetes, vegosszeg, rendelesek szama.
 *
 * Amit a keret mond, de mi nem allitunk, a `sikeroldal.ts` fejleceben all
 * (szallitasi level, fenntartasi ido, "fizetett").
 */
export default async function OrderCompletedTemplate({
  order,
  par = null,
  parBolti = false,
}: OrderCompletedTemplateProps) {
  const lap = sikeroldal(order, par, parBolti)
  const penz = (amount: number) =>
    convertToLocale({ amount, currency_code: order.currency_code })

  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[1180px] flex-col gap-8"
        data-testid="order-complete-container"
      >
        <header className="flex flex-col items-center text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-acr-heritage text-[24px] text-acr-white"
            aria-hidden="true"
          >
            ✓
          </span>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-acr-heritage">
            Rendelés sikeres
          </p>
          <h1 className="mt-2 text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
            <span className="small:hidden">Köszönjük!</span>
            <span className="hidden small:inline">Köszönjük a rendelésed!</span>
          </h1>
          <p className="mt-2 text-[15px] text-acr-ink" data-testid="order-id">
            {lap.rendelesszam}
          </p>
          <p className="mt-1 text-[13px] text-acr-slate">
            A rendeléshez megadott e-mail-cím:{" "}
            <span className="text-acr-ink" data-testid="order-email">
              {lap.email}
            </span>
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 small:grid-cols-[1fr_420px]">
          <section
            className="border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6"
            data-testid="teljesites"
          >
            <h2 className="mb-4 text-[22px] font-normal text-acr-ink small:text-[26px]">
              Teljesítés
            </h2>
            <div className="flex flex-col gap-4">
              {lap.teljesitesek.map((t) => (
                <TeljesitesBlokk key={t.cimke} t={t} penz={penz} />
              ))}
              {lap.rendelesekSzama > 1 ? (
                <p
                  className="text-[13px] text-acr-ink"
                  data-testid="ket-teljesites"
                >
                  A két teljesítés külön rendelésként követhető.
                </p>
              ) : null}
              {lap.teljesitesek.some((t) => t.szallito !== "bolt") ? (
                <div
                  className="bg-acr-mist px-4 py-4"
                  data-testid="mi-tortenik"
                >
                  <p className="text-[14px] font-medium text-acr-ink">
                    Mi történik ezután?
                  </p>
                  <p className="mt-1 text-[13px] text-acr-slate">
                    {lap.teljesitesek.some((t) => t.szallito === "gls")
                      ? GLS_KOVETKEZO_LEPES
                      : KOVETKEZO_LEPES}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <aside
            className="self-start border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6"
            data-testid="rendeles-osszesito"
          >
            <h2 className="mb-4 text-[22px] font-normal text-acr-ink small:text-[26px]">
              Rendelés összesítő
            </h2>
            <dl className="flex flex-col gap-3 text-[13px] text-acr-slate">
              <Sor cimke="Rendelésszám" ertek={lap.rendelesszam} />
              <Sor cimke="Fizetés" ertek={lap.fizetes} />
              <Sor cimke="Végösszeg" ertek={penz(lap.vegosszeg)} />
              <Sor cimke="Rendelések" ertek={`${lap.rendelesekSzama} db`} />
            </dl>
            <LocalizedClientLink
              href="/account/orders"
              className="mt-6 flex h-12 items-center justify-center bg-acr-heritage text-[15px] font-semibold text-acr-white hover:opacity-90"
              data-testid="rendeleseim"
            >
              Rendeléseim megnyitása
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/"
              className="mt-3 flex h-11 items-center justify-center border border-acr-line text-[14px] font-medium text-acr-ink hover:border-acr-slate"
            >
              Vissza a webshophoz
            </LocalizedClientLink>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Sor({ cimke, ertek }: { cimke: string; ertek: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{cimke}</dt>
      <dd className="text-right text-acr-ink">{ertek}</dd>
    </div>
  )
}

function TeljesitesBlokk({
  t,
  penz,
}: {
  t: Teljesites
  penz: (amount: number) => string
}) {
  const foxpost = t.szallito === "foxpost"
  return (
    <div
      className={clx(
        "border px-4 py-4",
        foxpost
          ? "border-[#b30000] bg-[#fff1f1]"
          : "border-acr-line bg-acr-white",
      )}
      data-testid="teljesites-blokk"
      data-szallito={t.szallito}
    >
      <div className="flex flex-col gap-3 small:flex-row small:items-start">
        {foxpost ? <FoxpostLogo className="h-[44px] w-auto shrink-0" /> : null}
        {t.logo ? (
          // a GLS hivatalos logoja a pont fajtajahoz (GLS-prompt 10)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.logo}
            alt=""
            className="h-[22px] w-auto shrink-0 small:mt-1"
            data-testid="teljesites-logo"
          />
        ) : null}
        <div className="min-w-0">
          <p
            className={clx(
              "text-[11px] font-semibold uppercase tracking-[0.06em]",
              foxpost ? "text-[#b30000]" : "text-acr-heritage",
            )}
          >
            {t.cimke}
          </p>
          {t.tipus && t.tipus !== t.hely ? (
            <p
              className="text-[12px] text-acr-slate"
              data-testid="teljesites-tipus"
            >
              {t.tipus}
            </p>
          ) : null}
          <p className="text-[15px] font-medium text-acr-ink">{t.hely}</p>
          <p className="text-[12px] text-acr-slate">{t.cim}</p>
        </div>
      </div>
      <ul className="mt-3 text-[13px] text-acr-ink">
        {t.tetelek.map((sor) => (
          <li key={sor}>{sor}</li>
        ))}
      </ul>
      {t.szallito !== "bolt" ? (
        <p className="mt-2 text-[13px] text-acr-ink">
          Szállítás: {penz(t.szallitasiDij)}
        </p>
      ) : null}
      {t.kezelesiDij !== null ? (
        <p className="text-[13px] text-acr-ink" data-testid="kezelesi-dij">
          Utánvét kezelési díj: {penz(t.kezelesiDij)}
        </p>
      ) : null}
      {t.atvetelkorFizetendo !== null ? (
        <p
          className="mt-2 border-l-2 border-acr-heritage bg-acr-mist px-3 py-2 text-[13px] font-medium text-acr-ink"
          data-testid="atvetelkor-fizetendo"
        >
          Átvételkor fizetendő: {penz(t.atvetelkorFizetendo)}
        </p>
      ) : null}
    </div>
  )
}
