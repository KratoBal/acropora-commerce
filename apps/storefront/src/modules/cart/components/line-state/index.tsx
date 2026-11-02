import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import {
  CART_LINE_LABEL,
  NOT_INCREMENTABLE,
  SIMILAR_PIECES_LABEL,
  UNIQUE_IN_CART_PROMISE,
  type CartLineState,
} from "./line-state"

/**
 * A KOSÁRSOR ÁLLAPOTÁNAK JELZÉSE. Az állapotot a `line-state.ts` dönti el; itt
 * csak az látszik, amit a vevő lát: a jelvény, az ígéret-mondat, az út tovább.
 * NORMAL állapotban semmi nem kerül a sorba.
 */
export default function CartLineState({
  state,
  similarHref,
  countryCode,
}: {
  state: CartLineState
  similarHref: string
  countryCode: string
}) {
  if (state === "NORMAL") return null
  const t = translator(localeOf(countryCode))

  if (state === "ELKELT") {
    const felirat = CART_LINE_LABEL.ELKELT
    return (
      <div className="mt-1 flex flex-col gap-1" data-testid="cart-line-elkelt">
        <span
          className="w-fit bg-acr-ink px-2 py-0.5 text-[10px] font-medium uppercase leading-[12px] tracking-[1.8px] text-acr-white"
          data-testid="cart-line-elkelt-csip"
        >
          {felirat ? t(felirat) : null}
        </span>
        <LocalizedClientLink
          href={similarHref}
          className="w-fit text-[14px] text-acr-ocean underline"
          data-testid="cart-line-hasonlo-link"
        >
          {t(SIMILAR_PIECES_LABEL)}
        </LocalizedClientLink>
      </div>
    )
  }

  const felirat = CART_LINE_LABEL.EGYEDI
  return (
    <div className="mt-1 flex flex-col gap-1" data-testid="cart-line-egyedi">
      <span
        data-testid="cart-line-egyedi-csip"
        className="w-fit bg-acr-heritage px-2 py-0.5 text-[10px] font-medium uppercase leading-[12px] tracking-[1.8px] text-acr-white"
      >
        {felirat ? t(felirat) : null}
      </span>
      <span
        className="text-[12px] leading-[18px] text-acr-slate"
        data-testid="egyedi-kosar-igeret"
      >
        {t(UNIQUE_IN_CART_PROMISE)}
      </span>
    </div>
  )
}

/** A mennyiség-léptető helyén álló szöveg egyedi példánynál. */
export function NotIncrementable({ countryCode }: { countryCode: string }) {
  const t = translator(localeOf(countryCode))

  return (
    <span
      className="text-[12px] text-acr-slate"
      data-testid="cart-line-nem-novelheto"
    >
      {t(NOT_INCREMENTABLE)}
    </span>
  )
}
