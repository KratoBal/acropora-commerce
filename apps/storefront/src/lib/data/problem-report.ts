"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import type { GuestProblemReport } from "@lib/util/guest-order"
import {
  problemFailureOfStatus,
  type ProblemFailure,
  type ProblemKind,
} from "@lib/util/problem-report"

/**
 * The problem report's server action (V1.2, slice 3): the report that names the photos by the ids the upload gave.
 * The photos go up on their own route (`/api/problem-photo`, `lib/util/problem-photo-upload`): their body is far over
 * the server actions' limit. NOTHING is cached, and the customer's address and number are never logged: a failure
 * writes only the status code.
 */
export type ReportResult =
  | {
      ok: true
      reportId: string
      createdAt: string
      /** the order's list of reports as the shop answers it (the new one included); absent from an older answer */
      problemReports?: GuestProblemReport[]
    }
  | { ok: false; failure: ProblemFailure }

const failed = (
  what: string,
  hiba: unknown,
): { ok: false; failure: ProblemFailure } => {
  const status = hibaAllapota(hiba)
  if (status !== 404) console.error(what, status ?? "(nincs állapotkód)")
  return { ok: false, failure: problemFailureOfStatus(status) }
}

export async function submitProblemReport(input: {
  orderNumber: string
  email: string
  kind: ProblemKind
  itemIds: string[]
  receivedAt?: string
  description: string
  phone?: string
  photoIds: string[]
}): Promise<ReportResult> {
  try {
    const answer = await sdk.client.fetch<{
      report_id?: string
      created_at?: string
      problem_reports?: GuestProblemReport[]
    }>("/store/guest-orders/problem", {
      method: "POST",
      body: {
        order_number: input.orderNumber.trim(),
        email: input.email.trim(),
        kind: input.kind,
        item_ids: input.itemIds,
        ...(input.receivedAt ? { received_at: input.receivedAt } : {}),
        description: input.description,
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        photo_ids: input.photoIds,
      },
      cache: "no-store",
    })
    return answer?.report_id
      ? {
          ok: true,
          reportId: answer.report_id,
          createdAt: answer.created_at ?? "",
          ...(Array.isArray(answer.problem_reports)
            ? { problemReports: answer.problem_reports }
            : {}),
        }
      : { ok: false, failure: "unavailable" }
  } catch (hiba) {
    return failed("A bejelentés elküldése nem sikerült:", hiba)
  }
}
