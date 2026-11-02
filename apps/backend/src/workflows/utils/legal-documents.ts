/**
 * THE LEGAL DOCUMENTS THE CHECKOUT NEEDS BEFORE IT TAKES AN ORDER (card
 * f6cb0a51, item 2; Balázs 2026-11-02 00:28 UTC: "the ÁSZF comes from
 * Fogyasztóbarát, in English too").
 *
 * The texts are not ours: Fogyasztóbarát keeps the ÁSZF and the privacy notice
 * and the shop shows them. So the gate does not read a text, it asks whether the
 * SOURCE of each required document is configured: terms and privacy, Hungarian
 * and English. Anything missing and the checkout refuses (aszf-guard.ts), with
 * one plain message, instead of taking an order under documents the customer
 * could not have been shown.
 *
 * === WHAT IS CONFIGURED, AND WHAT IS STILL OPEN ===
 *
 * - `FOGYASZTOBARAT_ENABLED` must be "true": with it off the shop shows the old
 *   shop's ÁSZF, which is not a Fogyasztóbarát document in either language.
 * - `FOGYASZTOBARAT_ID_HU`: the shop id of the Hungarian documents. Defaults to
 *   the shop's current id (the storefront's own default), and must equal the
 *   storefront's `NEXT_PUBLIC_FOGYASZTOBARAT_ID`.
 * - `FOGYASZTOBARAT_ID_EN`: the English source. No default, on purpose: how
 *   Fogyasztóbarát serves the English documents (the same id with another key or
 *   parameter, or a separate id) is not known yet, and its API answers only a
 *   registered domain's Referer, so it could not be measured. Empty means the
 *   checkout does not take an order. FILLING IT OPENS THE GATE, NOT THE ENGLISH
 *   RECORD: the record (aszf-record.ts) names the Hungarian document, and an
 *   English acceptance is refused (`language_unsupported`, checkAszfClaim) until
 *   the real shape is known. Taking the English record live needs more than this
 *   setting: `currentAszfRecord` and `checkAszfClaim` in aszf-record.ts, and the
 *   storefront's `ASZF_ELFOGADAS_NYELV` (aszf.ts), which today is a constant and
 *   must then come from the document actually shown.
 * === THE TEST MODE (Balázs 2026-11-02 10:05 UTC, via acrobot) ===
 *
 * Fogyasztóbarát answers only the registered domain (shop.acropora.hu), and he
 * will not pay for a second domain to try it on. So the test shop must take
 * orders without it, and the live shop must not.
 *
 * - `LEGAL_GATE_MODE`: "enforce" (the default; anything unset, empty, mistyped or
 *   not exactly "test" is enforce, so the gate fails closed) or "test".
 * - In test mode the orders pass without Fogyasztóbarát. The checkout shows a
 *   plain "test shop" line where the ÁSZF and the privacy notice would be (no
 *   text of ours), and the record on the cart, which the order carries, is
 *   marked: `verzio: "teszt-mod"`, `teszt_mod: true`.
 * - TEST MODE IS REFUSED ON THE LIVE SHOP. It needs `ACROPORA_STOREFRONT_URL`
 *   (the address the backend already uses for payment links) to be set and NOT
 *   a live host (`LIVE_STOREFRONT_HOSTS`). Unset or unreadable counts as "cannot
 *   show it is not live", so it is enforce. The refusal is logged
 *   (`logLegalGateMode`, at startup and on every resolution that is refused).
 *   It falls back to enforce rather than stopping the server: a misconfigured
 *   live shop stays up and takes no order.
 * - To go live: delete `LEGAL_GATE_MODE` (or set "enforce") and switch
 *   Fogyasztóbarát on (`FOGYASZTOBARAT_ENABLED`, `_ID_HU`, `_ID_EN`, and the
 *   storefront's `NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED`, `_ID`).
 */
export const LEGAL_GATE_MODES = ["enforce", "test"] as const
export type LegalGateMode = (typeof LEGAL_GATE_MODES)[number]

/** The version a test-mode acceptance names: the OS must know it (webshop-legal.ts). */
export const LEGAL_TEST_MODE_VERSION = "teszt-mod"

/** The addresses of the live shop; test mode is never allowed behind one. */
export const LIVE_STOREFRONT_HOSTS = ["shop.acropora.hu", "www.shop.acropora.hu", "acropora.hu", "www.acropora.hu"] as const
export const FOGYASZTOBARAT_DEFAULT_ID_HU = "JPNFMVH0"

/** `api.php` keys of the two required documents (storefront JOGI_DOKUMENTUMOK). */
export const LEGAL_DOCUMENT_KEYS = { aszf: "aszf", privacy: "at" } as const

