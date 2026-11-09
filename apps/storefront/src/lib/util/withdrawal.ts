import type { Key } from "@lib/i18n/dictionary"

import type { GuestOrder, GuestWithdrawal } from "./guest-order"

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
export const withdrawableItems = <T extends { id: string }>(order: {
  items: T[]
  withdrawals?: GuestWithdrawal[]
}): T[] => {
  const taken = declaredItemIds(order)
  return order.items.filter((item) => !taken.has(item.id))
}

/**
 * What the order block draws for the withdrawal: the button, the legal placeholder (the order holds a live animal, and
 * whether the right applies to a live animal is a legal question the owner has not answered), or nothing (no lines,
 * every line already has a declaration, or the shop's answer does not say whether there is a live animal).
 *
 * THE SIGNAL IS `live_animal`, NOT THE STORE PICKUP: the shop offers the store pickup for every cart, so an ordinary
 * pickup order must keep its button (the right of withdrawal does not depend on the way of delivery). An answer without
 * the flag (an older shop) draws nothing: a button or a legal line on a guess is worse than none.
 */
export type WithdrawalOffer = "button" | "live_animal" | "none"

export const withdrawalOffer = (
  order: Pick<GuestOrder, "items" | "withdrawals" | "live_animal">,
): WithdrawalOffer => {
  if (order.items.length === 0) return "none"
  if (order.live_animal === undefined) return "none"
  if (order.live_animal) return "live_animal"
  return withdrawableItems(order).length > 0 ? "button" : "none"
}

/**
 * What the shop tells the signed-in customer's order page about the withdrawal: whether the order holds a live animal
 * (the page then draws the legal placeholder, not the button) and the declarations already made. `null` where it is
 * used means the page has no answer (an older shop, a failure): it then draws nothing.
 */
export type OwnWithdrawalState = {
  liveAnimal: boolean
  withdrawals: GuestWithdrawal[]
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

/**
 * The text for each kind of failure: a lockout is not "not found", an already declared line says so, and the OUTCOME
 * IS UNKNOWN only for `unavailable` (a 5xx, a network failure, an answer without the declaration's id): the shop may
 * have recorded the declaration and the answer got lost (seen on the test shop, 2026-11-09: recorded, shown as failed).
 * That one must NOT tell the customer to just try again, because the second try would be refused as already declared
 * and read as a second error. A 400 (`invalid`) is the shop refusing the request: nothing was recorded, so "try again".
 */
export const withdrawalFailureKey = (failure: WithdrawalFailure): Key =>
  failure === "too_many"
    ? "guestOrder.errorTooMany"
    : failure === "not_found"
      ? "guestOrder.errorNotFound"
      : failure === "duplicate"
        ? "guestOrder.withdrawal.errorDuplicate"
        : failure === "unavailable"
          ? "guestOrder.withdrawal.errorUnknown"
          : "guestOrder.withdrawal.errorSend"

/** Whether the page must read the shop's declarations again after this failure: the declaration may stand already. */
export const withdrawalMayStand = (failure: WithdrawalFailure): boolean =>
  failure === "duplicate" || failure === "unavailable"
