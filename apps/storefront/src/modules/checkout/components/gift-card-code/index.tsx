"use client"

import { TAP_AREA_TIGHT } from "@modules/common/components/tap-area"
import { useTranslateFor } from "@lib/i18n/use-translate"
import { Input, Label, Text } from "@modules/common/components/ui"
import { localeOf } from "@lib/i18n/locale"
import { useParams } from "next/navigation"
import React from "react"

import { applyGiftCard, removeGiftCard } from "@lib/data/cart"
import {
  ajandekkartyaJovairas,
  type KosarJovairassal,
} from "@lib/util/ajandekkartya"
import { convertToLocale } from "@lib/util/money"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

/**
 * AZ AJÁNDÉKKÁRTYA BEVÁLTÁSA (kártya 495c0007), a kedvezménykód mellett, külön mezőben: a kártya fizetőeszköz, nem
 * kedvezmény (a webshop kosár-jóváírásként viszi, a végösszegből vonja le). A kártyáról a webshop csak a rendelés
 * leadásakor von le; amíg a kosárban áll, bármikor levehető. A hibát kiírja (a kedvezménykód-mező szabálya).
 */
const GiftCardCode: React.FC<{
  cart: KosarJovairassal & { currency_code: string }
}> = ({ cart }) => {
  const { countryCode } = useParams() as { countryCode: string }
  const t = useTranslateFor(localeOf(countryCode))
  const [isOpen, setIsOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const jovairas = ajandekkartyaJovairas(cart)

  const bevalt = async (formData: FormData) => {
    setErrorMessage("")
    const code = formData.get("code")?.toString().trim()
    if (!code) return
    const eredmeny = await applyGiftCard(code)
    if (!eredmeny.ok) setErrorMessage(eredmeny.uzenet)
    const input = document.getElementById(
      "gift-card-input",
    ) as HTMLInputElement | null
    if (input && eredmeny.ok) input.value = ""
  }

  const levesz = async () => {
    setErrorMessage("")
    const eredmeny = await removeGiftCard()
    if (!eredmeny.ok) setErrorMessage(eredmeny.uzenet)
  }

  return (
    <div className="w-full flex flex-col txt-medium">
      {jovairas ? (
        <div
          className="flex items-center justify-between w-full mb-2"
          data-testid="gift-card-row"
        >
          <Text className="txt-small-plus">
            {t("cartPage.giftCard")}
            {jovairas.utolso4 ? ` (…${jovairas.utolso4})` : ""}: -{" "}
            {convertToLocale({
              amount: jovairas.osszeg,
              currency_code: cart.currency_code,
            })}
          </Text>
          <button
            type="button"
            className="flex items-center"
            onClick={() => void levesz()}
            data-testid="remove-gift-card-button"
          >
            <Trash size={14} />
            <span className="sr-only">{t("cartPage.giftCardRemove")}</span>
          </button>
        </div>
      ) : null}
      {jovairas && (cart.total ?? 0) > 0 ? (
        /* a jovairas utan a webshop a fizetesi munkamenetet eldobja (a vegosszeg valtozott): a maradekhoz ujra kell valasztani */
        <Text
          className="txt-small text-acr-slate mb-2"
          data-testid="gift-card-rest-note"
        >
          {t("cartPage.giftCardRestNote")}
        </Text>
      ) : null}
      {jovairas ? null : (
        <form action={(a) => bevalt(a)} className="w-full mb-5">
          <Label className="flex gap-x-1 my-2 items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className={`text-[14px] leading-[22px] text-acr-ocean underline hover:text-acr-ink ${TAP_AREA_TIGHT}`}
              data-testid="add-gift-card-button"
            >
              {t("cartPage.giftCardAdd")}
            </button>
          </Label>
          {isOpen && (
            <div className="flex w-full gap-x-2">
              <Input
                className="size-full"
                id="gift-card-input"
                name="code"
                type="text"
                autoComplete="off"
                data-testid="gift-card-input"
              />
              <SubmitButton
                variant="secondary"
                data-testid="gift-card-apply-button"
              >
                {t("cartPage.giftCardApply")}
              </SubmitButton>
            </div>
          )}
        </form>
      )}
      <ErrorMessage
        error={errorMessage}
        data-testid="gift-card-error-message"
      />
    </div>
  )
}

export default GiftCardCode
