import { rendelesSzam } from "@lib/util/rendelesek"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A VISSZAIGAZOLO LAP SZEMELYES ADATOK NELKUL (audit P1/5). Ezt kapja, aki a
 * rendelesazonositoval erkezik, de nem o adta le (nincs meg a leadaskor kapott
 * aláírt sütije, és nem a bejelentkezett tulajdonos): csak a rendelésszám és a
 * köszönet, se név, se cím, se telefonszám, se e-mail-cím.
 */
export default function OrderCompletedMinimal({
  displayId,
}: {
  displayId: number | string | null | undefined
}) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[640px] flex-col items-center gap-4 text-center"
        data-testid="order-complete-minimal"
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-acr-heritage text-[24px] text-acr-white"
          aria-hidden="true"
        >
          ✓
        </span>
        <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
          Köszönjük a rendelésed!
        </h1>
        {displayId === null || displayId === undefined ? null : (
          <p className="text-[15px] text-acr-ink" data-testid="order-id">
            {rendelesSzam(displayId)}
          </p>
        )}
        <p className="text-[13px] text-acr-slate">
          A rendelésed részleteit a visszaigazoló e-mailben találod. Ha van
          fiókod, a rendeléseidet bejelentkezés után a Rendeléseim oldalon is
          megnézheted.
        </p>
        <LocalizedClientLink
          href="/account/orders"
          className="mt-2 flex h-12 items-center justify-center bg-acr-heritage px-6 text-[15px] font-semibold text-acr-white hover:opacity-90"
          data-testid="rendeleseim"
        >
          Rendeléseim megnyitása
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/"
          className="flex h-11 items-center justify-center border border-acr-line px-6 text-[14px] font-medium text-acr-ink hover:border-acr-slate"
        >
          Vissza a webshophoz
        </LocalizedClientLink>
      </div>
    </div>
  )
}
