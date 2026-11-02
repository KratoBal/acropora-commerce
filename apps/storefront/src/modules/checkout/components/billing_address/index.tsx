import { useLocale, useTranslate } from "@lib/i18n/use-translate"
import { HttpTypes } from "@medusajs/types"
import React, { useState } from "react"
import { PenztarMezo, PenztarOrszag } from "../penztar-mezo"

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const t = useTranslate()
  const locale = useLocale()
  const [formData, setFormData] = useState<Record<string, string>>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
        {/* a nevek sorrendje a nyelvé: magyarul előbb a vezetéknév (a mezők nevei és a beküldés ugyanazok) */}
        {locale === "hu" ? (
          <>
            <PenztarMezo
              label={t("checkoutPage.lastName")}
              name="billing_address.last_name"
              autoComplete="family-name"
              value={formData["billing_address.last_name"]}
              onChange={handleChange}
              required
              data-testid="billing-last-name-input"
            />
            <PenztarMezo
              label={t("checkoutPage.firstName")}
              name="billing_address.first_name"
              autoComplete="given-name"
              value={formData["billing_address.first_name"]}
              onChange={handleChange}
              required
              data-testid="billing-first-name-input"
            />
          </>
        ) : (
          <>
            <PenztarMezo
              label={t("checkoutPage.firstName")}
              name="billing_address.first_name"
              autoComplete="given-name"
              value={formData["billing_address.first_name"]}
              onChange={handleChange}
              required
              data-testid="billing-first-name-input"
            />
            <PenztarMezo
              label={t("checkoutPage.lastName")}
              name="billing_address.last_name"
              autoComplete="family-name"
              value={formData["billing_address.last_name"]}
              onChange={handleChange}
              required
              data-testid="billing-last-name-input"
            />
          </>
        )}
        <PenztarMezo
          label={t("checkoutPage.address")}
          name="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="billing-address-input"
        />
        <PenztarMezo
          label={t("checkoutPage.company")}
          name="billing_address.company"
          value={formData["billing_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="billing-company-input"
        />
        <PenztarMezo
          label={t("checkoutPage.postalCode")}
          name="billing_address.postal_code"
          autoComplete="postal-code"
          value={formData["billing_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="billing-postal-input"
        />
        <PenztarMezo
          label={t("checkoutPage.city")}
          name="billing_address.city"
          autoComplete="address-level2"
          value={formData["billing_address.city"]}
          onChange={handleChange}
        />
        <PenztarOrszag
          name="billing_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["billing_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="billing-country-select"
        />
        <PenztarMezo
          label={t("checkoutPage.province")}
          name="billing_address.province"
          autoComplete="address-level1"
          value={formData["billing_address.province"]}
          onChange={handleChange}
          data-testid="billing-province-input"
        />
        <PenztarMezo
          label={t("checkoutPage.phone")}
          name="billing_address.phone"
          autoComplete="tel"
          value={formData["billing_address.phone"]}
          onChange={handleChange}
          data-testid="billing-phone-input"
        />
      </div>
    </>
  )
}

export default BillingAddress
