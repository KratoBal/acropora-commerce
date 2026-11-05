/**
 * WHAT KIND OF LIVE ANIMAL A PRODUCT IS (V2.6, card f4e4832b).
 *
 * The OS derives it from the product's root category (Korallok, Halak,
 * Gerinctelenek: `medusa-livestock.policy.ts` there, the same three roots that
 * make a product pickup-only) and writes it here with the other shipping
 * attributes. The shop never derives it from a name or a title: it only
 * carries what the OS sent, and it is null for everything that is not a live
 * animal, and for every row the OS has not written yet.
 *
 * It exists for one reader today: the order confirmation, whose acclimatisation
 * section differs by kind (a fish is not drip-acclimated like a coral is lit).
 * It is NOT a shipping rule: `pickup_only` stays the only flag that decides
 * how a live animal travels.
 */
export const LIVESTOCK_KINDS = ["FISH", "INVERTEBRATE", "CORAL"] as const

export type LivestockKind = (typeof LIVESTOCK_KINDS)[number]

export const isLivestockKind = (value: unknown): value is LivestockKind =>
  typeof value === "string" && (LIVESTOCK_KINDS as readonly string[]).includes(value)

/**
 * The distinct kinds in a list of raw column values, in the fixed order of
 * `LIVESTOCK_KINDS` (so the same order always gives the same mail). Anything
 * that is not a known kind is dropped, not guessed at.
 */
export const distinctLivestockKinds = (values: readonly unknown[]): LivestockKind[] => {
  const present = new Set(values.filter(isLivestockKind))
  return LIVESTOCK_KINDS.filter((kind) => present.has(kind))
}
