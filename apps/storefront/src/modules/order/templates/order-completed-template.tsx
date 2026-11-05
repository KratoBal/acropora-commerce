import { translator, type Translate } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { HttpTypes } from "@medusajs/types"

import { arSzoveg } from "@lib/util/ar-szoveg"
import { convertToLocale } from "@lib/util/money"
import { type Teljesites, sikeroldal } from "@lib/util/sikeroldal"
import FoxpostLogo from "@modules/checkout/components/foxpost-logo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
  /** Vegyes kosarnal a masik rendeles (a P4-2 bontas parja), ha betoltheto. */
  par?: HttpTypes.StoreOrder | null
  /** A par a bolti atveteles-e (akkor ez a kiszallitott), vagy forditva. */
  parBolti?: boolean
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
  /**
   * A LATOGATO NINCS BEJELENTKEZVE (vendeg). Neki a "Rendeleseim" a belepteto lapra visz, a rendeleset viszont a
   * vendeg lapon, a rendelesszammal es az e-mail-cimmel latja: ide kell egy bejarat (2026-11-05, a "Rendelesem"
   * oldal hianylistaja). Bejelentkezve a fiok rendelesei a bejarat, ott nincs szukseg erre.
   */
  vendeg?: boolean
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
  countryCode,
  vendeg = false,
}: OrderCompletedTemplateProps) {
  const t = translator(localeOf(countryCode))
  const lap = sikeroldal(order, par, parBolti, t)
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
            {t("orderConfirmed.success")}
          </p>
          <h1 className="mt-2 text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
            <span className="small:hidden">
              {t("orderConfirmed.thanksShort")}
            </span>
            <span className="hidden small:inline">
              {t("orderConfirmed.thanksLong")}
            </span>
          </h1>
          <p className="mt-2 text-[15px] text-acr-ink" data-testid="order-id">
            {lap.rendelesszam}
          </p>
          <p className="mt-1 text-[13px] text-acr-slate">
            {t("orderConfirmed.emailLine")}{" "}
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
              {t("orderConfirmed.fulfilment")}
            </h2>
            <div className="flex flex-col gap-4">
              {lap.teljesitesek.map((tj) => (
                <TeljesitesBlokk
                  key={tj.cimke}
                  tj={tj}
                  penz={penz}
                  currencyCode={order.currency_code}
                  t={t}
                />
              ))}
              {lap.rendelesekSzama > 1 ? (
                <p
                  className="text-[13px] text-acr-ink"
                  data-testid="ket-teljesites"
                >
                  {t("orderConfirmed.twoFulfilments")}
                </p>
              ) : null}
              {lap.teljesitesek.some((tj) => tj.szallito !== "bolt") ? (
                <div
                  className="bg-acr-mist px-4 py-4"
                  data-testid="mi-tortenik"
                >
                  <p className="text-[14px] font-medium text-acr-ink">
                    {t("orderConfirmed.whatNext")}
                  </p>
                  <p className="mt-1 text-[13px] text-acr-slate">
                    {lap.teljesitesek.some((tj) => tj.szallito === "gls")
                      ? t("orderConfirmed.nextStepGls")
                      : t("orderConfirmed.nextStep")}
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
              {t("orderConfirmed.summary")}
            </h2>
            <dl className="flex flex-col gap-3 text-[13px] text-acr-slate">
              <Sor
                cimke={t("orderConfirmed.orderNumber")}
                ertek={lap.rendelesszam}
              />
              <Sor cimke={t("orderConfirmed.payment")} ertek={lap.fizetes} />
              <Sor
                cimke={t("orderConfirmed.total")}
                ertek={penz(lap.vegosszeg)}
              />
              <Sor
                cimke={t("orderConfirmed.orders")}
                ertek={t("orderConfirmed.ordersCount", {
                  count: lap.rendelesekSzama,
                })}
              />
            </dl>
            <LocalizedClientLink
              href="/account/orders"
              className="mt-6 flex h-12 items-center justify-center bg-acr-heritage text-[15px] font-semibold text-acr-white hover:opacity-90"
              data-testid="rendeleseim"
            >
              {t("orderConfirmed.openOrders")}
            </LocalizedClientLink>
            {vendeg ? (
              <LocalizedClientLink
                href="/rendeles-megtekintese"
                className="mt-3 flex h-11 items-center justify-center border border-acr-line text-[14px] font-medium text-acr-ink hover:border-acr-slate"
                data-testid="rendeles-megtekintese-link"
              >
                {t("orderConfirmed.viewOrderGuest")}
              </LocalizedClientLink>
            ) : null}
            <LocalizedClientLink
              href="/"
              className="mt-3 flex h-11 items-center justify-center border border-acr-line text-[14px] font-medium text-acr-ink hover:border-acr-slate"
            >
              {t("orderConfirmed.backToShop")}
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
  tj,
  penz,
  currencyCode,
  t,
}: {
  tj: Teljesites
  penz: (amount: number) => string
  currencyCode: string
  t: Translate
}) {
  const foxpost = tj.szallito === "foxpost"
  return (
    <div
      className={clx(
        "border px-4 py-4",
        foxpost
          ? "border-[#b30000] bg-[#fff1f1]"
          : "border-acr-line bg-acr-white",
      )}
      data-testid="teljesites-blokk"
      data-szallito={tj.szallito}
    >
      <div className="flex flex-col gap-3 small:flex-row small:items-start">
        {foxpost ? (
          <FoxpostLogo className="h-[44px] w-auto shrink-0 self-start" />
        ) : null}
        {tj.logo ? (
          // a GLS hivatalos logoja a pont fajtajahoz (GLS-prompt 10)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tj.logo}
            alt=""
            className="h-[22px] w-auto shrink-0 self-start small:mt-1"
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
            {tj.cimke}
          </p>
          {tj.tipus && tj.tipus !== tj.hely ? (
            <p
              className="text-[12px] text-acr-slate"
              data-testid="teljesites-tipus"
            >
              {tj.tipus}
            </p>
          ) : null}
          <p className="text-[15px] font-medium text-acr-ink">{tj.hely}</p>
          <p className="text-[12px] text-acr-slate">{tj.cim}</p>
        </div>
      </div>
      <ul className="mt-3 text-[13px] text-acr-ink">
        {tj.tetelek.map((sor) => (
          <li key={sor}>{sor}</li>
        ))}
      </ul>
      {tj.szallito !== "bolt" ? (
        <p className="mt-2 text-[13px] text-acr-ink">
          {t("orderConfirmed.shippingFee", {
            amount: arSzoveg(tj.szallitasiDij, currencyCode, t),
          })}
        </p>
      ) : null}
      {tj.kezelesiDij !== null ? (
        <p className="text-[13px] text-acr-ink" data-testid="kezelesi-dij">
          {t("orderConfirmed.codFee", { amount: penz(tj.kezelesiDij) })}
        </p>
      ) : null}
      {tj.atvetelkorFizetendo !== null ? (
        <p
          className="mt-2 border-l-2 border-acr-heritage bg-acr-mist px-3 py-2 text-[13px] font-medium text-acr-ink"
          data-testid="atvetelkor-fizetendo"
        >
          {t("orderConfirmed.payOnReceipt", {
            amount: penz(tj.atvetelkorFizetendo),
          })}
        </p>
      ) : null}
    </div>
  )
}
