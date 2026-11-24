import { CUSTOMER_TEXT_CATALOG } from "./catalog.generated"

export { CUSTOMER_TEXT_CATALOG, CUSTOMER_TEXT_GROUPS } from "./catalog.generated"
export type { CustomerTextGroup } from "./catalog.generated"

export const CUSTOMER_TEXT_LOCALES = ["hu", "en"] as const
export type CustomerTextLocale = (typeof CUSTOMER_TEXT_LOCALES)[number]

/** Long enough for the longest dictionary text with room to grow; a pasted page is not a customer text. */
export const CUSTOMER_TEXT_MAX_LENGTH = 4000

const BY_KEY = new Map(CUSTOMER_TEXT_CATALOG.map((entry) => [entry.key, entry]))

export const customerTextEntry = (key: string) => BY_KEY.get(key) ?? null

/** The `{name}` slots of a text, sorted and distinct: what the storefront fills in (an order number, a reference). */
export const slotsOf = (text: string): string[] =>
  [...new Set(text.match(/\{[A-Za-z_][A-Za-z0-9_]*\}/g) ?? [])].sort()

/**
 * WHY A TEXT IS REFUSED, OR NULL. The key must be in the catalog (a key outside it is not a customer text the page offers), and
 * the text must keep exactly the slots of the dictionary text in that language: a dropped `{id}` would hide the customer's case
 * reference, an invented `{foo}` would show as itself.
 */
export function customerTextRefusal(
  key: string,
  locale: CustomerTextLocale,
  value: string
): string | null {
  const entry = customerTextEntry(key)
  if (!entry) return `Unknown customer text key: ${key}`
  const trimmed = value.trim()
  if (!trimmed) return "The text is empty; to go back to the default, remove the override."
  if (trimmed.length > CUSTOMER_TEXT_MAX_LENGTH)
    return `The text is longer than ${CUSTOMER_TEXT_MAX_LENGTH} characters.`
  const want = slotsOf(entry[locale])
  const got = slotsOf(trimmed)
  if (want.join() !== got.join())
    return `The text must keep the slots of the default (${want.join(", ") || "none"}), it has ${got.join(", ") || "none"}.`
  return null
}
