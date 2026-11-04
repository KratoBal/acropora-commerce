"use client"

import { lookupGuestOrder } from "@lib/data/guest-order"
import { translator } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import {
  guestFormErrors,
  lookupErrorKey,
  type GuestFormErrors,
  type GuestOrder,
} from "@lib/util/guest-order"
import { Button } from "@modules/common/components/ui"
import { useState, useTransition, type FormEvent } from "react"

import GuestOrderView from "./guest-order-view"

/**
 * THE GUEST ORDER LOOKUP FORM (V1.1): the order number and the e-mail address, checked in the browser
 * first (`guestFormErrors`), then sent to the server action. The answer is shown below the form;
 * the address and the number never go into the address bar, and a new search clears the old answer
 * (an answer for one customer must not stay on screen while the next is typed).
 */
export default function GuestOrderForm() {
  const locale = useLocale()
  const t = translator(locale)
  const [orderNumber, setOrderNumber] = useState("")
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<GuestFormErrors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [orders, setOrders] = useState<GuestOrder[] | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setOrders(null)
    setFailure(null)
    const found = guestFormErrors({ orderNumber, email })
    setErrors(found)
    if (found.orderNumber || found.email) return
    startTransition(async () => {
      const result = await lookupGuestOrder({
        orderNumber: orderNumber.trim(),
        email: email.trim(),
      })
      if (result.ok) setOrders(result.orders)
      else setFailure(t(lookupErrorKey(result.kind)))
    })
  }

  return (
    <div className="flex flex-col gap-y-8">
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-y-4"
        data-testid="guest-order-form"
      >
        <Field
          id="guest-order-number"
          label={t("guestOrder.orderNumberLabel")}
          help={t("guestOrder.orderNumberHelp")}
          error={errors.orderNumber ? t(errors.orderNumber) : null}
          value={orderNumber}
          onChange={setOrderNumber}
          inputMode="numeric"
          autoComplete="off"
        />
        <Field
          id="guest-order-email"
          label={t("guestOrder.emailLabel")}
          help={t("guestOrder.emailHelp")}
          error={errors.email ? t(errors.email) : null}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
        />
        <p className="text-[13px] text-acr-slate">
          {t("guestOrder.privacyNote")}
        </p>
        <Button
          type="submit"
          disabled={pending}
          data-testid="guest-order-submit"
        >
          {pending ? t("guestOrder.searching") : t("guestOrder.submit")}
        </Button>
        {failure && (
          <p
            role="alert"
            className="text-[14px] text-acr-ink"
            data-testid="guest-order-failure"
          >
            {failure}
          </p>
        )}
      </form>
      {orders && <GuestOrderView orders={orders} />}
    </div>
  )
}

function Field(props: {
  id: string
  label: string
  help: string
  error: string | null
  value: string
  onChange: (value: string) => void
  type?: string
  inputMode?: "numeric"
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-y-1">
      <label
        htmlFor={props.id}
        className="text-[14px] font-semibold text-acr-ink"
      >
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={`${props.id}-help`}
        className="border border-acr-slate/40 px-3 py-2 text-[15px] text-acr-ink"
      />
      <p id={`${props.id}-help`} className="text-[13px] text-acr-slate">
        {props.help}
      </p>
      {props.error && (
        <p
          role="alert"
          className="text-[13px] text-acr-ink"
          data-testid={`${props.id}-error`}
        >
          {props.error}
        </p>
      )}
    </div>
  )
}
