import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"

import {
  MarkableLineItem,
  findCashOnDeliveryFeeLineItems,
} from "./cod-fee-line-item"

/**
 * Deciding what a cart owes in cash-on-delivery fee, and what has to change on
 * it to get there.
 *
 * This file is pure: it takes the fee that is due and the lines the cart
 * already carries, and returns a plan. It performs no I/O, so both insertion
 * points (the store endpoint at the moment of selection, and the cart hook that
 * runs after every cart operation) reach the same verdict from the same rule.
 *
 * The plan is deliberately small. There is no "correct the amount" action: see
 * `staleAmount` below.
 */

export type ReconcilableLineItem = MarkableLineItem & {
  unit_price?: BigNumberInput | null
}

export type CashOnDeliveryFeeStaleAmount = {
  id: string | null
  current: BigNumberInput | null
  configured: number
}

export type CashOnDeliveryFeePlan = {
  action: "none" | "add" | "remove"
  /** The amount to charge. Zero unless the action is "add". */
  amount: number
  /** The lines to delete. Empty unless the action is "remove". */
  removeIds: string[]
  /**
   * A fee line that no longer matches the configured amount.
   *
   * This is REPORTED, never acted on. Rewriting the amount on a cart that
   * already carries the fee would move the total under a customer who is
   * already in checkout, and any total change deletes their payment session,
   * so a routine price change in the admin would silently drop live carts back
   * to the payment step. The amount a customer was shown when they chose cash
   * on delivery is the amount they pay; the new amount applies to the next
   * cart that asks for one.
   */
  staleAmount: CashOnDeliveryFeeStaleAmount | null
  /** Why, in one sentence, for the log line and the endpoint response. */
  reason: string
}

const idsOf = (items: ReconcilableLineItem[]): string[] =>
  items.map((item) => item.id).filter((id): id is string => !!id)

/**
 * Fee lines in a stable order.
 *
 * The query layer makes no ordering promise, and "keep one, delete the rest"
 * must not depend on which one happened to come back first: two runs would
 * delete different lines. Medusa ids sort in creation order, so the earliest
 * line is the one that survives.
 */
const orderedFeeItems = <T extends ReconcilableLineItem>(
  items: (T | null | undefined)[] | null | undefined
): T[] =>
  findCashOnDeliveryFeeLineItems(items).sort((a, b) =>
    (a.id ?? "").localeCompare(b.id ?? "")
  )

const amountMatches = (
  item: ReconcilableLineItem,
  amount: number
): boolean =>
  item.unit_price !== null &&
  item.unit_price !== undefined &&
  MathBN.eq(item.unit_price, amount)

/**
 * What has to happen to this cart so that its fee lines match what it owes.
 *
 * `dueHuf` is the fee the cart owes right now, which is zero whenever cash on
 * delivery is not both selected and allowed. The caller owns that decision;
 * this function only compares it against what is on the cart.
 */
export const planCashOnDeliveryFee = <T extends ReconcilableLineItem>({
  dueHuf,
  items,
}: {
  dueHuf: number
  items: (T | null | undefined)[] | null | undefined
}): CashOnDeliveryFeePlan => {
  const feeItems = orderedFeeItems(items)

  if (dueHuf <= 0) {
    if (!feeItems.length) {
      return {
        action: "none",
        amount: 0,
        removeIds: [],
        staleAmount: null,
        reason: "No cash-on-delivery fee is due and none is present.",
      }
    }

    return {
      action: "remove",
      amount: 0,
      removeIds: idsOf(feeItems),
      staleAmount: null,
      reason:
        "The cart does not pay cash on delivery, so the fee lines it carries must go.",
    }
  }

  if (!feeItems.length) {
    return {
      action: "add",
      amount: dueHuf,
      removeIds: [],
      staleAmount: null,
      reason:
        "Cash on delivery is selected and allowed, and the cart carries no fee yet.",
    }
  }

  const [kept, ...duplicates] = feeItems

  if (duplicates.length) {
    return {
      action: "remove",
      amount: 0,
      removeIds: idsOf(duplicates),
      staleAmount: null,
      reason: `The cart carries ${feeItems.length} cash-on-delivery fees, and a cart may carry one.`,
    }
  }

  if (!amountMatches(kept, dueHuf)) {
    return {
      action: "none",
      amount: 0,
      removeIds: [],
      staleAmount: {
        id: kept.id ?? null,
        current: kept.unit_price ?? null,
        configured: dueHuf,
      },
      reason:
        "The fee on the cart was charged at a different amount than the one configured now, and it is left as charged.",
    }
  }

  return {
    action: "none",
    amount: 0,
    removeIds: [],
    staleAmount: null,
    reason: "The cart already carries the fee it owes.",
  }
}

/**
 * The hard check, for the one moment where being wrong becomes permanent.
 *
 * Everywhere else a mismatch is repairable and the customer is still shopping,
 * so nothing throws. At cart completion the numbers turn into an order, and
 * both directions of a mismatch are real money: a missing fee is revenue the
 * order will never collect, and a fee that is no longer due overcharges the
 * customer. The store endpoint repairs both, so the error names it.
 *
 * A stale amount is NOT an error here. It is a fee the customer agreed to,
 * and refusing the order over an admin price change would turn a routine
 * setting update into failed checkouts.
 */
export const assertCashOnDeliveryFeeMatchesPayment = <
  T extends ReconcilableLineItem,
>({
  dueHuf,
  items,
}: {
  dueHuf: number
  items: (T | null | undefined)[] | null | undefined
}): void => {
  const feeItems = orderedFeeItems(items)

  if (feeItems.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `This cart carries ${feeItems.length} cash-on-delivery fees and may carry one. Refresh the payment options for the cart before completing it.`
    )
  }

  if (dueHuf > 0 && !feeItems.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This cart pays cash on delivery but carries no handling fee. Refresh the payment options for the cart before completing it."
    )
  }

  if (dueHuf <= 0 && feeItems.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This cart carries a cash-on-delivery handling fee but does not pay cash on delivery. Refresh the payment options for the cart before completing it."
    )
  }
}
