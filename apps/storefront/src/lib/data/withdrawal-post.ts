/*
  NOT A SERVER ACTION, ON PURPOSE, AND IT MUST NEVER BECOME ONE. `postWithdrawal(path, body, authHeaders)` posts to
  whatever shop path it is given: as a "use server" function it would be a public endpoint a browser could call with any
  path. It is only imported by the two action files next to it (`withdrawal.ts`, `own-withdrawal.ts`), which fix the path.
  The form imports only its TYPE from here (erased in the build).
*/
import { headers as requestHeaders } from "next/headers"

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
 * THE WITHDRAWAL DECLARATION'S POST (V0.3), shared by the guest action and the signed-in one, so both spend ONE limit and
 * answer alike. Not an action itself (a file of actions may export only async functions, and this one must not import
 * the session cookie: a client component that imports the guest action would then pull a server-only module in): the order's own number and the address the customer opened it
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

type ShopAnswer = {
  withdrawal_id?: string
  created_at?: string
  withdrawals?: GuestWithdrawal[]
  already_declared_item_ids?: string[]
}

/** The shop's 201 as the page's result; an answer without the declaration's id is not one. */
const resultOf = (answer: ShopAnswer | undefined): WithdrawalResult =>
  answer?.withdrawal_id
    ? {
        ok: true,
        withdrawalId: answer.withdrawal_id,
        createdAt: answer.created_at ?? "",
        ...(Array.isArray(answer.withdrawals)
          ? { withdrawals: answer.withdrawals }
          : {}),
        alreadyDeclaredItemIds: Array.isArray(answer.already_declared_item_ids)
          ? answer.already_declared_item_ids
          : [],
      }
    : { ok: false, failure: "unavailable" }

export const postWithdrawal = async (
  path: string,
  body: Record<string, unknown>,
  authHeaders?: Record<string, string>,
): Promise<WithdrawalResult> => {
  // a latogato korlatja a bolt elott: egyetlen latogato ne tudja elhasznalni a bolt rendelesenkenti keretet
  if (!engedelyezett(korlat, latogatoKulcs(await requestHeaders())))
    return { ok: false, failure: "too_many" }
  try {
    return resultOf(
      await sdk.client.fetch<ShopAnswer>(path, {
        method: "POST",
        body,
        ...(authHeaders ? { headers: authHeaders } : {}),
        cache: "no-store",
      }),
    )
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
