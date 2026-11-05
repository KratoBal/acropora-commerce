/**
 * THE WITHDRAWAL'S RULES (V0.3), PURE. The limits are only sanity bounds; nothing here decides who has the right, for
 * which goods or until when: that is the owner's and the lawyer's, and the OS side shows the declaration as it came.
 */
export const MAX_NAME = 200
export const MAX_ITEMS = 50

/** The name as stored: control characters dropped, runs of whitespace made one space, trimmed. */
export const cleanName = (value: string): string =>
  value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
