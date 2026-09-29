/**
 * The key under which the pricing hook hands the split-off pickup lines to
 * the shipping provider (P4-2). Prefixed, because Medusa spreads the cart over
 * the hook's result: a plain name could be overwritten by a cart field.
 */
export const SPLIT_LINE_IDS_CONTEXT_KEY = "acropora_split_line_ids"

/**
 * The lines a courier price is computed from: every line except those split
 * off into the pickup order. Balázs, 2026-09-29: the free-shipping threshold
 * counts the courier lines only.
 */
export const linesForCourierPrice = <T extends { id?: string | null }>(
  items: readonly T[],
  context: Record<string, unknown>
): T[] => {
  const split = context[SPLIT_LINE_IDS_CONTEXT_KEY]

  if (!Array.isArray(split) || !split.length) {
    return [...items]
  }

  const excluded = new Set(split)

  return items.filter((item) => !item.id || !excluded.has(item.id))
}
