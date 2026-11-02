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

/**
 * A pénztár lépésének tovább-gombja: a beküldés alatt `disabled`, mint a közös
 * gomb. Űrlapon kívül (`type="button"`) a hívó adja a `loading` és a `disabled`
 * állapotot, és az `onClick`-et.
 */
export function PenztarGomb({
  children,
  className,
  type = "submit",
  onClick,
  loading = false,
  disabled = false,
  "data-testid": testId,
}: {
  children: React.ReactNode
  className?: string
  type?: "submit" | "button"
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()
  const foglalt = pending || loading
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={foglalt || disabled}
      aria-busy={foglalt}
      className={clx(
        "flex h-12 items-center justify-center bg-acr-navy px-8 text-[14px] font-medium text-acr-white disabled:opacity-60",
        className,
      )}
      data-testid={testId}
    >
      {foglalt ? (
        <span
          aria-hidden="true"
          className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-acr-white border-t-transparent"
          data-testid="penztar-gomb-forgo"
        />
      ) : null}
      {children}
    </button>
  )
}

/** A választó kártyák jelölője (rádió): kitöltött kör a kijelölt soron. */
export function PenztarRadioJelolo({ kijelolt }: { kijelolt: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={clx(
        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
        kijelolt ? "border-acr-navy" : "border-acr-slate",
      )}
      data-checked={kijelolt}
    >
      {kijelolt && <span className="h-2 w-2 rounded-full bg-acr-navy" />}
    </span>
  )
}
