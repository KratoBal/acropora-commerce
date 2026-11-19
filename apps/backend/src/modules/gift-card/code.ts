import { createHash, randomInt } from "node:crypto"

/**
 * A GIFT CARD CODE (card 495c0007): 16 characters of Crockford base32 (no I, L, O, U), so 80 random bits, printed
 * in four groups ("7K3M-QX9P-2ZRT-H4BW"). Typed back, it is forgiving the way the alphabet allows: case, spaces and
 * dashes do not matter, and O reads as 0, I and L as 1.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const LENGTH = 16

export function newGiftCardCode(): string {
  let code = ""
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return code.match(/.{4}/g)!.join("-")
}

/** The code as stored and compared, or null when it cannot be one. */
export function normalizeGiftCardCode(input: string): string | null {
  const plain = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
  if (plain.length !== LENGTH) return null
  for (const char of plain) if (!ALPHABET.includes(char)) return null
  return plain
}

/** What is kept of a code: its SHA-256, hex. */
export function giftCardCodeHash(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex")
}
