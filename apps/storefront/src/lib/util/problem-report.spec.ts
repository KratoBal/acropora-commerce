import { describe, expect, it } from "vitest"

import {
  MAX_PHOTO_BYTES,
  isAnimalKind,
  photoProblem,
  problemFailureKey,
  problemFailureOfStatus,
  problemFormErrors,
  receivedAtOf,
} from "./problem-report"

/*
  WHAT TURNS THIS RED (V1.2, the form's rules). A report with no item, no kind or no description leaving the
  browser; a malformed phone number accepted; a file over 5 MB (or one byte over) or a GIF / SVG accepted for upload;
  a lockout worded as "not found"; the live-animal note on a non-animal reason; a bad time sent.
*/
const ok = {
  kind: "item_damaged" as const,
  itemIds: ["i1"],
  description: "Törött",
  phone: "",
}

describe("problemFormErrors", () => {
  it("lets a complete form through, with or without a phone number", () => {
    expect(problemFormErrors(ok)).toEqual({})
    expect(problemFormErrors({ ...ok, phone: "+36 30 123 4567" })).toEqual({})
  })

  it("names each missing part", () => {
    expect(
      problemFormErrors({
        kind: "",
        itemIds: [],
        description: "  ",
        phone: "",
      }),
    ).toEqual({
      itemIds: "guestOrder.problem.errorItems",
      kind: "guestOrder.problem.errorKind",
      description: "guestOrder.problem.errorDescription",
    })
  })

  it("refuses a malformed phone number and an over-long description", () => {
    for (const phone of ["abc", "12", "+36 30 <b>", "1".repeat(31)])
      expect(problemFormErrors({ ...ok, phone }).phone, phone).toBe(
        "guestOrder.problem.errorPhone",
      )
    expect(
      problemFormErrors({ ...ok, description: "x".repeat(2001) }).description,
    ).toBe("guestOrder.problem.errorDescription")
    expect(problemFormErrors({ ...ok, description: "x".repeat(2000) })).toEqual(
      {},
    )
  })
})

describe("photoProblem", () => {
  const file = (name: string, type: string, size = 1000) => ({
    name,
    type,
    size,
  })

  it("accepts a JPEG and a PNG by type or by name", () => {
    expect(photoProblem(file("a.jpg", "image/jpeg"))).toBeNull()
    expect(photoProblem(file("a.PNG", "image/png"))).toBeNull()
    expect(photoProblem(file("kep.jpeg", ""))).toBeNull()
  })

  it("refuses everything else", () => {
    for (const bad of [
      file("a.gif", "image/gif"),
      file("a.svg", "image/svg+xml"),
      file("a.pdf", "application/pdf"),
      file("a", ""),
    ])
      expect(photoProblem(bad), bad.name).toBe(
        "guestOrder.problem.photoErrorType",
      )
  })

  it("the size limit is 5 MB: the limit itself passes, one byte more does not", () => {
    expect(
      photoProblem(file("a.jpg", "image/jpeg", MAX_PHOTO_BYTES)),
    ).toBeNull()
    expect(photoProblem(file("a.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1))).toBe(
      "guestOrder.problem.photoErrorSize",
    )
  })
})

describe("the small decisions", () => {
  it("the live animal note is for the two animal reasons only", () => {
    expect(isAnimalKind("animal_dead")).toBe(true)
    expect(isAnimalKind("animal_hurt")).toBe(true)
    for (const kind of ["item_damaged", "item_missing", "other", ""] as const)
      expect(isAnimalKind(kind)).toBe(false)
  })

  it("a failure has its own text, a lockout is never 'not found'", () => {
    expect(problemFailureOfStatus(404)).toBe("not_found")
    expect(problemFailureOfStatus(429)).toBe("too_many")
    expect(problemFailureOfStatus(400)).toBe("invalid")
    for (const status of [500, 503, undefined])
      expect(problemFailureOfStatus(status)).toBe("unavailable")
    expect(problemFailureKey("too_many")).toBe("guestOrder.errorTooMany")
    expect(problemFailureKey("not_found")).toBe("guestOrder.errorNotFound")
    expect(problemFailureKey("invalid")).toBe("guestOrder.problem.errorSend")
    expect(problemFailureKey("unavailable")).toBe(
      "guestOrder.problem.errorSend",
    )
  })

  it("the received time becomes an ISO time, an empty or bad one is left out", () => {
    expect(receivedAtOf("2026-11-03T10:00")).toMatch(
      /^2026-11-03T\d\d:00:00\.000Z$/,
    )
    expect(receivedAtOf("")).toBeUndefined()
    expect(receivedAtOf("tegnap")).toBeUndefined()
  })
})
