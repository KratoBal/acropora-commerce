"use client"

import { submitWithdrawal } from "@lib/data/withdrawal"
import { translator, type Key } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import type { GuestOrder, GuestWithdrawal } from "@lib/util/guest-order"
import {
  cleanedName,
  withdrawableItems,
  withdrawalFailureKey,
  withdrawalFormErrors,
  type WithdrawalFormErrors,
} from "@lib/util/withdrawal"
import { Button } from "@modules/common/components/ui"
import { useState, useTransition, type FormEvent } from "react"

/**
 * THE WITHDRAWAL FORM (V0.3): "Elállás a szerződéstől". It opens under an order on the guest page and files a
 * declaration for THAT order with the pair the customer already typed (the order's own number and the address).
 * Two steps, because a declaration is not undone by closing the page: the lines and the name first, then a screen
 * that repeats exactly what will be sent, and only its own button sends. EVERYTHING the customer typed stays on a
 * failure (the text says so). The legal placeholders ([KITÖLTENDŐ]) stand as they are: whether, for what and until
 * when the right applies is the owner's and the lawyer's, not this form's.
 */
export default function WithdrawalForm({
  order,
  email,
  onClose,
  onFiled,
}: {
  order: GuestOrder
  email: string
  onClose: () => void
  /**
   * The shop took the declaration (with the order's list of declarations as it answered), or refused it as already
   * declared (no list: the failed answer carries nothing but its status, so the page reads the orders again).
   */
  onFiled?: (withdrawals?: GuestWithdrawal[]) => void
}) {
  const locale = useLocale()
  const t = translator(locale)
  const [itemIds, setItemIds] = useState<string[]>([])
  const [name, setName] = useState("")
  const [errors, setErrors] = useState<WithdrawalFormErrors>({})
  const [confirming, setConfirming] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [done, setDone] = useState<{ id: string; skipped: string[] } | null>(
    null,
  )
  const [pending, startTransition] = useTransition()
  const orderNumber = String(order.display_id)
  // the lines a declaration already names are not offered again
  const offered = withdrawableItems(order)
  const titleOf = (id: string) =>
    order.items.find((item) => item.id === id)?.title

  const next = (event: FormEvent) => {
    event.preventDefault()
    setFailure(null)
    const found = withdrawalFormErrors({ itemIds, name })
    setErrors(found)
    if (Object.keys(found).length === 0) setConfirming(true)
  }

  const send = () => {
    setFailure(null)
    startTransition(async () => {
      const result = await submitWithdrawal({
        orderNumber,
        email,
        customerName: cleanedName(name),
        itemIds,
      })
      if (result.ok) {
        setDone({
          id: result.withdrawalId,
          skipped: result.alreadyDeclaredItemIds,
        })
        onFiled?.(result.withdrawals)
        return
      }
      // back to the first step: the customer sees what was typed and can change it
      setConfirming(false)
      if (result.failure === "duplicate") onFiled?.()
      setFailure(t(withdrawalFailureKey(result.failure)))
    })
  }

  if (done) {
    const skipped = done.skipped
      .map(titleOf)
      .filter((title): title is string => Boolean(title))
    return (
      <div
        className="flex flex-col gap-y-3 border border-acr-heritage px-4 py-3"
        data-testid="withdrawal-done"
      >
        <p className="text-[14px] text-acr-ink">
          {t("guestOrder.withdrawal.done", { id: done.id })}
        </p>
        {skipped.length > 0 && (
          <p
            className="text-[13px] text-acr-slate"
            data-testid="withdrawal-done-partial"
          >
            {t("guestOrder.withdrawal.donePartial", {
              items: skipped.join(", "),
            })}
          </p>
        )}
        <Button type="button" onClick={onClose}>
          {t("guestOrder.withdrawal.close")}
        </Button>
      </div>
    )
  }

  const fieldError = (key: Key | undefined, id: string) =>
    key ? (
      <p role="alert" className="text-[13px] text-acr-ink" data-testid={id}>
        {t(key)}
      </p>
    ) : null

  if (confirming)
    return (
      <div
        className="flex flex-col gap-y-4 border border-acr-slate/30 px-4 py-4"
        data-testid={`withdrawal-confirm-${order.display_id}`}
      >
        <h3 className="text-[16px] font-semibold text-acr-ink">
          {t("guestOrder.withdrawal.confirmTitle")}
        </h3>
        <p className="text-[14px] text-acr-ink">
          {t("guestOrder.withdrawal.confirmText", { number: orderNumber })}
        </p>
        <ul
          className="flex list-disc flex-col gap-y-1 pl-5 text-[14px] text-acr-ink"
          data-testid="withdrawal-confirm-items"
        >
          {offered
            .filter((item) => itemIds.includes(item.id))
            .map((item) => (
              <li key={item.id}>
                {item.title} × {item.quantity}
              </li>
            ))}
        </ul>
        <p className="text-[14px] text-acr-ink">
          {t("guestOrder.withdrawal.confirmName", { name: cleanedName(name) })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={pending}
            onClick={send}
            data-testid="withdrawal-send"
          >
            {pending
              ? t("guestOrder.withdrawal.sending")
              : t("guestOrder.withdrawal.confirmButton")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setConfirming(false)}
            data-testid="withdrawal-back"
          >
            {t("guestOrder.withdrawal.back")}
          </Button>
        </div>
      </div>
    )

  return (
    <form
      onSubmit={next}
      noValidate
      className="flex flex-col gap-y-4 border border-acr-slate/30 px-4 py-4"
      data-testid={`withdrawal-form-${order.display_id}`}
    >
      <div className="flex flex-col gap-y-1">
        <h3 className="text-[16px] font-semibold text-acr-ink">
          {t("guestOrder.withdrawal.title")}
        </h3>
        <p className="text-[13px] text-acr-slate">
          {t("guestOrder.withdrawal.intro")}
        </p>
      </div>

      <fieldset className="flex flex-col gap-y-1">
        <legend className="text-[14px] font-semibold text-acr-ink">
          {t("guestOrder.withdrawal.itemsLabel")}
        </legend>
        {offered.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-x-2 text-[14px] text-acr-ink"
          >
            <input
              type="checkbox"
              checked={itemIds.includes(item.id)}
              onChange={(event) =>
                setItemIds((current) =>
                  event.target.checked
                    ? [...current, item.id]
                    : current.filter((id) => id !== item.id),
                )
              }
            />
            {item.title} × {item.quantity}
          </label>
        ))}
        {fieldError(errors.itemIds, "withdrawal-items-error")}
      </fieldset>

      <div className="flex flex-col gap-y-1">
        <label
          htmlFor={`withdrawal-name-${order.display_id}`}
          className="text-[14px] font-semibold text-acr-ink"
        >
          {t("guestOrder.withdrawal.nameLabel")}
        </label>
        <input
          id={`withdrawal-name-${order.display_id}`}
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="border border-acr-slate/40 px-3 py-2 text-[15px] text-acr-ink"
        />
        <p className="text-[13px] text-acr-slate">
          {t("guestOrder.withdrawal.nameHelp")}
        </p>
        {fieldError(errors.name, "withdrawal-name-error")}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" data-testid="withdrawal-next">
          {t("guestOrder.withdrawal.next")}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("guestOrder.withdrawal.close")}
        </Button>
      </div>
      {failure && (
        <p
          role="alert"
          className="text-[14px] text-acr-ink"
          data-testid="withdrawal-failure"
        >
          {failure}
        </p>
      )}
    </form>
  )
}
