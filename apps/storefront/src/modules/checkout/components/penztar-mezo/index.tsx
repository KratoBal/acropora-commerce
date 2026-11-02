"use client"

import { useLocale, useTranslate } from "@lib/i18n/use-translate"
import { orszagNev } from "@lib/util/penztar-cim"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React, { useId } from "react"
import { useFormStatus } from "react-dom"

/**
 * A PÉNZTÁR VILÁGOS MEZŐI. A közös `Input`, `CountrySelect` és `SubmitButton`
 * a fiók oldalain is áll (cím felvétele és szerkesztése), ezért azok kinézetét
 * ez a kör nem változtatja; a pénztár a saját, `acr-` tokenes mezőit használja.
 * A mező neve, az `autoComplete`, a `required` és a `data-testid` ugyanaz, mint
 * a régi mezőé: az űrlap beküldése (`setAddresses`) a `name`-ekből olvas.
 *
 * A CÍMKE A MEZŐ FÖLÖTT ÁLL (nem lebeg): a felolvasó a `<label htmlFor>`-ból
 * kapja a nevet (FE-9), a lebegő címke pedig a kitöltött mezőn takarná magát.
 */
type MezoProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "placeholder"
> & {
  label: string
  name: string
}

const MEZO_OSZTALY =
  "h-12 w-full border border-acr-line bg-acr-white px-3 text-[14px] leading-[22px] text-acr-ink outline-none focus:border-acr-ink"

function CimkeSor({
  id,
  label,
  required,
}: {
  id: string
  label: string
  required?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate"
    >
      {label}
      {required && (
        <span aria-hidden="true" className="text-acr-heritage">
          {" "}
          *
        </span>
      )}
    </label>
  )
}

export const PenztarMezo = React.forwardRef<HTMLInputElement, MezoProps>(
  ({ label, required, className, id, ...props }, ref) => {
    const generalt = useId()
    const mezoId = id ?? generalt
    return (
      <div className="flex w-full flex-col gap-1.5">
        <CimkeSor id={mezoId} label={label} required={required} />
        <input
          ref={ref}
          id={mezoId}
          required={required}
          className={clx(MEZO_OSZTALY, className)}
          {...props}
        />
      </div>
    )
  },
)
PenztarMezo.displayName = "PenztarMezo"

type OrszagProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  name: string
  region?: HttpTypes.StoreRegion
}

/** Az ország választó: a régió országai, az első sor a címke. */
export function PenztarOrszag({
  region,
  required,
  className,
  id,
  value,
  ...props
}: OrszagProps) {
  const t = useTranslate()
  const locale = useLocale()
  const generalt = useId()
  const mezoId = id ?? generalt
  const label = t("checkoutPage.country")
  return (
    <div className="flex w-full flex-col gap-1.5">
      <CimkeSor id={mezoId} label={label} required={required} />
      <select
        id={mezoId}
        required={required}
        value={value ?? ""}
        className={clx(MEZO_OSZTALY, className)}
        {...props}
      >
        <option disabled value="">
          {label}
        </option>
        {region?.countries?.map((country) => (
          <option key={country.iso_2} value={country.iso_2}>
            {orszagNev(country.iso_2, locale) || country.display_name}
          </option>
        ))}
      </select>
    </div>
  )
}

/** A pénztár lépésének tovább-gombja: a beküldés alatt `disabled`, mint a közös gomb. */
export function PenztarGomb({
  children,
  className,
  "data-testid": testId,
}: {
  children: React.ReactNode
  className?: string
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={clx(
        "flex h-12 items-center justify-center bg-acr-navy px-8 text-[14px] font-medium text-acr-white disabled:opacity-60",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </button>
  )
}
