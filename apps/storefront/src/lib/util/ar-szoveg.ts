import type { Translate } from "@lib/i18n/dictionary"
import { convertToLocale } from "@lib/util/money"

/**
 * EGY ÖSSZEG SZÖVEGE A PÉNZTÁRBAN: a nulla nem "0 Ft", hanem "Ingyenes" / "Free"
 * (acrobot, 2026-11-02): a vevő nem olvas ki árat egy nullából vagy egy
 * kötőjelből. A nem nulla összeg pénzként áll.
 */
export const arSzoveg = (
  amount: number,
  currencyCode: string,
  t: Translate,
): string =>
  amount === 0
    ? t("checkoutShipping.free")
    : convertToLocale({ amount, currency_code: currencyCode })
