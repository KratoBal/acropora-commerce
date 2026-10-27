import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * THE PASSWORD NEEDS TEN CHARACTERS (audit P1/8, B9). Before this a one-character
 * password was accepted at sign-up and at a change (the earlier "no length rule"
 * decision, acrobot 2026-09-29, is replaced by the audit's: Balázs, 2026-10-27).
 *
 * Counted in characters, not bytes (`[...text]`), so an accented letter is one.
 * Only a NEW password is checked: signing in with an old short one still works,
 * so nobody is locked out by this; they meet the rule when they change it.
 *
 * Kept equal to the storefront's `JELSZO_MIN_HOSSZ` (`lib/util/jelszo.ts`); the
 * backend is the one that holds, the storefront's check only gives the
 * customer a Hungarian sentence before the call.
 */
export const PASSWORD_MIN_LENGTH = 10

export const passwordLongEnough = (value: unknown): boolean =>
  typeof value === "string" && [...value].length >= PASSWORD_MIN_LENGTH

export const PASSWORD_TOO_SHORT = {
  type: "invalid_data",
  message: `The password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
} as const

/**
 * Before Medusa's sign-up (`/auth/customer/emailpass/register`) and the
 * single-use-token reset (`/auth/customer/emailpass/update`): a body whose
 * `password` is missing or short is refused. A missing one is left to Medusa's
 * own validation, so only a PRESENT short value is answered here.
 */
export const requireLongPassword = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const password = (req.body as { password?: unknown } | undefined)?.password
  if (password === undefined || password === null || passwordLongEnough(password)) {
    next()
    return
  }
  res.status(400).json(PASSWORD_TOO_SHORT)
}
