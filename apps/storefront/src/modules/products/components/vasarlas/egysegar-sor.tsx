"use client"

import { useTranslate } from "@lib/i18n/use-translate"
import { egysegarVaz } from "@lib/util/egysegar-vaz"
import { convertToLocale } from "@lib/util/money"

import { useVasarlas } from "./kontextus"

/** AZ EGYSEGAR-SOR A TERMEKLAPON: az ar alatt, a kivalasztott valtozatra (`egysegarVaz`). */
export function EgysegarSor() {
  const t = useTranslate()
  const a = useVasarlas()
  if (!a) return null
  const egysegar = egysegarVaz(a.product, a.selectedVariant)
  if (!egysegar) return null
  const penz = convertToLocale({
    amount: egysegar.ar,
    currency_code: a.selectedVariant?.calculated_price?.currency_code ?? "huf",
  })
  return (
    <p
      className="text-[12.5px]"
      style={{
        marginTop: "4px",
        color: "var(--terv-szoveg-halvany)",
        fontFamily: "var(--terv-betu-fo-lanc)",
      }}
      data-testid="vaz-egysegar"
      data-kiszereles={egysegar.kiszereles}
    >
      {t("product.unitPrice", { price: penz, unit: egysegar.alap })}
    </p>
  )
}
