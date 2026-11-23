import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { convertToLocale } from "@lib/util/money"

import { szallitasiSor } from "@lib/util/gls"

import {
  atvetelSorok,
  type SzallitasiOpcioBemenet,
  type SzallitasiOsztaly,
} from "./atvetel-sorok"

/**
 * AZ ÁTVÉTEL ÉS A FIZETÉS DOBOZA A KOSÁR LAP JOBB OSZLOPÁBAN (a terv: egy doboz, alatta az összesítő; task
 * t-20261116-kosar-dobozok). TÁJÉKOZTATÓ, nem választó: a választás a pénztárban marad, ahol a cím is megvan (acrobot, 2026-11-16).
 *
 * ÁTVÉTEL: a bolt saját opciói (név, fix ár vagy "a cím után"), a bolt válaszából (`atvetel-sorok.ts`). Ha a bolt nem válaszolt
 * (`null`) vagy nincs opció, az ÁTVÉTEL rész és vele a doboz NEM jelenik meg: nem állítunk olyat, amit nem tudunk.
 *
 * A BOLTI ÁTVÉTEL FELIRATA UGYANAZ, MINT A PÉNZTÁRBAN (acrobot 54117, a böngészős végigjáráson a kosár "Bolti átvétel", a pénztár "Átvétel üzletben"
 * volt): a pénztár a bolti átvételt a szótár felirata alatt mutatja (`checkoutShipping.storePickup`), a futár-módokat a bolt opció-nevén. A doboz
 * ugyanezt a szabályt követi: a bolt válasza dönti el, MELYIK opció bolti átvétel (`service_zone.fulfillment_set.type === "pickup"`, mérve a
 * teszt Medusán 2026-11-16-án, mező-kérés nélkül is benne van a válaszban), és annak a feliratát a szótár adja, hu és en nyelven.
 *
 * VEGYES KOSÁR (élő állat + kiszállítható tétel): a bolt a kiszállítható rendelés opcióit adja (mérve a teszt Medusán, 2026-11-16:
 * bolti átvétel + GLS + Foxpost, `shipping_class: NORMAL` és a `split_line_ids` az élő állat sorát nevezi), a `SplitNotice` pedig
 * két rendelést mond. A doboz ilyenkor kimondja, hogy a futár-módok csak a kiszállítandó rendelésre vonatkoznak (barracuda, #787).
 *
 * FIZETÉS: EGY MONDAT, mód- és számlista nélkül. Mérve a teszt Medusán (2026-11-16): a `GET /store/payment-options` cím és
 * szállítási választás nélküli kosárra üres listát ad (a backend a választott szállítási opcióból dönti el, mi engedett), tehát a
 * kosár lap módokat NEM tud adatból felsorolni, és kitalálni sem szabad.
 */
export default function AtvetelFizetes({
  opciok,
  currencyCode,
  countryCode,
  szetvalasztott = false,
  osztaly = null,
}: {
  /** a penztar osztalyozasa (Foxpost, GLS pont es haz): ebbol a szotar adja a mod nevet; `null`: a bolt neve */
  osztaly?: SzallitasiOsztaly | null
  /** a vegyes kosar (elo allat + kiszallithato) ket rendelesre bomlik: a futar-modok csak a kiszallitando reszre vonatkoznak */
  szetvalasztott?: boolean
  opciok: readonly SzallitasiOpcioBemenet[] | null | undefined
  currencyCode: string
  countryCode: string
}) {
  const sorok = atvetelSorok(opciok, osztaly)
  if (sorok.length === 0) return null
  const t = translator(localeOf(countryCode))

  return (
    <section
      className="flex flex-col gap-4 border border-acr-line bg-acr-mist p-[18px]"
      data-testid="atvetel-fizetes"
    >
      <div className="flex flex-col gap-2" data-testid="atvetel-resz">
        <span className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-ocean">
          {t("cartPage.atvetelTitle")}
        </span>
        <ul className="flex flex-col gap-1 text-[14px] leading-[22px] text-acr-ink">
          {sorok.map((sor) => (
            <li
              key={sor.azonosito}
              className="flex flex-wrap justify-between gap-x-4"
              data-testid="atvetel-sor"
            >
              <span>
                {sor.bolti
                  ? t("checkoutShipping.storePickup")
                  : sor.fajta
                    ? szallitasiSor(sor.fajta, t).nev
                    : sor.nev}
              </span>
              <span className="text-acr-slate">
                {sor.ar.tipus === "fix"
                  ? convertToLocale({
                      amount: sor.ar.osszeg,
                      currency_code: currencyCode,
                    })
                  : t("cartPage.atvetelArCimUtan")}
              </span>
            </li>
          ))}
        </ul>
        {szetvalasztott && (
          <p
            className="text-[13px] leading-[20px] text-acr-slate"
            data-testid="atvetel-futar-resz"
          >
            {t("cartPage.atvetelFutarResz")}
          </p>
        )}
        <p className="text-[13px] leading-[20px] text-acr-slate">
          {t("cartPage.atvetelLabjegyzet")}
        </p>
      </div>
      <div className="flex flex-col gap-2" data-testid="fizetes-resz">
        <span className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-ocean">
          {t("cartPage.fizetesTitle")}
        </span>
        <p className="text-[14px] leading-[22px] text-acr-slate">
          {t("cartPage.fizetesSzoveg")}
        </p>
      </div>
    </section>
  )
}
