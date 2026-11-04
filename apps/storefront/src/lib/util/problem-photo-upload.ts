import {
  problemFailureOfStatus,
  type ProblemFailure,
} from "@lib/util/problem-report"

/**
 * A kép feltöltése a böngészőből, a KÜLÖN útra (`/api/problem-photo`), nem szerver-műveleten át: a szerver-műveletek
 * törzskorlátja így nem kell, hogy 8 MB legyen. Egy kép legfeljebb 5 MB, base64 szövegként kb. 7 MB, a JSON-kerettel
 * együtt a törzs legfeljebb ennyi (a backend a kép valódi méretét a saját szabályával úgyis megvizsgálja).
 */
export const PROBLEM_PHOTO_MAX_BODY_BYTES = 7_100_000

export type PhotoResult =
  { ok: true; photoId: string } | { ok: false; failure: ProblemFailure }

export async function uploadProblemPhoto(input: {
  orderNumber: string
  email: string
  content: string
}): Promise<PhotoResult> {
  try {
    const valasz = await fetch("/api/problem-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_number: input.orderNumber.trim(),
        email: input.email.trim(),
        content: input.content,
      }),
      cache: "no-store",
    })
    if (!valasz.ok) {
      // 413 (a törzs nagyobb a határnál) a vevő számára ugyanaz, mint egy el nem fogadott kép
      return {
        ok: false,
        failure:
          valasz.status === 413
            ? "invalid"
            : problemFailureOfStatus(valasz.status),
      }
    }
    const adat = (await valasz.json().catch(() => null)) as {
      photo_id?: unknown
    } | null
    return typeof adat?.photo_id === "string" && adat.photo_id
      ? { ok: true, photoId: adat.photo_id }
      : { ok: false, failure: "unavailable" }
  } catch {
    return { ok: false, failure: "unavailable" }
  }
}
