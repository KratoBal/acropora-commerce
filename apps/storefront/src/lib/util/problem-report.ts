import type { Key } from "@lib/i18n/dictionary"

/**
 * THE PROBLEM REPORT FORM'S RULES (V1.2, slice 3), PURE. The limits are TEMPORARY values for the test shop and
 * mirror the backend's (`workflows/utils/problem-report/rules.ts`); the owner fills in the real ones
 * ([KITÖLTENDŐ]): the deadline to report, whether a photo is compulsory (and when), the reply time.
 */
export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_DESCRIPTION = 2000

export const PROBLEM_KINDS = [
  "animal_dead",
  "animal_hurt",
  "item_damaged",
  "item_missing",
  "other",
] as const
export type ProblemKind = (typeof PROBLEM_KINDS)[number]

const KIND_KEY: Record<ProblemKind, Key> = {
  animal_dead: "guestOrder.problem.kindAnimalDead",
  animal_hurt: "guestOrder.problem.kindAnimalHurt",
  item_damaged: "guestOrder.problem.kindItemDamaged",
  item_missing: "guestOrder.problem.kindItemMissing",
  other: "guestOrder.problem.kindOther",
}
export const kindKey = (kind: ProblemKind): Key => KIND_KEY[kind]

/** The live animal note shows for the two animal reasons. */
export const isAnimalKind = (kind: ProblemKind | ""): boolean =>
  kind === "animal_dead" || kind === "animal_hurt"

export type ProblemFormInput = {
  kind: ProblemKind | ""
  itemIds: string[]
  description: string
  phone: string
}

export type ProblemFormErrors = {
  kind?: Key
  itemIds?: Key
  description?: Key
  phone?: Key
}

const PHONE = /^[0-9+()\-\s]{5,30}$/

/** The form's own checks, before anything leaves the browser. An empty object: send it. */
export const problemFormErrors = (
  input: ProblemFormInput,
): ProblemFormErrors => {
  const errors: ProblemFormErrors = {}
  if (input.itemIds.length === 0)
    errors.itemIds = "guestOrder.problem.errorItems"
  if (input.kind === "") errors.kind = "guestOrder.problem.errorKind"
  if (
    input.description.trim() === "" ||
    input.description.length > MAX_DESCRIPTION
  )
    errors.description = "guestOrder.problem.errorDescription"
  const phone = input.phone.trim()
  if (phone !== "" && !PHONE.test(phone))
    errors.phone = "guestOrder.problem.errorPhone"
  return errors
}

/** A picked file: JPEG or PNG by its name or type, at most 5 MB. The server decides again from the bytes. */
export const photoProblem = (file: {
  name: string
  type: string
  size: number
}): Key | null => {
  const typeOk =
    /^image\/(jpeg|png)$/i.test(file.type) || /\.(jpe?g|png)$/i.test(file.name)
  if (!typeOk) return "guestOrder.problem.photoErrorType"
  if (file.size > MAX_PHOTO_BYTES) return "guestOrder.problem.photoErrorSize"
  return null
}

export type ProblemFailure =
  "not_found" | "too_many" | "invalid" | "duplicate" | "unavailable"

export const problemFailureOfStatus = (
  status: number | undefined,
): ProblemFailure =>
  status === 404
    ? "not_found"
    : status === 429
      ? "too_many"
      : status === 400
        ? "invalid"
        : status === 409
          ? "duplicate"
          : "unavailable"

/** The text for each kind of failure: a lockout is not "not found", a problem already reported says so, all the rest tell the customer to retry. */
export const problemFailureKey = (failure: ProblemFailure): Key =>
  failure === "too_many"
    ? "guestOrder.errorTooMany"
    : failure === "not_found"
      ? "guestOrder.errorNotFound"
      : failure === "duplicate"
        ? "guestOrder.problem.errorDuplicate"
        : "guestOrder.problem.errorSend"

/** The local date-time field's value as the ISO time with the offset the backend asks for, or undefined. */
export const receivedAtOf = (value: string): string | undefined => {
  if (value.trim() === "") return undefined
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? undefined : at.toISOString()
}
