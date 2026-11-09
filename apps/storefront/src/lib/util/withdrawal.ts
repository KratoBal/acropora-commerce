import type { Key } from "@lib/i18n/dictionary"

import type { GuestOrder } from "./guest-order"

/**
 * THE WITHDRAWAL FORM'S RULES (V0.3), PURE. The limits are only sanity bounds and mirror the backend's
 * (`workflows/utils/withdrawal/rules.ts`); nothing here decides who has the right of withdrawal, for which goods or
 * until when: that is the owner's and the lawyer's ([KITÖLTENDŐ] in the texts), and the shop's team reads the
 * declaration as it came.
 */
export const MAX_NAME = 200
export const MAX_ITEMS = 50

/** The order lines a declaration already names (the shop lists the declarations with their line ids). */
export const declaredItemIds = (
  order: Pick<GuestOrder, "withdrawals">,
): Set<string> =>
  new Set(
    (order.withdrawals ?? []).flatMap((withdrawal) => withdrawal.item_ids),
  )

/** The lines a NEW declaration may still name: the ones no declaration holds. */
export const withdrawableItems = (
  order: Pick<GuestOrder, "items" | "withdrawals">,
): GuestOrder["items"] => {
  const taken = declaredItemIds(order)
  return order.items.filter((item) => !taken.has(item.id))
}

/**
 * What the order block draws for the withdrawal: the button, the legal placeholder (the store pickup order is the
 * live animal order of a mixed cart, and whether the right applies to a live animal is a legal question the owner has
 * not answered), or nothing (no lines, or every line already has a declaration).
 */
export type WithdrawalOffer = "button" | "live_animal" | "none"

export const withdrawalOffer = (
  order: Pick<GuestOrder, "items" | "withdrawals" | "shipping">,
): WithdrawalOffer => {
  if (order.items.length === 0) return "none"
  if (order.shipping?.store_pickup === true) return "live_animal"
  return withdrawableItems(order).length > 0 ? "button" : "none"
}

export type WithdrawalFormInput = { itemIds: string[]; name: string }
export type WithdrawalFormErrors = { itemIds?: Key; name?: Key }

/** The name as it is sent: runs of whitespace made one space, trimmed (the shop cleans it again). */
export const cleanedName = (value: string): string =>
  value.replace(/\s+/g, " ").trim()

/** The form's own checks, before anything leaves the browser. An empty object: go on. */
export const withdrawalFormErrors = (
  input: WithdrawalFormInput,
): WithdrawalFormErrors => {
  const errors: WithdrawalFormErrors = {}
  if (input.itemIds.length === 0 || input.itemIds.length > MAX_ITEMS)
    errors.itemIds = "guestOrder.withdrawal.errorItems"
  const name = cleanedName(input.name)
  if (name === "" || name.length > MAX_NAME)
    errors.name = "guestOrder.withdrawal.errorName"
  return errors
}

export type WithdrawalFailure =
  "not_found" | "too_many" | "invalid" | "duplicate" | "unavailable"

/**
 * The backend's HTTP status as the page's kind of failure. A 409 is the shop saying every chosen line already has a
 * declaration; the storefront SDK drops a 4xx body, so the status is all the page gets.
 */
export const withdrawalFailureOfStatus = (
  status: number | undefined,
): WithdrawalFailure =>
  status === 404
    ? "not_found"
    : status === 429
      ? "too_many"
      : status === 400
        ? "invalid"
        : status === 409
          ? "duplicate"
          : "unavailable"

/** The text for each kind of failure: a lockout is not "not found", an already declared line says so, the rest say retry. */
export const withdrawalFailureKey = (failure: WithdrawalFailure): Key =>
  failure === "too_many"
    ? "guestOrder.errorTooMany"
    : failure === "not_found"
      ? "guestOrder.errorNotFound"
      : failure === "duplicate"
        ? "guestOrder.withdrawal.errorDuplicate"
        : "guestOrder.withdrawal.errorSend"
