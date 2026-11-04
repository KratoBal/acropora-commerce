import { PROBLEM_KINDS, type ProblemKind } from "../../../modules/order-problem-report/types"

/**
 * THE PROBLEM REPORT'S RULES (V1.2), PURE. The limits are TEMPORARY values, marked [KITÖLTENDŐ] for the owner
 * (acrobot, 2026-11-04: 5 pictures, 5 MB): the deadline to report, whether a photo is compulsory (and when), and
 * the reply time are the owner's and the lawyer's, and nothing here decides them.
 *
 * WHAT A PHOTO IS. It is read from its first bytes, not from the type the browser names: a JPEG or a PNG, and
 * nothing else (no SVG, no HTML, nothing a browser could run), at most `MAX_PHOTO_BYTES`.
 */
export const MAX_PHOTOS = 5 // [KITÖLTENDŐ]
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // [KITÖLTENDŐ]
export const MAX_DESCRIPTION = 2000
export const MAX_ITEMS = 50

export const isProblemKind = (value: unknown): value is ProblemKind =>
  typeof value === "string" && (PROBLEM_KINDS as readonly string[]).includes(value)

export type PhotoType = { ext: "jpg" | "png"; mime: "image/jpeg" | "image/png" }

/** The image type by the file's first bytes, or null. */
export const sniffImage = (bytes: Uint8Array): PhotoType | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { ext: "jpg", mime: "image/jpeg" }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= png.length && png.every((byte, index) => bytes[index] === byte))
    return { ext: "png", mime: "image/png" }
  return null
}

export type DecodedPhoto =
  | { ok: true; bytes: Buffer; type: PhotoType }
  | { ok: false; reason: "not_base64" | "empty" | "too_large" | "not_an_image" }

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

/** A photo sent as base64 text (no data: prefix): strict alphabet, size and type decided on the decoded bytes. */
export const decodePhoto = (content: string): DecodedPhoto => {
  const text = content.trim()
  if (text === "") return { ok: false, reason: "empty" }
  if (!BASE64.test(text) || text.length % 4 !== 0) return { ok: false, reason: "not_base64" }
  // the decoded size is known from the text before anything is allocated
  const padding = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0
  if ((text.length / 4) * 3 - padding > MAX_PHOTO_BYTES) return { ok: false, reason: "too_large" }
  const bytes = Buffer.from(text, "base64")
  if (bytes.length === 0) return { ok: false, reason: "empty" }
  const type = sniffImage(bytes)
  return type ? { ok: true, bytes, type } : { ok: false, reason: "not_an_image" }
}

/** A phone number as the customer typed it, cleaned: digits, plus, spaces, dashes, parentheses; null when empty. */
export const cleanPhone = (value: string | null | undefined): string | null => {
  const text = (value ?? "").trim()
  return text === "" ? null : text
}

export const PHONE_PATTERN = /^[0-9+()\-\s]{5,30}$/

/** The description as stored: control characters (except line breaks) dropped, trimmed. */
export const cleanDescription = (value: string): string =>
  value
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
