import {
  ELUTASITOTT_KARTYA,
  type StripeAllapot,
} from "@lib/util/stripe-allapot"

/**
 * A STRIPE-MEZO ALLAPOTA A FIZETESI LEPESBEN (a keretek: feldolgozas 477:166 /
 * 477:890, elutasitas 477:315 / 477:997, a 3DS utani ellenorzes 477:619 /
 * 477:1217).
 *
 * A 3DS SAJAT KERETE (477:463 / 477:1103) NEM KESZULT EL, ES SZANDEKOSAN. A
 * keret egy "Hitelesítés folytatása" gombot mutat, vagyis azt, hogy MI
 * inditjuk a banki hitelesitest. A mai ut (`confirmPayment`, `redirect:
 * "if_required"`) ezt a Stripe-ra bizza: a Stripe maga nyitja meg a bank
 * ablakat, es elotte nem jelzi, hogy nyitni fog. A keret hu masa a
 * szerveroldali befejezest (`handleNextAction`) igenyelne, az pedig a
 * fizetesi ut ujrairasa, amit a prompt 15. pontja kizar. Helyette a
 * feldolgozas panelje mondja ki, hogy a bank kerhet hitelesitest, es hogy a
 * fizetes addig nincs befejezve; a tobbit a Stripe ablaka mutatja.
 */
export default function StripeAllapotPanel({
  allapot,
}: {
  allapot: StripeAllapot
}) {
  if (allapot === "elutasitva") {
    return (
      <p
        role="alert"
        className="mt-3 border border-red-700 bg-red-50 px-3 py-2 text-[12px] leading-[17px] text-red-700"
        data-testid="stripe-elutasitva"
      >
        {ELUTASITOTT_KARTYA}
      </p>
    )
  }

  if (allapot === "feldolgozas" || allapot === "ellenorzes") {
    const feldolgozas = allapot === "feldolgozas"
    return (
      <div
        role="status"
        aria-live="polite"
        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[color-mix(in_srgb,var(--acr-color-white)_90%,transparent)] px-4 text-center"
        data-testid={feldolgozas ? "stripe-feldolgozas" : "stripe-ellenorzes"}
      >
        <p className="text-[15px] font-medium leading-[20px] text-acr-ink">
          {feldolgozas ? "Fizetés feldolgozása…" : "Fizetés ellenőrzése…"}
        </p>
        <p className="mt-1 text-[12px] leading-[17px] text-acr-slate">
          {feldolgozas
            ? "Ne zárd be az oldalt."
            : "A banki hitelesítés eredményét ellenőrizzük."}
        </p>
        {feldolgozas && (
          <p
            className="mt-3 max-w-[420px] text-[12px] leading-[17px] text-acr-heritage"
            data-testid="stripe-3ds-jelzes"
          >
            Ha a bankod további hitelesítést kér, a Stripe biztonságos ablaka
            most megnyílik. A fizetés addig nincs befejezve.
          </p>
        )}
      </div>
    )
  }

  return null
}
