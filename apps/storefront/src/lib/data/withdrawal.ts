"use server"

import { headers } from "next/headers"

import { sdk } from "@lib/config"
import type { GuestWithdrawal } from "@lib/util/guest-order"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import {
  bejelentesKorlat,
  engedelyezett,
  latogatoKulcs,
} from "@lib/util/vendeg-korlat"
import {
  withdrawalFailureOfStatus,
  type WithdrawalFailure,
} from "@lib/util/withdrawal"

/** Latogatonkent (IP) az elallasi nyilatkozatok korlatja, ebben a kirakat-folyamatban (lasd `vendeg-korlat.ts`). */
const korlat = bejelentesKorlat()

/**
 * The withdrawal declaration's server action (V0.3): the order's own number and the address the customer opened it
 * with, the name the declaration is signed with, and the order lines it names. NOTHING is cached, and the address and
 * the number are never logged: a failure writes only the status code.
 *
 * The shop answers 201 with the declaration's id and the time it came in, plus (when it can read them) the order's
 * declarations and the requested lines that were already withdrawn from (a partly taken request is recorded for the
 * free lines and answered 201, because a 4xx body does not reach this code).
 */
export type WithdrawalResult =
  | {
      ok: true
      withdrawalId: string
      createdAt: string
      /** the order's declarations as the shop answers them (the new one included); absent from an older answer */
      withdrawals?: GuestWithdrawal[]
      alreadyDeclaredItemIds: string[]
    }
  | { ok: false; failure: WithdrawalFailure }

export async function submitWithdrawal(input: {
  orderNumber: string
  email: string
  customerName: string
  itemIds: string[]
}): Promise<WithdrawalResult> {
  // a latogato korlatja a bolt elott: egyetlen latogato ne tudja elhasznalni a bolt rendelesenkenti keretet
  if (!engedelyezett(korlat, latogatoKulcs(await headers())))
    return { ok: false, failure: "too_many" }
  try {
    const answer = await sdk.client.fetch<{
      withdrawal_id?: string
      created_at?: string
      withdrawals?: GuestWithdrawal[]
      already_declared_item_ids?: string[]
    }>("/store/guest-orders/withdrawal", {
      method: "POST",
      body: {
        order_number: input.orderNumber.trim(),
        email: input.email.trim(),
        customer_name: input.customerName,
        item_ids: input.itemIds,
      },
      cache: "no-store",
    })
    return answer?.withdrawal_id
      ? {
          ok: true,
          withdrawalId: answer.withdrawal_id,
          createdAt: answer.created_at ?? "",
          ...(Array.isArray(answer.withdrawals)
            ? { withdrawals: answer.withdrawals }
            : {}),
          alreadyDeclaredItemIds: Array.isArray(
            answer.already_declared_item_ids,
          )
            ? answer.already_declared_item_ids
            : [],
        }
      : { ok: false, failure: "unavailable" }
  } catch (hiba) {
    const status = hibaAllapota(hiba)
    if (status !== 404)
      console.error(
        "Az elállási nyilatkozat elküldése nem sikerült:",
        status ?? "(nincs állapotkód)",
      )
    return { ok: false, failure: withdrawalFailureOfStatus(status) }
  }
}
