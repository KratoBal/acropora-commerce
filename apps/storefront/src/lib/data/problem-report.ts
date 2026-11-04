"use server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import {
  problemFailureOfStatus,
  type ProblemFailure,
  type ProblemKind,
} from "@lib/util/problem-report"

/**
 * The problem report's two server actions (V1.2, slice 3): one photo at a time (base64 text, the backend reads
 * the bytes), then the report that names the photos by the ids the first call gave. NOTHING is cached, and the
 * customer's address and number are never logged: a failure writes only the status code.
 */
export type PhotoResult =
  { ok: true; photoId: string } | { ok: false; failure: ProblemFailure }
export type ReportResult =
  | { ok: true; reportId: string; createdAt: string }
  | { ok: false; failure: ProblemFailure }

const failed = (
  what: string,
  hiba: unknown,
): { ok: false; failure: ProblemFailure } => {
  const status = hibaAllapota(hiba)
  if (status !== 404) console.error(what, status ?? "(nincs állapotkód)")
  return { ok: false, failure: problemFailureOfStatus(status) }
}

export async function uploadProblemPhoto(input: {
  orderNumber: string
  email: string
  content: string
}): Promise<PhotoResult> {
  try {
    const answer = await sdk.client.fetch<{ photo_id?: string }>(
      "/store/guest-orders/problem-photos",
      {
        method: "POST",
        body: {
          order_number: input.orderNumber.trim(),
          email: input.email.trim(),
          content: input.content,
        },
        cache: "no-store",
      },
    )
    return answer?.photo_id
      ? { ok: true, photoId: answer.photo_id }
      : { ok: false, failure: "unavailable" }
  } catch (hiba) {
    return failed("A kép feltöltése nem sikerült:", hiba)
  }
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
        }
      : { ok: false, failure: "unavailable" }
  } catch (hiba) {
    return failed("A bejelentés elküldése nem sikerült:", hiba)
  }
}