const SHOP_ID = /^[A-Za-z0-9]{1,32}$/

export type LegalConfig = {
  enabled: boolean
  hu: string | null
  en: string | null
  /** The mode in force: "test" only when it was asked for AND the shop is provably not live. */
  mode: LegalGateMode
}

export type LegalEnv = Record<string, string | undefined>

const shopId = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed && SHOP_ID.test(trimmed) ? trimmed : null
}

export type LegalModeResolution = { mode: LegalGateMode; problem: string | null }

/** What `LEGAL_GATE_MODE` asks for and what is allowed; `problem` says why test was not granted. */
export const resolveLegalGateMode = (env: LegalEnv = process.env): LegalModeResolution => {
  const asked = env.LEGAL_GATE_MODE?.trim()
  if (!asked || asked === "enforce") return { mode: "enforce", problem: null }
  if (asked !== "test")
    return { mode: "enforce", problem: `LEGAL_GATE_MODE=${JSON.stringify(asked)} is not "enforce" or "test": enforce is in force.` }
  const url = env.ACROPORA_STOREFRONT_URL?.trim()
  let host: string | null = null
  try {
    host = url ? new URL(url).hostname.toLowerCase() : null
  } catch {
    host = null
  }
  if (!host)
    return {
      mode: "enforce",
      problem:
        "LEGAL_GATE_MODE=test needs ACROPORA_STOREFRONT_URL to show that this is not the live shop; it is unset or unreadable, so enforce is in force.",
    }
  if ((LIVE_STOREFRONT_HOSTS as readonly string[]).includes(host))
    return { mode: "enforce", problem: `LEGAL_GATE_MODE=test is refused: ${host} is the live shop, so enforce is in force.` }
  return { mode: "test", problem: null }
}

/** One line for the log: the mode in force, and loudly why test was not granted. */
export const logLegalGateMode = (env: LegalEnv = process.env, log: Pick<Console, "warn" | "error"> = console): LegalGateMode => {
  const { mode, problem } = resolveLegalGateMode(env)
  if (problem) log.error(`HIBA (jogi kapu): ${problem}`)
  else if (mode === "test") log.warn("jogi kapu: TESZT MOD, a rendelések Fogyasztóbarát nélkül átmennek (csak teszt kirakaton).")
  return mode
}

/** The configuration as it stands in the environment; a malformed id counts as not set. */
export const readLegalConfig = (env: LegalEnv = process.env): LegalConfig => ({
  enabled: env.FOGYASZTOBARAT_ENABLED?.trim() === "true",
  hu: env.FOGYASZTOBARAT_ID_HU === undefined ? FOGYASZTOBARAT_DEFAULT_ID_HU : shopId(env.FOGYASZTOBARAT_ID_HU),
  en: shopId(env.FOGYASZTOBARAT_ID_EN),
  mode: resolveLegalGateMode(env).mode,
})

export type LegalReadiness = { complete: true } | { complete: false; missing: string[] }

/** What is missing, by name, so a refusal in the log says which setting to look at. */
export const legalReadiness = (config: LegalConfig = readLegalConfig()): LegalReadiness => {
  // test mode (only ever granted off the live shop: resolveLegalGateMode) takes orders without Fogyasztóbarát
  if (config.mode === "test") return { complete: true }
  const missing: string[] = []
  if (!config.enabled) missing.push("FOGYASZTOBARAT_ENABLED")
  if (!config.hu) missing.push("FOGYASZTOBARAT_ID_HU")
  if (!config.en) missing.push("FOGYASZTOBARAT_ID_EN")
  return missing.length === 0 ? { complete: true } : { complete: false, missing }
}

/**
 * The code the storefront matches to show its own sentence (the same way it
 * matches `split_discount_changed`): the Medusa SDK hands over only the message.
 */
export const LEGAL_NOT_READY_CODE = "legal_documents_missing"

/** The refusal: the code, then a sentence for a reader who sees it as it is (Hungarian first, English after). */
export const LEGAL_NOT_READY =
  LEGAL_NOT_READY_CODE +
  ": A rendelés jelenleg nem adható le: az ÁSZF és az adatkezelési tájékoztató még nincs közzétéve. " +
  "Orders cannot be placed right now: the terms and the privacy notice are not published yet."

/** A document's source at Fogyasztóbarát. */
export const legalSource = (key: string, id: string) =>
  `https://admin.fogyasztobarat.hu/api.php?${encodeURIComponent(key)}=${encodeURIComponent(id)}`
